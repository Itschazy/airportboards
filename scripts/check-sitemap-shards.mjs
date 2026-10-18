// Разные ISR-файлы строятся по разным снимкам: один набор вырос на 12 локалей.
// Тест использует ту же функцию разбиения, что app/sitemap.ts, без сети/airlabs.
import fs from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const js=ts.transpileModule(fs.readFileSync('lib/sitemap-shard.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {sitemapShard}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const locales=['en','ru','zh','ar','de','ko','ja','fr','es','it','hi','tr'];
const entries=path=>locales.map(loc=>({url:`https://airportsboard.live/${loc}${path}`}));
const before=Array.from({length:2},(_,i)=>entries('/airport/A'+i)).flat();
const after=[...entries('/airport/NEW/arrivals'),...before];
const count=2;
const mixed=Array.from({length:count},(_,i)=>sitemapShard(i%2?after:before,i,count)).flat();
const urls=mixed.map(e=>e.url);
assert.equal(new Set(urls).size,urls.length,'дубли при смешении снимков');
for(const e of before) assert.equal(urls.filter(url=>url===e.url).length,1,'потерян адрес '+e.url);
for(const path of ['/airport/NEW/arrivals',...Array.from({length:2},(_,i)=>'/airport/A'+i)]) {
 const variants=entries(path).map(e=>e.url);
 const present=variants.filter(url=>urls.includes(url));
 assert.ok(present.length===0 || present.length===12,'неполный набор локалей '+path);
}
for(let i=0;i<count;i++)for(const e of sitemapShard(before,i,count))assert.ok(sitemapShard(after,i,count).some(x=>x.url===e.url),'адрес сменил файл');
console.log('Sitemap: смена снимка не создаёт дублей, потерь и неполных языковых групп');
