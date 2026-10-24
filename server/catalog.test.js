import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.js';
import { initialCatalog, activeCatalog, validateCatalog } from './catalog.js';
import { parsePhotos } from './photos.js';
import { newToken, sessionDigest } from './security.js';

test('catálogo dinâmico, conflito de edição, desativação e privacidade das fotos',async t=>{
 let state={revision:1,categories:initialCatalog()};
 const users={client:{_id:'c',name:'Cliente',email:'c@example.com',role:'client'},admin:{_id:'a',name:'Central',email:'a@example.com',role:'admin'},other:{_id:'o',name:'Outro',email:'o@example.com',role:'client'}};
 const sessions=new Map(),cookies={};
 for(const [key,user]of Object.entries(users)){const token=newToken();sessions.set(sessionDigest(token),{userId:user._id,expiresAt:new Date(Date.now()+100000)});cookies[key]='__Host-coopserve='+token;}
 const store={
  findSession:async key=>sessions.get(key),findUserById:async id=>Object.values(users).find(u=>u._id===id),
  activeCatalog:async()=>activeCatalog(state.categories),getCatalog:async()=>structuredClone(state),
  saveCatalog:async(revision,categories)=>{if(revision!==state.revision)return null;state={revision:revision+1,categories};return structuredClone(state);},
  findPhoto:async(id,photoId,owner)=>id==='1'&&photoId==='photo'&&(!owner||owner==='c')?{data:Buffer.from('photo-bytes'),mime:'image/jpeg'}:null,
 };
 const app=createApp({store,origin:'https://coopserve.example',production:true,serveFrontend:false});
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 const req=(path,key,body)=>fetch('http://127.0.0.1:'+server.address().port+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://coopserve.example','Content-Type':'application/json',...(key?{Cookie:cookies[key]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 assert.equal((await req('/api/catalog')).status,200);
 assert.equal((await req('/api/admin/catalog','client')).status,403);
 assert.equal((await req('/api/admin/catalog','client',state)).status,403);
 const old=structuredClone(state);old.categories.find(c=>c.name==='Elétrica').services[0].active=false;
 assert.equal((await req('/api/admin/catalog','admin',old)).status,200);
 assert.equal((await req('/api/admin/catalog','admin',old)).status,409);
 const payload={category:'Elétrica',service:'Instalação elétrica',description:'Instalar tomadas para teste.',address:'Endereço fictício para teste, 100'};
 assert.equal((await req('/api/orders','client',payload)).status,400);
 const duplicate=initialCatalog();duplicate[1].name=duplicate[0].name;assert.equal(validateCatalog(duplicate),null);
 assert.equal(validateCatalog([{id:'bad.id',name:'Teste',active:true,services:[]}]),null);
 assert.equal(parsePhotos([{data:'<svg>not allowed</svg>'}]),null);
 assert.equal(parsePhotos([{}, {}, {}, {}]),null);
 const image=Buffer.from([255,216,255,192,0,8,8,0,1,0,1,1,255,217]);
 assert.equal(parsePhotos([{data:image.toString('base64')}]).length,1);
 const huge=Buffer.from(image);huge[7]=255;huge[8]=255;assert.equal(parsePhotos([{data:huge.toString('base64')}]),null);
 assert.equal((await req('/api/orders/1/photos/photo')).status,401);
 assert.equal((await req('/api/orders/1/photos/photo','other')).status,404);
 const photo=await req('/api/orders/1/photos/photo','client');assert.equal(photo.status,200);assert.ok(photo.headers.get('content-type').includes('image/jpeg'));assert.equal(photo.headers.get('cache-control'),'no-store');
 assert.equal((await req('/api/orders/1/photos/photo','admin')).status,200);
});
