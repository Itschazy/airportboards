// Регрессия реального сбоя: одна принятая партия не подтверждает соседнюю упавшую.
// Все ответы подставлены локально; ни одного внешнего запроса и реального ключа.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {emptyState,reconcile,drain,readState,writeState,validPath,contentManifest} from './indexnow-queue.mjs';
const now=1000000, s=emptyState();
const paths=Array.from({length:120},(_,i)=>'/en/airport/X'+i.toString(36).toUpperCase().padStart(2,'0'));
const manifest=Object.fromEntries(paths.map(p=>[p,'v1']));
reconcile(s,manifest,now);
reconcile(s,manifest,now+1);
assert.equal(Object.keys(s.pending).length,120);
assert.equal(s.pending[paths[0]].queuedAt,now);
let calls=0, snapshots=[];
let result=await drain(s,{key:'test',now,persist:async state=>snapshots.push(structuredClone(state)),fetcher:async(_,options)=>{
  calls++;assert.ok(JSON.parse(options.body).urlList.length<=50);return {status:calls===1?200:503};
}});
assert.deepEqual(result,{accepted:50,failed:50,pending:70});
assert.equal(Object.keys(s.sent).length,50);
assert.equal(s.pending[paths[50]].attempts,1);
assert.equal(s.pending[paths[100]].attempts,0);
assert.equal(snapshots[0].sent[paths[50]],undefined);
result=await drain(s,{key:'test',now:now+1,persist:async()=>{},fetcher:async()=>({status:202})});
assert.equal(result.accepted,20);assert.equal(result.pending,50);
let rateCalls=0;
result=await drain(s,{key:'test',now:now+600000,persist:async()=>{},fetcher:async()=>{rateCalls++;return {status:429};}});
assert.equal(rateCalls,1);assert.equal(result.failed,50);assert.equal(s.pending[paths[50]].attempts,2);
reconcile(s,{[paths[50]]:'v2'},now+600001);
assert.equal(s.pending[paths[50]].attempts,0);
assert.equal(s.pending[paths[50]].fingerprint,'v2');
let attempts=0;
result=await drain(s,{key:'test',now:now+600001,persist:async()=>{},fetcher:async()=>{attempts++;if(attempts===1)throw new Error('network');return {status:200};}});
assert.equal(attempts,2);assert.equal(result.accepted,1);
assert.equal(s.pending[paths[50]],undefined);
for(const p of ['/api/flights/AYT','https://evil.test/en','/en/airport/LBA/departures','/en/../api','/en?x=1'])assert.equal(validPath(p),false,p);
assert.throws(()=>reconcile(s,{'/api/cron/warm':'x'}));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ab-indexnow-test-')),file=path.join(dir,'state.json');
assert.equal(readState(file).version,2);writeState(file,s);assert.deepEqual(readState(file),s);
fs.writeFileSync(file,'broken');assert.throws(()=>readState(file));
fs.writeFileSync(file,JSON.stringify({...emptyState(),pending:[]}));assert.throws(()=>readState(file));
fs.rmSync(dir,{recursive:true});
const current=contentManifest(process.cwd());
assert.ok(current['/en/airport/LBA']);assert.ok(current['/de/airport/MUC/arrivals']);
assert.equal(Object.keys(current).some(p=>p.endsWith('/departures')),false);
assert.deepEqual(contentManifest(process.cwd()),current);
console.log('PASS IndexNow: частичный отказ, атомарное сохранение, дедупликация, 202, 429, backoff, fallback, новая версия, границы URL, стабильный manifest.');
// Внешние адреса и платные ручки не могут стать дочерними sitemap.
const {discoverPaths,base}=await import('./indexnow-queue.mjs');
let requested=[];
const discovered=await discoverPaths(async url=>{
  requested.push(url);return {ok:true,text:async()=>url.endsWith('/sitemap.xml')?`<sitemapindex><loc>${base}/sitemap-0.xml</loc></sitemapindex>`:`<urlset><loc>${base}/en/airport/LBA</loc><loc>${base}/api/flights/LBA</loc><loc>https://evil.test/en</loc></urlset>`};
});
assert.deepEqual(discovered,['/en/airport/LBA']);assert.equal(requested.length,2);
for(const bad of ['https://evil.test/sitemap-0.xml',base+'/api/flights/LBA',base+'/sitemap-0.xml?x=1']) {
 let count=0;await assert.rejects(()=>discoverPaths(async()=>{count++;return {ok:true,text:async()=>`<loc>${bad}</loc>`};}));assert.equal(count,1);
}
const restart=emptyState();reconcile(restart,{'/en/airport/EDI':'v1'},now);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ab-queue-restart-')), stateFile=path.join(temp,'state.json');
writeState(stateFile,restart);
await drain(restart,{key:'test',now,persist:async st=>writeState(stateFile,st),fetcher:async()=>({status:503})});
const restored=readState(stateFile);let repeats=0;
await drain(restored,{key:'test',now:now+1,persist:async()=>{},fetcher:async()=>{repeats++;return {status:200};}});
assert.equal(repeats,0);assert.equal(Object.keys(restored.pending).length,1);
restored.pending['/api/flights/LBA']=restored.pending['/en/airport/EDI'];writeState(stateFile,restored);assert.throws(()=>readState(stateFile));
fs.rmSync(temp,{recursive:true});
console.log('PASS discovery origin/path guards, restart/backoff, corrupt persisted path rejected.');
const {assertPublished}=await import('./indexnow-queue.mjs');
assertPublished('abcdef012345','abcdef012345','abcdef012345');
for(const values of [['abcdef012345','111111111111','111111111111'],['abcdef012345','abcdef012345','111111111111'],['unknown','unknown','unknown']])assert.throws(()=>assertPublished(...values));
const copyRoot=fs.mkdtempSync(path.join(os.tmpdir(),'ab-manifest-'));
for(const entry of ['data/airport-guide','data/events','messages','lib/flight-map'])fs.cpSync(entry,path.join(copyRoot,entry),{recursive:true});
for(const entry of ['components/AirportBottom.tsx','lib/airport-title.ts','lib/airport-guide.ts','lib/airport-content.ts','lib/event-content.ts','app/[locale]/airport/[iata]/page.tsx','app/[locale]/airport/[iata]/arrivals/page.tsx','app/[locale]/event/[slug]/page.tsx','app/[locale]/events/page.tsx','app/[locale]/flight-map/page.tsx']){fs.mkdirSync(path.dirname(path.join(copyRoot,entry)),{recursive:true});fs.copyFileSync(entry,path.join(copyRoot,entry));}
const before=contentManifest(copyRoot);
fs.appendFileSync(path.join(copyRoot,'data/airport-guide/de/LBA.json'),'\n');
const after=contentManifest(copyRoot);
assert.deepEqual(Object.keys(after).filter(p=>before[p]!==after[p]),['/de/airport/LBA','/de/airport/LBA/arrivals']);
const metaFile=path.join(copyRoot,'messages/en.json');
const meta=JSON.parse(fs.readFileSync(metaFile,'utf8'));
meta.meta.main_title+=' updated';fs.writeFileSync(metaFile,JSON.stringify(meta));
const withMeta=contentManifest(copyRoot);
assert.notEqual(withMeta['/en/airport/LHR'],after['/en/airport/LHR']);
assert.equal(withMeta['/de/airport/LHR'],after['/de/airport/LHR']);
fs.rmSync(copyRoot,{recursive:true});
console.log('PASS publication guard (before build / before restart / unknown), isolated translation fingerprint.');
const priorityState=emptyState();reconcile(priorityState,{'/en/airport/AAA':'1','/en/airport/BBB':'1'},now);
reconcile(priorityState,{'/en/airport/BBB':'2','/en/airport/LBA':'1'},now+1);
let firstUrl;
await drain(priorityState,{key:'test',now:now+1,limit:1,persist:async()=>{},fetcher:async(_,o)=>{firstUrl=JSON.parse(o.body).urlList[0];return {status:200};}});
assert.equal(firstUrl,base+'/en/airport/LBA');
await drain(priorityState,{key:'test',now:now+1,limit:1,persist:async()=>{},fetcher:async(_,o)=>{firstUrl=JSON.parse(o.body).urlList[0];return {status:200};}});
assert.equal(firstUrl,base+'/en/airport/BBB');
console.log('PASS new content outranks first-discovery backlog; Bing priority retained.');
// 30.10: живые RU-посадки и BRU/LCY не должны ждать общего обновления тысяч URL.
// В состоянии уже может лежать та же fingerprint с priority=1: одной смены списка
// для новых записей недостаточно. Проверяем настоящий reconcile + drain, без сети.
const demandState=emptyState();
const hotPaths=['/ru/airport/HRG','/ru/airport/SSH/arrivals','/ru/airport/AYT','/ru/airport/DME','/fr/airport/BRU/arrivals','/en/airport/LCY'];
reconcile(demandState,{'/en/city/example':'cold',...Object.fromEntries(hotPaths.map(p=>[p,'same']))},now);
for(const p of hotPaths) demandState.pending[p]={fingerprint:'same',priority:1,queuedAt:now-100,attempts:2,nextAt:now+100};
const savedSent=JSON.stringify(demandState.sent),savedRuns=JSON.stringify(demandState.runs);
reconcile(demandState,Object.fromEntries(hotPaths.map(p=>[p,'same'])),now+1);
for(const p of hotPaths) assert.deepEqual(demandState.pending[p],{fingerprint:'same',priority:0,queuedAt:now-100,attempts:2,nextAt:now+100},p);
assert.equal(JSON.stringify(demandState.sent),savedSent);assert.equal(JSON.stringify(demandState.runs),savedRuns);
const {readyEntries}=await import('./indexnow-queue.mjs');
assert.equal(readyEntries(demandState,now+1).some(([p])=>hotPaths.includes(p)),false,'backoff не обходим');
assert.ok(hotPaths.includes(readyEntries(demandState,now+100)[0][0]));
for(const p of ['/de/airport/HRG','/en/airport/BRU','/fr/airport/LCY']) {
 const scoped=emptyState();reconcile(scoped,{[p]:'new'},now);assert.equal(scoped.pending[p].priority,2,'RU/FR/EN спрос не переносим на остальные языки');
}
console.log('PASS: существующая очередь повышает приоритет реального спроса, сохраняя fingerprint, возраст, backoff и историю; приоритет ограничен локалью.');
