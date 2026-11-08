// Регрессия 08.11.2026: современный Yeti терялся в отчёте и проходил как
// платный посетитель. Исполняем настоящий live-budget, подменяя только хранилище.
// Ни сети, ни ключей провайдера; User-Agent не подтверждает личность робота.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const source = fs.readFileSync('lib/live-budget.ts','utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const module = {exports:{}};
vm.runInNewContext(compiled, {exports:module.exports,module,Headers,Map,Date,process:{env:{}},require(name){
  if(name==='node:os') return {cpus:()=>[{}]};
  if(name==='@/lib/flightStore') return {usage:()=>({human:0,count:0}),humanReserve:()=>1000,monthlyCap:()=>10000};
  throw new Error('Unexpected dependency: '+name);
}});
const report = fs.readFileSync('scripts/bot-log-report.mjs','utf8');
const bots = vm.runInNewContext(report.match(/const BOTS = \[[\s\S]*?\n\];/)[0]+'\nBOTS');
const chrome='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const yeti='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Yeti/1.1; +https://naver.me/spd) Chrome/130.0.0.0 Safari/537.36';
const cases=[
  ['Chrome',chrome,true,null],
  ['Samsung',chrome+' SamsungBrowser/27.0',true,null],
  ['Whale',chrome+' Whale/4.0',true,null],
  ['Naver app',chrome+' NAVER(inapp; search; 2100; 12.0)',true,null],
  ['Yandex app',chrome+' YaSearchApp/25.1',true,null],
  ['Yeti modern',yeti,false,'Yeti (Naver)'],
  ['Yeti compatible','Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',false,'Yeti (Naver)'],
  ['Yeti version',yeti.replace('Yeti/1.1','yeti/2.0'),false,'Yeti (Naver)'],
  ['Yeti with app token',yeti+' YaSearchApp/25.1',false,'Yeti (Naver)'],
  ['NotYeti',chrome+' NotYeti/1.0',true,null],
  ['DuckDuckBot','DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',false,'DuckDuckBot'],
  ['DuckAssistBot',chrome+' DuckAssistBot/1.2',false,'DuckAssistBot'],
  ['QwantBot',chrome+' Qwantbot/1.0_42',false,'QwantBot'],
  ['Qwant news',chrome+' Qwantbot-news/1.0_42',false,'QwantBot News'],
  ['Baidu',chrome+' Baiduspider/2.0',false,'Baiduspider'],
  ['Baidu render',chrome+' Baiduspider-render/2.0',false,'Baiduspider'],
  ['Baidu ads',chrome+' Baiduspider-cpro/2.0',false,'Baiduspider (сервисные)'],
  ['Seznam',chrome+' SeznamBot/4.0-RC1',false,'SeznamBot'],
  ['Yep',chrome+' YepBot/1.0',false,'YepBot'],
  ['audit','audit-bot',false,'audit-bot (наш)'],
];
let failures=0;
for (const [label,ua,wantBrowser,wantName] of cases) {
 const actual=module.exports.mayFetchLiveFor(new Headers({'user-agent':ua,'x-real-ip':'192.0.2.1'}),'airportsboard.live','departures:ICN',null);
 const name=bots.find(([, , re])=>re.test(ua))?.[0]??null;
 try{assert.equal(actual,wantBrowser,'paid-fetch eligibility');assert.equal(name,wantName,'report classification');console.log('PASS',label);}
 catch(e){failures++;console.error('FAIL',label,e.message,JSON.stringify({actual,name}));}
}
assert.equal(module.exports.mayFetchLiveFor(new Headers({'user-agent':chrome}),'localhost','departures:ICN',null),false);
console.log(`${cases.length-failures}/${cases.length} regional crawler cases; localhost protected`);
// Полный CLI: Yeti с 5xx теперь участвует в существующей тревоге, а языки
// читаются из настоящего combined-лога. Временный sitemap строго локальный.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'regional-bots-'));
const server=http.createServer((req,res)=>{
  if(req.headers['user-agent']!=='audit-bot'){res.writeHead(400);res.end();return;}
  res.setHeader('Content-Type','application/xml');
  res.end(req.url==='/sitemap.xml'
    ? '<sitemapindex><sitemap><loc>https://airportsboard.live/sitemap-0.xml</loc></sitemap></sitemapindex>'
    : '<urlset><url><loc>https://airportsboard.live/ko/airport/ICN</loc></url></urlset>');
});
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const log=path.join(dir,'access.log');
  fs.writeFileSync(log,Array.from({length:200},()=>`192.0.2.1 - - [08/Nov/2026:12:00:00 +0000] "GET /ko/airport/ICN HTTP/1.1" 503 0 "-" "${yeti}"`).join('\n')+'\n');
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['scripts/bot-log-report.mjs',log,'--sitemap',`http://127.0.0.1:${server.address().port}`]);
    let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
    child.on('error',reject);child.on('close',code=>resolve({code,out}));
  });
  assert.equal(result.code,1,result.out);
  assert.match(result.out,/Yeti \(Naver\).*200/);
  assert.match(result.out,/языки: ko 100%/);
  assert.match(result.out,/поисковые боты получают 5xx больше 2%/);
  console.log('PASS full report: Naver locale coverage and 5xx alarm');
} finally {await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
process.exitCode=failures?1:0;
