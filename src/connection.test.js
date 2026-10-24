import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForApi} from './connection.js';
const response=(status,body,type='application/json')=>new Response(body,{status,headers:{'Content-Type':type}});
test('readiness ignores Render HTML and temporary failures, retries GET then accepts health JSON',async()=>{
  const calls=[];const responses=[()=>response(200,'<html>Loading</html>','text/html'),()=>{throw new Error('network')},()=>response(200,'{"status":"ok"}')];
  await waitForApi({fetchImpl:async(url,options)=>{calls.push({url,options});return responses.shift()();},budgetMs:200,delayMs:1});
  assert.equal(calls.length,3);assert.ok(calls.every(x=>x.url==='/api/health'&&!x.options.body&&x.options.credentials==='omit'));
});
test('readiness stops on timeout and abort',async()=>{
  await assert.rejects(waitForApi({fetchImpl:async()=>response(503,'{}'),budgetMs:10,delayMs:1}));
  const c=new AbortController();c.abort();await assert.rejects(waitForApi({signal:c.signal}));
});
