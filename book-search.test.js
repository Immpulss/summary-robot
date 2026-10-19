import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBookSearch,validateSearch} from './book-search.js';
const isbn='9781665932578',url='https://www.simonandschuster.com/books/Hurricane-Heist/James-Ponti/9781665932578';
const description='A hurricane uncovers a body linked to an old jewel theft, and a group of young detectives investigates the mystery and the people who want it kept secret.';
const found={title:'Hurricane Heist',author:'James Ponti',isbn,sourceURL:url,description};
const result=(book=found,source=url)=>({ok:true,json:async()=>({output:[{type:'web_search_call',action:{sources:[{url:source}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify(book)}]}]})});
test('invalid identifiers are rejected before any paid search',async()=>{
 let n=0;const find=createBookSearch({apiKey:'test',fetcher:async()=>{n++}});
 await assert.rejects(find({isbn:'9781665932579'}),/valid ISBN/);assert.equal(n,0);assert.throws(()=>validateSearch({title:'Book'}));
});
test('only verbatim publisher description accepted; success cached',async()=>{
 let n=0;const find=createBookSearch({apiKey:'test',fetcher:async(u,o)=>{
  n++;if(u.includes('openai.com')){const body=JSON.parse(o.body);assert.equal(body.max_tool_calls,1);assert.equal(body.store,false);return result();}
  assert.equal(o.redirect,'manual');return {ok:true,status:200,text:async()=>`<h1>Hurricane Heist</h1><p>James Ponti</p><p>${description}</p>`};
 }});
 const book=await find({isbn});assert.equal(book.description,description);assert.equal(book.sourceURL,url);
 await find({isbn});assert.equal(n,2);
});
test('invented description is discarded while verified metadata permits database recovery',async()=>{
 const find=createBookSearch({apiKey:'test',fetcher:async u=>u.includes('openai.com')?result():{ok:true,status:200,text:async()=>'<h1>Hurricane Heist</h1><p>James Ponti</p>Different text'}});
 const b=await find({isbn});assert.equal(b.description,'');assert.equal(b.title,'Hurricane Heist');assert.equal(b.warnings.length,1);
});
test('uncited URLs and wrong ISBNs rejected',async()=>{
 for(const b of [{...found,sourceURL:url.replace(isbn,'9781665932561')},{...found,sourceURL:'https://example.com/'+isbn}]){
  const find=createBookSearch({apiKey:'test',fetcher:async()=>result(b)});await assert.rejects(find({isbn}));
 }
});
test('redirect outside publisher allowlist is not fetched',async()=>{
 let n=0;const find=createBookSearch({apiKey:'test',fetcher:async u=>{n++;return u.includes('openai.com')?result():{ok:false,status:302,headers:{get:()=> 'http://127.0.0.1/private'}};}});
 const b=await find({isbn});assert.equal(n,2);assert.equal(b.description,'');
});
test('daily search cap prevents additional billed requests',async()=>{
 let n=0;const find=createBookSearch({apiKey:'test',dailyLimit:1,fetcher:async()=>{n++;return {ok:false,status:429}}});
 await assert.rejects(find({isbn}));await assert.rejects(find({isbn:'9780316003957'}),/daily/);assert.equal(n,1);
});
