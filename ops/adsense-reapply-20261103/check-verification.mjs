// Повторная заявка подтверждается метатегом, не рекламным загрузчиком.
// Читаем только HTML audit-bot; табло/API рейсов не обновляем.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=(process.argv[2]||'http://localhost:3143').replace(/\/$/,'');
const id='ca-pub-1120910641545293';
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
for(const path of [...locales.map(l=>'/'+l),'/ru/airport/CEK','/en/airport/LHR','/ar/airport/GYD/arrivals','/de/flight-map','/ru/flight-map/help','/en/about']){
 const r=await fetch(base+path,{headers:{'user-agent':'audit-bot'},signal:AbortSignal.timeout(45000)});
 assert.equal(r.status,200,path);
 const html=await r.text(),head=html.match(/<head>[\s\S]*?<\/head>/)?.[0]||'';
 const tags=[...head.matchAll(/<meta[^>]*name="google-adsense-account"[^>]*>/g)];
 assert.equal(tags.length,1,path+' one meta in head');
 assert.ok(tags[0][0].includes(`content="${id}"`),path+' publisher');
 assert.doesNotMatch(html,/adsbygoogle\.js|<link[^>]+href="https:\/\/pagead2\.googlesyndication\.com"/,path+' no advertising requests');
 assert.ok(head.includes('msvalidate.01')&&head.includes('yandex-verification'),path+' previous verifications');
 assert.ok(head.includes('rel="canonical"'),path+' canonical retained');
 console.log('PASS',path);
}
const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,p+k+'.'):p+k).sort();
assert.equal(new Set(locales.map(l=>JSON.stringify(keys(JSON.parse(fs.readFileSync(`messages/${l}.json`)))))).size,1);
console.log('PASS keys of all 12 locales; verification only, no advertising loader');
