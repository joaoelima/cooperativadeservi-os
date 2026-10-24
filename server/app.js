import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword, parseCredentials, newToken, sessionDigest } from './security.js';

const publicUser = user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role });
export function createApp({ store, origin, production = false, serveFrontend = true, dummyHash }) {
  const app = express();
  const cookieName = production ? '__Host-coopserve' : 'coopserve';
  const lifetime = 8 * 60 * 60 * 1000;
  if (production) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: { directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'], connectSrc: ["'self'"],
      objectSrc: ["'none'"], frameAncestors: ["'none'"], formAction: ["'self'"],
    } },
    ...(production ? {} : { strictTransportSecurity: false }),
  }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  // Reject cross-origin writes before parsing or changing any state. No CORS wildcard.
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin') !== origin) {
      return res.status(403).json({ error: 'Origem da requisição não permitida.' });
    }
    next();
  });
  app.use('/api', express.json({ limit: '16kb', strict: true }));
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' },
  });
  app.use('/api/auth/login', limiter);
  app.use('/api/auth/register', limiter);
  function tokenFrom(req) {
    const raw = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='));
    const token = raw?.slice(cookieName.length + 1);
    return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'lax', path: '/' };
  async function startSession(res, user) {
    const token = newToken();
    await store.createSession({ tokenHash: sessionDigest(token), userId: String(user._id), expiresAt: new Date(Date.now() + lifetime), createdAt: new Date() });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime });
  }
  async function requireUser(req, res, next) {
    const token = tokenFrom(req);
    const session = token && await store.findSession(sessionDigest(token));
    const user = session && await store.findUserById(session.userId);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta para continuar.' });
    req.user = user;
    next();
  }
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', async (req, res) => {
    const data = parseCredentials(req.body, true);
    if (!data) return res.status(400).json({ error: 'Informe nome, e-mail válido e uma senha de 15 a 128 caracteres.' });
    const passwordHash = await hashPassword(data.password);
    const user = await store.createUser({ name: data.name, email: data.email, passwordHash, role: 'client', createdAt: new Date() });
    if (!user) return res.status(409).json({ error: 'Não foi possível cadastrar com esses dados. Se já possui uma conta, tente entrar.' });
    // Never accept role/permissions supplied by the browser.
    await startSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post('/api/auth/login', async (req, res) => {
    const data = parseCredentials(req.body);
    if (!data) return res.status(400).json({ error: 'Informe e-mail e senha válidos.' });
    const user = await store.findUserByEmail(data.email);
    const valid = await verifyPassword(data.password, user?.passwordHash || dummyHash);
    if (!user || !valid) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    // Revoke the existing browser session before issuing a fresh identifier.
    const previous = tokenFrom(req);
    if (previous) await store.deleteSession(sessionDigest(previous));
    await startSession(res, user);
    res.json({ user: publicUser(user) });
  });
  app.get('/api/auth/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));
  app.post('/api/auth/logout', async (req, res) => {
    const token = tokenFrom(req);
    if (token) await store.deleteSession(sessionDigest(token));
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });
  // Server-side authorization, ready for central-only endpoints.
  app.get('/api/admin/access', requireUser, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito à central CoopServe.' });
    res.json({ allowed: true });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }));
  if (serveFrontend) {
    const dist = fileURLToPath(new URL('../dist/', import.meta.url));
    app.use(express.static(dist));
    app.get('/{*page}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error.code === 'AUTH_BUSY') return res.status(503).json({ error: 'Serviço ocupado. Tente novamente em alguns instantes.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição muito grande.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Dados inválidos.' });
    console.error('API request failed', { name: error.name, code: error.code });
    res.status(500).json({ error: 'Não foi possível concluir agora. Tente novamente.' });
  });
  return app;
}
