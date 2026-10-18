import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from './server.js';
const input={title:'A Book',author:'An Author',description:'Four children investigate a mystery.'};
async function request(options, body=input) {
 const app=createApp({apiKey:'test-key',...options}); const server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.on('listening',r));
 try {const res=await fetch(`http://127.0.0.1:${server.address().port}/api/summary`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};}
 finally {await new Promise(r=>server.close(r));}
}
const good=text=>({ok:true,json:async()=>({choices:[{message:{content:text}}]})});
test('missing description never calls AI',async()=>{let called=false;const r=await request({fetcher:async()=>{called=true;}},{title:'A',author:'B'});assert.equal(r.status,400);assert.equal(called,false);});
test('actual description is passed to AI',async()=>{const r=await request({fetcher:async(url,opt)=>{const body=JSON.parse(opt.body);assert.equal(JSON.parse(body.messages[1].content).description,input.description);return good('Four children investigate a mystery.');}});assert.equal(r.status,200);});
test('overlength output retries then rejects',async()=>{let n=0;const r=await request({fetcher:async()=>{n++;return good('x'.repeat(261));}});assert.equal(n,3);assert.equal(r.status,502);});
test('upstream rate limit becomes useful message',async()=>{const r=await request({fetcher:async()=>({ok:false,status:429})});assert.equal(r.status,429);assert.match(r.body.error,/busy/);});
test('malformed upstream response handled',async()=>{const r=await request({fetcher:async()=>({ok:true,json:async()=>({})})});assert.equal(r.status,502);});
test('timeout becomes useful error',async()=>{const r=await request({timeout:10,fetcher:async(u,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'}))))});assert.equal(r.status,504);});

test('overlength responses are shortened automatically with measured feedback and source retained',async()=>{
 let n=0;
 const r=await request({fetcher:async(url,opt)=>{
  const body=JSON.parse(opt.body);n++;
  assert.equal(JSON.parse(body.messages[1].content).description,input.description);
  if(n===2)assert.match(body.messages.at(-1).content,/300 characters.*180/s);
  if(n===3)assert.match(body.messages.at(-1).content,/270 characters.*140/s);
  return good(n===1?'x'.repeat(300):n===2?'x'.repeat(270):'Four children investigate a mystery.');
 }});
 assert.equal(n,3);assert.equal(r.status,200);assert.equal(r.body.summary,'Four children investigate a mystery.');
});
