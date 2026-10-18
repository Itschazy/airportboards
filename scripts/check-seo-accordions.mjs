// Контент нельзя сохранить только в RSC/JSON-LD: читателю без JS нужен обычный HTML.
// Сверяем его с исходными транспортом/терминалами/советами и всеми FAQ-ответами.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2] || 'http://localhost:3099';
const norm=s=>s.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
let checks=0;
for(const locale of ['ru','de','ar'])for(const arrivals of [false,true]) {
 const path=`/${locale}/airport/AYT${arrivals?'/arrivals':''}`;
 const r=await fetch(base+path,{headers:{'User-Agent':'audit-bot'}});assert.equal(r.status,200,path);
 const html=await r.text();
 const body=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const panels=[...body.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)].filter(m=>m[1].includes('seo-section'));
 assert.ok(panels.length>=5,path+' разделы и FAQ');assert.ok(panels.every(m=>!/(?:^|\s)open(?:\s|=|$)/.test(m[1])),path+' по умолчанию закрыты');
 const text=norm(panels.map(m=>m[2].replace(/<[^>]*>/g,' ')).join(' '));
 const ext=JSON.parse(fs.readFileSync('data/airport-content-extended/AYT.json','utf8'))[locale];
 for(const key of ['transport','terminals',...(arrivals?[]:['tips'])]) { assert.ok(text.includes(norm(ext[key])),path+' полный '+key);checks++; }
 if(arrivals)assert.ok(!text.includes(norm(ext.tips)),path+' нет советов вылетающим на прилётах');
 const schemas=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
 const faq=schemas.find(x=>x['@type']==='FAQPage');assert.ok(faq?.mainEntity?.length,path+' FAQPage');
 for(const q of faq.mainEntity) {assert.ok(text.includes(norm(q.name)),path+' вопрос');assert.ok(text.includes(norm(q.acceptedAnswer.text)),path+' ответ');checks++;}
 console.log(`✓ ${path}: ${panels.length} аккордеонов, полный текст и FAQ в HTML`);
}
console.log(`${checks} фрагментов подтверждено без выполнения JavaScript`);
