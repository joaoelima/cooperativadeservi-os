import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.js';
import { hashPassword, newToken, sessionDigest } from './security.js';
import { validateOrder } from './orders.js';

test('pedidos isolados por cliente, painel exclusivo, análise e troca de senha', async t => {
  const original = 'minha primeira senha segura';
  const client = { _id: 'client-a', name: 'Cliente A', email: 'client@example.com', role: 'client', passwordHash: await hashPassword(original) };
  const other = { _id: 'client-b', name: 'Cliente B', email: 'other@example.com', role: 'client', passwordHash: client.passwordHash };
  const admin = { _id: 'admin', name: 'Central', email: 'admin@example.com', role: 'admin', passwordHash: client.passwordHash };
  const users = new Map([client, other, admin].map(user => [user._id, user]));
  const sessions = new Map(), orders = new Map();
  function cookieFor(user) {
    const token = newToken();
    sessions.set(sessionDigest(token), { userId: user._id, version: user.passwordVersion || 0, expiresAt: new Date(Date.now()+100000) });
    return '__Host-coopserve='+token;
  }
  const a = cookieFor(client), b = cookieFor(other), central = cookieFor(admin), secondAdminSession = cookieFor(admin);
  const store = {
    findSession: async hash => sessions.get(hash),
    findUserById: async id => users.get(id),
    findUserByEmail: async email => [...users.values()].find(user=>user.email===email),
    deleteSession: async hash => sessions.delete(hash),
    createSession: async session => sessions.set(session.tokenHash, session),
    deleteUserSessions: async id => { for(const [key, value] of sessions)if(value.userId===id)sessions.delete(key); },
    changePassword: async (id, previous, next) => {
      const user = users.get(id); if(user.passwordHash!==previous)return false;
      user.passwordHash=next; user.passwordVersion=(user.passwordVersion||0)+1; return true;
    },
    createOrder: async order => { const saved={...order,_id:String(orders.size+1)}; orders.set(saved._id,saved);return saved; },
    findOrder: async (id, customerId) => { const order=orders.get(id);return order?.customerId===customerId?order:null; },
    listOrders: async ({customerId,status,page=1,limit=100}) => [...orders.values()].filter(order=>(!customerId||order.customerId===customerId)&&(!status||order.status===status)).slice((page-1)*limit,page*limit),
    countOrders: async ({status}) => [...orders.values()].filter(order=>!status||order.status===status).length,
    beginReview: async (id,actorId) => { const order=orders.get(id);if(order?.status!=='received')return null;order.status='in_review';order.history.push({status:'in_review',at:new Date(),actorId});return order; },
  };
  const app=createApp({store,origin:'https://coopserve.example',production:true,serveFrontend:false,dummyHash:client.passwordHash});
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const request=(route,{cookie,body,origin='https://coopserve.example'}={})=>fetch('http://127.0.0.1:'+server.address().port+route,{
    method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const payload={category:'Elétrica',service:'Instalação elétrica',description:'Instalar duas tomadas na cozinha.',address:'Rua de Teste, número 100',preferredDate:''};
  assert.equal(validateOrder({...payload,category:'__proto__'}),null);
  assert.equal(validateOrder({...payload,preferredDate:'2026-02-30'}),null);
  assert.equal((await request('/api/admin/orders')).status,401);
  assert.equal((await request('/api/admin/orders',{cookie:a})).status,403);
  assert.equal((await request('/api/orders',{body:payload})).status,401);
  assert.equal((await request('/api/orders',{cookie:a,body:{...payload,service:'serviço inventado'}})).status,400);
  assert.equal((await request('/api/orders',{cookie:a,body:payload,origin:'https://evil.example'})).status,403);
  let response=await request('/api/orders',{cookie:a,body:{...payload,customerId:other._id,status:'scheduled'}});
  assert.equal(response.status,201);const created=(await response.json()).order;
  assert.equal(created.status,'received');assert.equal(created.customer.email,client.email);
  assert.equal((await request('/api/orders/'+created.id,{cookie:b})).status,404);
  assert.equal((await (await request('/api/orders',{cookie:b})).json()).orders.length,0);
  assert.equal((await (await request('/api/orders',{cookie:a})).json()).orders.length,1);
  response=await request('/api/admin/orders',{cookie:central});
  const list=await response.json();assert.equal(list.total,1);assert.equal(list.orders[0].id,created.id);
  assert.equal((await request('/api/admin/orders?status=scheduled',{cookie:central})).status,400);
  assert.equal((await request('/api/admin/orders?page=-1',{cookie:central})).status,400);
  assert.equal((await request('/api/admin/orders/'+created.id+'/review',{cookie:a,body:{}})).status,403);
  response=await request('/api/admin/orders/'+created.id+'/review',{cookie:central,body:{}});
  assert.equal(response.status,200);assert.equal((await response.json()).order.status,'in_review');
  assert.equal((await request('/api/admin/orders/'+created.id+'/review',{cookie:central,body:{}})).status,409);
  assert.equal((await (await request('/api/orders/'+created.id,{cookie:a})).json()).order.history.length,2);
  assert.equal((await request('/api/auth/password',{cookie:central,body:{currentPassword:'errada',newPassword:'uma nova senha muito segura'}})).status,401);
  assert.equal((await request('/api/auth/password',{cookie:central,body:{currentPassword:original,newPassword:'curta'}})).status,400);
  assert.equal((await request('/api/auth/password',{cookie:central,body:{currentPassword:original,newPassword:'uma nova senha muito segura'},origin:'https://evil.example'})).status,403);
  assert.equal((await request('/api/auth/password',{cookie:central,body:{currentPassword:original,newPassword:'uma nova senha muito segura'}})).status,200);
  assert.equal((await request('/api/auth/me',{cookie:central})).status,401);
  assert.equal((await request('/api/auth/me',{cookie:secondAdminSession})).status,401);
  assert.equal((await request('/api/auth/login',{body:{email:admin.email,password:original}})).status,401);
  assert.equal((await request('/api/auth/login',{body:{email:admin.email,password:'uma nova senha muito segura'}})).status,200);
});
