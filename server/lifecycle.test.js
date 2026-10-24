import { catalog } from '../shared/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.js';
import { newToken, sessionDigest } from './security.js';
import { validQuote } from './lifecycle.js';

test('fluxo completo, decisões concorrentes, orçamento revisado e avaliação única',async t=>{
 const users=new Map([['client',{_id:'client',name:'Cliente',email:'c@example.com',role:'client'}],['other',{_id:'other',name:'Outro',email:'o@example.com',role:'client'}],['admin',{_id:'admin',name:'Central',email:'a@example.com',role:'admin'}]]);
 const sessions=new Map(),orders=new Map();
 const cookies=Object.fromEntries([...users.keys()].map(id=>{const token=newToken();sessions.set(sessionDigest(token),{userId:id,expiresAt:new Date(Date.now()+100000)});return[id,'__Host-coopserve='+token];}));
 const store={
  activeCatalog:async()=>catalog,
  findSession:async hash=>sessions.get(hash),findUserById:async id=>users.get(id),
  createOrder:async order=>{const result={...order,_id:String(orders.size+1)};orders.set(result._id,result);return result;},
  findOrder:async(id,owner)=>{const order=orders.get(id);return order?.customerId===owner?order:null;},
  listOrders:async({customerId,status})=>[...orders.values()].filter(o=>(!customerId||o.customerId===customerId)&&(!status||o.status===status)),
  countOrders:async()=>orders.size,
  transitionOrder:async(id,guards,fields,event)=>{
   const order=orders.get(id);
   if(!order||!guards.statuses.includes(order.status)||(guards.customerId&&guards.customerId!==order.customerId)||(guards.quoteId&&guards.quoteId!==order.quote?.id)||(guards.noReview&&order.review)||(guards.hasReview&&!order.review)||(guards.noReply&&order.review?.reply))return null;
   for(const[key,value]of Object.entries(fields)){if(key==='review.reply')order.review.reply=value;else order[key]=value;}
   order.updatedAt=new Date();order.history.push(event);return structuredClone(order);
  },
  updateProfile:async(id,fields)=>{Object.assign(users.get(id),fields);return users.get(id);},
  markNotificationsRead:async(id,at)=>{users.get(id).notificationsReadAt=at;},
 };
 const app=createApp({store,origin:'https://coopserve.example',production:true,serveFrontend:false});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const req=(path,user,body)=>fetch('http://127.0.0.1:'+server.address().port+path,{method:body===undefined?'GET':'POST',headers:{Cookie:cookies[user],Origin:'https://coopserve.example','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const payload={category:'Elétrica',service:'Instalação elétrica',description:'Solicitação de teste para tomadas.',address:'Endereço fictício para testes, 100'};
 const make=async()=>{const r=await req('/api/orders','client',payload);assert.equal(r.status,201);const o=(await r.json()).order;orders.get(o.id).status='in_review';return o.id;};
 const id=await make();
 const quote={amountCents:12345,description:'Instalação de duas tomadas com material básico.',estimatedDuration:'Até duas horas',conditions:'Confirmar acesso ao imóvel.'};
 assert.equal(validQuote({...quote,amountCents:1.5}),null);assert.equal(validQuote({...quote,amountCents:Infinity}),null);
 assert.equal((await req('/api/admin/orders/'+id+'/quote','client',quote)).status,403);
 assert.equal((await req('/api/admin/orders/'+id+'/schedule','admin',{at:new Date(Date.now()+86400000).toISOString(),professional:'Profissional teste'})).status,409);
 let r=await req('/api/admin/orders/'+id+'/quote','admin',quote);assert.equal(r.status,200);const proposed=(await r.json()).order;
 assert.equal(proposed.quote.amountCents,12345);
 assert.equal((await req('/api/orders/'+id+'/decision','other',{decision:'approve',quoteId:proposed.quote.id})).status,404);
 assert.equal((await req('/api/orders/'+id+'/decision','client',{decision:'approve',quoteId:'stale'})).status,409);
 const results=await Promise.all([req('/api/orders/'+id+'/decision','client',{decision:'approve',quoteId:proposed.quote.id}),req('/api/orders/'+id+'/decision','client',{decision:'approve',quoteId:proposed.quote.id})]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal((await req('/api/orders/'+id+'/review','client',{rating:5})).status,409);
 assert.equal((await req('/api/admin/orders/'+id+'/complete','admin',{})).status,409);
 assert.equal((await req('/api/admin/orders/'+id+'/quote','admin',quote)).status,409);
 assert.equal((await req('/api/admin/orders/'+id+'/schedule','admin',{at:'invalid',professional:'Profissional'})).status,400);
 assert.equal((await req('/api/admin/orders/'+id+'/schedule','admin',{at:new Date(Date.now()+86400000).toISOString(),professional:'Profissional teste'})).status,200);
 assert.equal((await req('/api/admin/orders/'+id+'/start','client',{})).status,403);
 assert.equal((await req('/api/admin/orders/'+id+'/start','admin',{})).status,200);
 assert.equal((await req('/api/admin/orders/'+id+'/complete','admin',{})).status,200);
 assert.equal((await req('/api/orders/'+id+'/review','client',{rating:0})).status,400);
 assert.equal((await req('/api/orders/'+id+'/review','other',{rating:5})).status,404);
 assert.equal((await req('/api/orders/'+id+'/review','client',{rating:5,comment:'Atendimento de teste concluído.'})).status,200);
 assert.equal((await req('/api/orders/'+id+'/review','client',{rating:1})).status,409);
 assert.equal((await req('/api/admin/orders/'+id+'/reply','admin',{reply:'Obrigado pela avaliação.'})).status,200);
 assert.equal((await req('/api/admin/orders/'+id+'/reply','admin',{reply:'Duplicada'})).status,409);
 const rejected=await make();r=await req('/api/admin/orders/'+rejected+'/quote','admin',quote);const first=(await r.json()).order.quote.id;
 assert.equal((await req('/api/orders/'+rejected+'/decision','client',{decision:'reject',quoteId:first})).status,200);
 assert.equal((await req('/api/admin/orders/'+rejected+'/schedule','admin',{at:new Date(Date.now()+86400000).toISOString(),professional:'Profissional teste'})).status,409);
 r=await req('/api/admin/orders/'+rejected+'/quote','admin',{...quote,amountCents:10000});const second=(await r.json()).order.quote.id;assert.notEqual(first,second);
 assert.equal((await req('/api/orders/'+rejected+'/decision','client',{decision:'approve',quoteId:first})).status,409);
 const third=await make();assert.equal((await req('/api/orders/'+third+'/cancel','client',{})).status,200);
 assert.equal((await req('/api/admin/orders/'+third+'/quote','admin',quote)).status,409);
 r=await req('/api/profile','client',{name:'Novo Nome',phone:'(41) 99999-9999',address:'Endereço de testes',role:'admin',email:'evil@example.com'});
 assert.equal(r.status,200);const updated=(await r.json()).user;assert.equal(updated.role,'client');assert.equal(updated.email,'c@example.com');
 assert.equal((await req('/api/profile','client',{name:'X',phone:{},address:[]})).status,400);
 const notifications=await(await req('/api/notifications','client')).json();assert.ok(notifications.notifications.some(n=>n.message==='Novo orçamento disponível'));
 assert.equal((await(await req('/api/notifications','other')).json()).notifications.length,0);
 assert.equal((await req('/api/notifications/read','client',{through:notifications.generatedAt})).status,200);
});
