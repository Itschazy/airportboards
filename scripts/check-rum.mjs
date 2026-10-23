// Проверяем реальные модули без платных API: lifecycle, privacy, bounded store и отчёт.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {reportRum} from './report-rum.mjs';
const require=createRequire(import.meta.url), cache=new Map();
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
function load(file, extras={}) {
 const absolute=path.resolve(file);const ctx={exports:{},Buffer,process,Date,URL,console,...extras};
 ctx.require=n=>{if(extras.require)return extras.require(n);if(!n.startsWith('.')&&!n.startsWith('@/'))return require(n);const p=n.startsWith('@/')?path.resolve(n.slice(2)+'.ts'):path.resolve(path.dirname(absolute),n+'.ts');if(!cache.has(p))cache.set(p,load(p));return cache.get(p);};
 vm.runInNewContext(compile(fs.readFileSync(absolute,'utf8')),ctx,{filename:absolute});return ctx.exports;
}
const policy=load('lib/rum-policy.ts'), schema=load('lib/rum-schema.ts'), store=load('lib/rum-store.ts');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
const valid={schema:1,release:'123456789abc',airport:'AYT',browserMajor:140,longTasksSupported:true,longTasksTruncated:false,...Object.fromEntries(Object.entries(schema.RUM_CATEGORIES).map(([k,v])=>[k,v[0]])),...Object.fromEntries(schema.RUM_METRICS.map(k=>[k,100])),page:'departures',browser:'chrome',device:'mobile',platform:'android',lcp:2000};
test('согласие, регион, host, opt-out и робот',()=>{
 for(const [host,tz,choice,bot,opt,yes] of [['airportsboard.live','Asia/Yekaterinburg',null,false,false,true],['airportsboard.live','Europe/Moscow',null,false,false,true],['airportsboard.live','Europe/Paris',null,false,false,false],['airportsboard.live','Europe/Paris','granted',false,false,true],['airportsboard.live','Asia/Yekaterinburg','denied',false,false,false],['airportsboard.live','',null,false,false,false],['evil.com','Asia/Yekaterinburg','granted',false,false,false],['airportsboard.live','Asia/Yekaterinburg',null,true,false,false],['airportsboard.live','Asia/Yekaterinburg',null,false,true,false],['localhost','Asia/Yekaterinburg',null,false,false,false]])assert.equal(policy.rumAllowed(host,tz,choice,bot,opt),yes);
 assert.equal(policy.rumAllowed('localhost','Asia/Yekaterinburg',null,false,false,true),true);
});
test('браузеры не смешиваются и нет произвольного URL',()=>{
 for(const [ua,b] of [['Chrome/140 YaBrowser/26.1','yandex'],['Chrome/140 YaApp_Android/26.1','yandex-app'],['Chrome/140 YaSearchBrowser/26.1','yandex-app'],['Chrome/140','chrome'],['Version/18.6 Mobile Safari/605','safari'],['CriOS/140 Mobile Safari','chrome-ios']])assert.equal(policy.rumBrowser(ua).browser,b);
 assert.equal(policy.rumPage('/ru/airport/AYT/arrivals').page,'arrivals');assert.equal(policy.rumPage('/ru').page,'home');assert.equal(policy.rumPage('/ru/airport/AYT?flight=secret'),null);
});
test('строгая схема отбрасывает идентификаторы и некорректные значения',()=>{
 assert.ok(schema.parseRum(valid));assert.equal(schema.parseRum({...valid,ua:'secret',url:'secret',clientId:'secret'}).ua,undefined);
 for(const patch of [{lcp:NaN},{lcp:-1},{lcp:0},{release:'unknown'},{airport:'../../secret'},{longTasksSupported:'yes'},{browserMajor:1.5},{page:'home'}])assert.equal(schema.parseRum({...valid,...patch}),null);
 assert.equal(schema.parseRum({...valid,longTaskTotal:-1}).longTaskTotal,-1);
});
function harness({denied=false,restored=false,firstHidden=Infinity,unsupported=false,failImport=false,longSupported=true,navType='navigate',activationStart=0,libraryOld=false}={}) {
 let callback,imports=0,disconnected=0;const posts=[];let consent=denied?'denied':null;
 const nav={type:navType,activationStart,nextHopProtocol:'h2',domainLookupEnd:10,domainLookupStart:0,connectEnd:20,connectStart:10,responseStart:500,requestStart:30,responseEnd:700};
 const gate={path:'/ru/airport/AYT',firstHidden,restored};
 class PO {static supportedEntryTypes=unsupported?[]:['largest-contentful-paint',...(longSupported?['longtask']:[])];constructor(cb){this.cb=cb;}observe(){}takeRecords(){return [{startTime:100,duration:200},{startTime:1900,duration:400},{startTime:3000,duration:100}];}disconnect(){disconnected++;}}
 const w={__abRumGate:gate};const loc={hostname:'airportsboard.live',origin:'https://airportsboard.live',pathname:gate.path};
 const mod=load('lib/rum-client.ts',{window:w,location:loc,process:{env:{NEXT_PUBLIC_RUM_RELEASE:valid.release}},navigator:{userAgent:'Android Chrome/140',deviceMemory:2,connection:{effectiveType:'future-5g'}},screen:{width:375,height:667},Intl:{DateTimeFormat:()=>({resolvedOptions:()=>({timeZone:'Asia/Yekaterinburg'})})},localStorage:{getItem:()=>consent},PerformanceObserver:PO,
 ...(libraryOld?{Array:{prototype:{}}}:{}),
 performance:{getEntriesByType:t=>t==='navigation'?[nav]:[{name:'https://airportsboard.live/_next/app.js',responseEnd:900,duration:400,initiatorType:'script',transferSize:2048}],getEntriesByName:()=>[{startTime:800}]},
 fetch:async(url,opts)=>{posts.push({url,opts,payload:JSON.parse(opts.body)});return new Response(null,{status:204});},
 require:n=>n==='./rum-policy'?policy:n==='./rum-schema'?schema:n==='web-vitals/attribution'?(()=>{imports++;if(failImport)throw Error('chunk offline');return {onLCP:cb=>{callback=cb;}};})():require(n)});
 return {mod,w,loc,gate,posts,imports:()=>imports,disconnected:()=>disconnected,deny:()=>consent='denied',fire:(patch={})=>callback?.({value:2000,navigationType:'navigate',attribution:{timeToFirstByte:500,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:1500,lcpEntry:{element:{tagName:'SPAN',closest:s=>s==='h1,h2,h3'?{}:null}}},...patch})};
}
for(const opts of [{denied:true},{restored:true},{firstHidden:0},{unsupported:true},{libraryOld:true}]){const h=harness(opts);await h.mod.startRum();assert.equal(h.imports(),0);assert.equal(h.posts.length,0);}console.log('PASS запрещённые/неподдерживаемые загрузки не скачивают библиотеку');passed++;
const h=harness();await h.mod.startRum();await h.mod.startRum();assert.equal(h.imports(),1);assert.equal(h.posts.length,0);h.loc.pathname='/ru/airport/JFK/arrivals';h.fire();h.fire();assert.equal(h.posts.length,1);const p=h.posts[0].payload;
assert.equal(p.airport,'AYT');assert.equal(p.page,'departures');assert.equal(p.release,valid.release);assert.equal(p.longTaskTotal,300);assert.equal(p.longTaskCount,2);assert.equal(p.target,'heading');assert.equal(p.network,'unknown');assert.equal(p.slowestResource,'next');assert.equal(h.posts[0].opts.credentials,'omit');assert.equal(h.posts[0].opts.referrerPolicy,'no-referrer');assert.equal(h.posts[0].opts.keepalive,true);console.log('PASS один финальный LCP, исходная страница/релиз, обрезка long tasks по LCP, без cookies/referrer');passed++;
for(const opts of [{firstHidden:1000},{activationStart:10},{navType:'other'}]){const h=harness(opts);await h.mod.startRum();h.fire();assert.equal(h.posts.length,0);}
for(const metric of [{navigationType:'back-forward-cache'},{navigationType:'restore'},{attribution:{url:'chrome-extension://id/overlay.png'}}]){const h=harness();await h.mod.startRum();h.fire(metric);assert.equal(h.posts.length,0);}
const denied=harness();await denied.mod.startRum();denied.deny();denied.fire();assert.equal(denied.posts.length,0);
const noLong=harness({longSupported:false});await noLong.mod.startRum();noLong.fire();assert.equal(noLong.posts[0].payload.longTaskTotal,-1);
const offline=harness({failImport:true});await offline.mod.startRum();assert.equal(offline.posts.length,0);assert.equal(offline.disconnected(),1);console.log('PASS hidden/BFCache/prerender/расширения исключены; отзыв согласия, offline и отсутствие API безопасны');passed++;
const bootstrap=load('lib/rum-bootstrap.ts').rumBootstrap;const events={};let now=50;
const boot={window:{addEventListener:(n,f)=>events[n]=f},document:{visibilityState:'visible',addEventListener:(n,f)=>events[n]=f},location:{pathname:'/ru/airport/AYT'},performance:{now:()=>now}};
vm.runInNewContext(bootstrap,boot);assert.equal(boot.window.__abRumGate.firstHidden,Infinity);boot.document.visibilityState='hidden';events.visibilitychange();now=100;events.visibilitychange();assert.equal(boot.window.__abRumGate.firstHidden,50);events.pageshow({persisted:true});assert.equal(boot.window.__abRumGate.restored,true);console.log('PASS ранний bootstrap хранит первое скрытие и BFCache до гидратации');passed++;
const saved=[];const route=load('app/api/rum/route.ts',{Response,Buffer,process:{env:{RUM_ALLOW_LOCAL:'1'}},require:n=>n==='@/lib/rum-schema'?schema:n==='@/lib/rum-store'?{storeRum:async r=>saved.push(r)}:require(n)});
const request=(body=JSON.stringify(valid),headers={})=>new Request('http://localhost:3099/api/rum',{method:'POST',headers:{origin:'http://localhost:3099','user-agent':'local-rum-check',...headers},body});
assert.equal((await route.POST(request(undefined,{origin:'https://evil.example'}))).status,403);
assert.equal((await route.POST(request('x'.repeat(4097)))).status,413);
assert.equal((await route.POST(request('{'))).status,400);
assert.equal((await route.POST(request(JSON.stringify({...valid,lcp:-1})))).status,400);
assert.equal((await route.POST(request(undefined,{'user-agent':'audit-bot'}))).status,204);assert.equal(saved.length,0);
const ok=await route.POST(request(JSON.stringify({...valid,ip:'secret',query:'secret'})));assert.equal(ok.status,204);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal(saved.length,1);assert.equal(saved[0].ip,undefined);
let limited=false;for(let i=0;i<121;i++)if((await route.POST(request())).status===429)limited=true;assert.ok(limited);console.log('PASS endpoint: origin, потоковый предел, схема, no-store, bot-ignore и общий rate limit');passed++;
const dir=await fsp.mkdtemp(path.join(os.tmpdir(),'ab-rum-check-')), day=new Date('2026-10-24T12:20:00Z'), bucket=Math.floor(+day/86400000)%14, file=path.join(dir,`rum-${bucket}-0.jsonl`);
assert.equal(await store.storeRum(valid,day,dir,'0'),true);assert.equal(await store.storeRum(valid,day,dir,'8'),false);
const concurrent=await Promise.all(Array.from({length:20},()=>store.storeRum(valid,day,dir,'0')));assert.ok(concurrent.some(Boolean));for(const line of (await fsp.readFile(file,'utf8')).trim().split('\n'))JSON.parse(line);
assert.equal((await fsp.stat(file)).mode&0o777,0o600);
await fsp.writeFile(file,JSON.stringify({day:'2026-10-24'})+'\n'+' '.repeat(store.RUM_FILE_LIMIT-30));const before=(await fsp.stat(file)).size;assert.equal(await store.storeRum(valid,day,dir,'0'),false);assert.equal((await fsp.stat(file)).size,before);
assert.equal(await store.storeRum(valid,new Date(+day+14*86400000),dir,'0'),true);assert.equal((await fsp.readFile(file,'utf8')).trim().split('\n').length,2);console.log('PASS атомарный ограниченный store, 0600, конкуренция, полный файл, повторное использование через 14 дней');passed++;
const reportDir=await fsp.mkdtemp(path.join(os.tmpdir(),'ab-rum-report-'));
for(const lcp of [1000,2000,3000,5000])await store.storeRum({...valid,lcp,longTaskTotal:-1},day,reportDir,'0');
await store.storeRum({...valid,release:'abcdefabcdef',lcp:9000},day,reportDir,'1');
const report=await reportRum({dir:reportDir,since:'2026-10-24',until:'2026-10-24'});assert.equal(report.records,5);assert.equal(report.groups.length,2);assert.equal(report.groups[0].metrics.lcp.p75,3000);assert.equal(report.groups[0].metrics.lcp.p90,5000);assert.equal(report.groups[0].poorPercent,25);assert.equal(report.groups[0].metrics.longTaskTotal.p75,null);assert.equal(report.groups[0].smallSample,true);
assert.equal((await reportRum({dir:reportDir,since:'2026-10-24',until:'2026-10-24',filters:{browser:'safari'}})).records,0);assert.equal((await reportRum({dir:reportDir,since:'2026-10-24',until:'2026-10-24',minLcp:4000})).records,2);console.log('PASS отчёт: релизы отдельно, p75/p90 по визитам, неизвестное не ноль, малая выборка и фильтры');passed++;
// Удаляются только созданные этим тестом случайные временные каталоги, не данные проекта.
await fsp.rm(dir,{recursive:true});await fsp.rm(reportDir,{recursive:true});
console.log(`PASS ${passed} групп RUM-проверок`);
