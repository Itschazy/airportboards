// Проверяем конкретные посадочные из Метрики и нативный FAQ во всех языках.
// Только GET с audit-bot, без API рейсов; подходит для fixture и после выката.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=(process.argv[2]||'http://localhost:3142').replace(/\/$/,'');
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const codes=['GYD','IST','HRG','DME','OVB','UFA','HKT'];
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const [loc,code] of [...codes.map(c=>['ru',c]),...locales.filter(l=>l!=='ru').map(l=>[l,'GYD'])]){
 for(const suffix of ['','/arrivals']){
  const path=`/${loc}/airport/${code}${suffix}`;
  const res=await fetch(base+path,{headers:{'user-agent':'audit-bot'},signal:AbortSignal.timeout(45000)});
  assert.equal(res.status,200,path);const html=await res.text();
  assert.ok(html.includes(`rel="canonical" href="https://airportsboard.live${path}"`),path+' canonical');
  assert.match(html,/<meta name="robots" content="index, follow"/);
  assert.equal((html.match(/rel="alternate" hrefLang=/g)||[]).length,13,path+' hreflang');
  const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'');
  assert.equal((clean.match(/<h1[ >]/g)||[]).length,1,path+' h1');
  const faqs=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])).filter(x=>x['@type']==='FAQPage');
  assert.equal(faqs.length,1,path+' FAQPage');
  assert.equal(new Set(faqs[0].mainEntity.map(x=>x.name)).size,faqs[0].mainEntity.length);
  const msg=JSON.parse(fs.readFileSync(`messages/${loc}.json`));
  const question=msg.home.faq_missing_q.replace('{iata}',code);
  const item=[...clean.matchAll(/<details\b[^>]*class="airport-faq-item"[\s\S]*?<\/details>/g)].map(m=>decode(m[0])).find(s=>s.includes(question));
  assert.ok(item,path+' native FAQ in initial HTML');
  assert.ok(item.includes(`href="/${loc}/airport/${code}${suffix?'':'/arrivals'}"`),path+' contextual direction link');
  assert.ok(item.includes(msg.home.faq_missing_a),path+' original answer retained');
  for(const q of faqs[0].mainEntity)assert.ok(decode(clean).replace(/<[^>]*>/g,'').includes(q.acceptedAnswer.text),path+' schema answer visible');
  console.log('PASS',path,'canonical/index/hreflang/native FAQ/link/schema');
 }
}
// Translation keys stay identical even though this package adds no strings.
const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v,p+k+'.'):p+k).sort();
const signatures=locales.map(l=>JSON.stringify(keys(JSON.parse(fs.readFileSync(`messages/${l}.json`)))));
assert.equal(new Set(signatures).size,1);console.log('PASS keys of 12 locales');
