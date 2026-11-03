import assert from 'node:assert/strict';
import {deliveryHealth} from './automation-health.mjs';
assert.equal(deliveryHealth({version:2,runs:[{accepted:0,failed:0,pending:0}]}).ok,true);
assert.equal(deliveryHealth({version:2,runs:[{accepted:100,failed:0,pending:20},{accepted:0,failed:20,pending:20}]}).ok,false);
assert.equal(deliveryHealth({runs:[{ok:468,fail:0},{ok:0,fail:470}]}).ok,false);
assert.equal(deliveryHealth({runs:[{ok:150,fail:0}]}).ok,true);
assert.equal(deliveryHealth({version:2,runs:[{accepted:0,failed:0,pending:10}]}).ok,false);
assert.equal(deliveryHealth({version:2,runs:[]}).ok,false);
console.log('PASS: idle v2, current failure, legacy failure, accepted delivery, stalled queue, empty history');

import {stopRecrawl} from './recrawl-delivery.mjs';
assert.equal(stopRecrawl(504,1),false);
assert.equal(stopRecrawl(504,3),true);
assert.equal(stopRecrawl(0,3),true);
for(const code of [401,403,429]) assert.equal(stopRecrawl(code,1),true);
console.log('PASS: recrawl stops on repeated failures, timeout, auth and rate limit');

// Исполняем CLI целиком с подставленной сетью и памятью, а не копию цикла.
import fs from 'node:fs';
const source=fs.readFileSync(new URL('./yandex-recrawl.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction('fetch','BASE','readEnvFile','priorityPaths','loadState','saveState','knownPaths','stopRecrawl','process','console',source);
async function scenario(statuses) {
  const state={sent:{},runs:[]},proc={argv:[],exit(){throw new Error('unexpected exit');}};
  let posts=0,saved=false;
  await run(async url=>url.endsWith('/quota')?{ok:true,json:async()=>({quota_remainder:10,daily_quota:10})}:{status:statuses[posts]??504,ok:statuses[posts++]===202,text:async()=>''},'https://example.test',()=>({YANDEX_WEBMASTER_TOKEN:'test'}),async()=>({paths:Array.from({length:10},(_,i)=>'/ru/airport/TEST'+i),sitemapSize:10,buckets:{}}),()=>state,()=>{saved=true;},()=>[],stopRecrawl,proc,{log(){},error(){}});
  return {state,proc,posts,saved};
}
const outage=await scenario([504,504,504,202]);
assert.equal(outage.posts,3);assert.equal(outage.proc.exitCode,1);assert.equal(outage.saved,true);assert.deepEqual(outage.state.sent,{});
const limited=await scenario([429]);assert.equal(limited.posts,1);
const mixed=await scenario([504,504,202,504,504,504]);
assert.equal(mixed.posts,6);assert.equal(Object.keys(mixed.state.sent).length,1);assert.equal(mixed.state.runs[0].ok,1);
console.log('PASS CLI: bounded POST count, successful reset, persisted failures, only accepted URLs marked sent');
