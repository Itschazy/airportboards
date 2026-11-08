// Exercise the actual shared loader: two consumers, language/cache boundaries,
// bounded requests and offline fallback. No browser/paid API access.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const js=ts.transpileModule(fs.readFileSync('lib/recent-airports.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
let now=0, calls=[], timers=[];
const context={exports:{},Date:{now:()=>now},AbortController,
  setTimeout(fn){timers.push(fn);return fn;},clearTimeout(fn){timers=timers.filter(f=>f!==fn);},
  fetch(url,{signal}){return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(new Error('timeout')));calls.push({url,resolve:data=>resolve({ok:true,json:async()=>data}),reject});})}};
vm.runInNewContext(js,context);
const load=context.exports.localizeRecent;
const row=iata=>({iata,city:'stored',name:'stored',country:'stored',iso2:'QA'});
const a=load([row('DOH'),row('LHR')],'en'), b=load([row('LHR'),row('DOH')],'en');
assert.equal(calls.length,1,'Two components share one request irrespective of order');
calls[0].resolve({airports:[{...row('DOH'),city:'Doha'},{...row('LHR'),city:'London'}]});
assert.deepEqual(Array.from(await a,r=>r.city),['Doha','London']);assert.deepEqual(Array.from(await b,r=>r.city),['London','Doha']);
await load([row('DOH'),row('LHR')],'en');assert.equal(calls.length,1,'Successful results reused');
const de=load([row('DOH')],'de');calls.at(-1).reject(new Error('offline'));assert.equal((await de)[0].city,'stored');
const retry=load([row('DOH')],'de');assert.equal(calls.length,3);calls.at(-1).resolve({airports:[{...row('DOH'),city:'Doha'}]});await retry;
const timeout=load([row('LHR')],'fr');timers.forEach(fn=>fn());assert.equal((await timeout)[0].city,'stored');
const malformed=load([row('LHR')],'hi');calls.at(-1).resolve({airports:[{iata:'LHR',city:{}},row('DOH')]});assert.equal((await malformed)[0].city,'stored');
const none=calls.length;assert.equal((await load([],'en')).length,0);assert.equal(calls.length,none,'No request for empty history');
const limit=load(['DOH','LHR','DXB','AYT','KZN','JFK','../api'].map(row),'en');assert.equal(new URL(calls.at(-1).url,'http://local').searchParams.get('codes').split(',').length,5);calls.at(-1).resolve({airports:[]});await limit;
now=3600_001;const expired=load([row('DOH'),row('LHR')],'en');assert.ok(calls.length>none);calls.at(-1).resolve({airports:[]});await expired;
for(let i=0;i<33;i++){const p=load([row('DOH')],'test'+i);calls.at(-1).resolve({airports:[]});await p;}
const before=calls.length,p=load([row('DOH')],'test0');assert.equal(calls.length,before+1,'Cache capacity bounded to 32');calls.at(-1).resolve({airports:[]});await p;
assert.equal(timers.length,0,'All request timers cleaned up');
console.log('PASS: batch/dedup/order/cache/locale/offline/retry/timeout/invalid response/empty/limit/TTL/capacity');
