import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.js';
import { hashPassword, verifyPassword, parseCredentials, sessionDigest } from './security.js';

test('senhas usam sal aleatório e hash; validação rejeita operadores MongoDB', async () => {
  const password = 'uma frase secreta de teste';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('incorreta', first), false);
  assert.equal(parseCredentials({ email: { $ne: null }, password }), null);
  assert.equal(parseCredentials({ name: 'João', email: 'a@b.com', password: 'curta' }, true), null);
});

test('cadastro, sessão, autorização, expiração, rotação, origem e logout', async t => {
  const users = new Map();
  const sessions = new Map();
  let sequence = 0;
  const store = {
    findUserByEmail: async email => [...users.values()].find(user => user.email === email),
    findUserById: async id => users.get(id),
    createUser: async user => {
      if ([...users.values()].some(existing => existing.email === user.email)) return null;
      const created = { ...user, _id: String(++sequence) };
      users.set(created._id, created);
      return created;
    },
    createSession: async session => sessions.set(session.tokenHash, session),
    findSession: async hash => {
      const session = sessions.get(hash);
      return session?.expiresAt > new Date() ? session : null;
    },
    deleteSession: async hash => sessions.delete(hash),
  };
  const app = createApp({ store, origin: 'https://coopserve.example', production: true, serveFrontend: false, dummyHash: await hashPassword('dummy password never used') });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const root = 'http://127.0.0.1:' + server.address().port;
  const request = (route, { body, cookie, origin = 'https://coopserve.example', method = body === undefined ? 'GET' : 'POST' } = {}) => fetch(root + route, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const account = { name: 'Maria Teste', email: ' MARIA@EXAMPLE.COM ', password: 'uma frase secreta de teste', role: 'admin' };
  let response = await request('/api/auth/register', { body: account, origin: 'https://evil.example' });
  assert.equal(response.status, 403);
  assert.equal(users.size, 0);
  response = await request('/api/auth/register', { body: account });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const setCookie = response.headers.get('set-cookie');
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) assert.ok(setCookie.includes(flag));
  let cookie = setCookie.split(';')[0];
  const created = await response.json();
  assert.equal(created.user.role, 'client');
  assert.equal(created.user.email, 'maria@example.com');
  assert.equal(created.user.passwordHash, undefined);
  assert.ok(![...users.values()][0].passwordHash.includes(account.password));
  assert.ok(![...sessions.keys()].includes(cookie.split('=')[1]));
  assert.equal((await request('/api/auth/me')).status, 401);
  response = await request('/api/auth/me', { cookie });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, created.user.id);
  assert.equal((await request('/api/admin/access', { cookie })).status, 403);
  assert.equal((await request('/api/auth/register', { body: account })).status, 409);
  assert.equal((await request('/api/auth/login', { body: { ...account, password: 'senha errada' } })).status, 401);
  response = await request('/api/auth/login', { body: account, cookie });
  assert.equal(response.status, 200);
  const oldCookie = cookie;
  cookie = response.headers.get('set-cookie').split(';')[0];
  assert.notEqual(cookie, oldCookie);
  assert.equal((await request('/api/auth/me', { cookie: oldCookie })).status, 401);
  assert.equal((await request('/api/auth/logout', { body: {}, cookie, origin: '' })).status, 403);
  assert.equal((await request('/api/auth/me', { cookie })).status, 200);
  assert.equal((await request('/api/auth/logout', { body: {}, cookie })).status, 204);
  assert.equal((await request('/api/auth/me', { cookie })).status, 401);
  response = await request('/api/auth/login', { body: account });
  cookie = response.headers.get('set-cookie').split(';')[0];
  const hash = sessionDigest(cookie.split('=')[1]);
  sessions.get(hash).expiresAt = new Date(Date.now() - 1);
  assert.equal((await request('/api/auth/me', { cookie })).status, 401);
  for (let attempt = 0; attempt < 21; attempt++) response = await request('/api/auth/login', { body: {} });
  assert.equal(response.status, 429);
});
