// Пять справочных из Bing: проверяем доступный SSR и FAQ всех 12 языков,
// canonical/hreflang, совпадение каждой опубликованной фразы. Только audit-bot.
//
// Кластер hreflang заявляется ТОЛЬКО у индексируемой страницы, а подстраница прилётов
// индексируема, если на борту есть строки или код заявлен в карте (generateMetadata в
// app/[locale]/airport/[iata]/arrivals/page.tsx). На локальном стенде борт фикстурный:
// у LBA прилётов нет вовсе, страница честно отдаёт noindex и альтернатив не печатает.
// Поэтому против localhost это утверждение пропускается вслух, а против прода остаётся
// строгим: там noindex на справочной — настоящая находка, а не свойство стенда.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.argv[2]||'http://localhost:3121';
const LOCAL=/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(base);
let skipped=0;
const locales=['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'];
const codes=['EDI','LBA','NCL','GLA','DMM'];
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const results=[];
for(const locale of locales) for(const code of codes) for(const suffix of ['','/arrivals']) {
 const route=`/${locale}/airport/${code}${suffix}`;
 const response=await fetch(base+route,{headers:{'user-agent':'audit-bot'},signal:AbortSignal.timeout(30000)});
 assert.equal(response.status,200,route);const html=await response.text();
 const visible=decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,''));
 // Строки «Проверено …» (class="ag-lead") на странице больше нет: снята по решению
 // владельца 31.10.2026 вместе с подписями источников под блоками. Дата проверки
 // осталась в данных — её стережёт check:guidefresh, которому она и нужна.
 assert.ok(html.includes(`rel="canonical" href="https://airportsboard.live${route}"`),route+': canonical');
 const noindex=/<meta name="robots" content="noindex/.test(html);
 if(noindex&&LOCAL){skipped++;console.log('  ~ '+route+': noindex на фикстуре — кластер hreflang не проверен');}
 else {
  assert.ok(!noindex,route+': страница закрыта от индексации');
  for(const l of locales) assert.ok(html.includes(`hrefLang="${l}" href="https://airportsboard.live/${l}/airport/${code}${suffix}"`),route+': hreflang '+l);
 }
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1]));
 const faqs=schemas.filter(s=>s['@type']==='FAQPage');assert.equal(faqs.length,1,route);
 const faq=faqs[0].mainEntity;assert.equal(new Set(faq.map(f=>f.name)).size,faq.length,route+': unique');
 assert.ok(!/Airport airport/i.test(faq.map(f=>f.name).join(' ')));
 const file=`data/airport-guide/${locale==='ru'?'':locale+'/'}${code}.json`;
 const guide=JSON.parse(fs.readFileSync(file));assert.ok(visible.includes(guide.about),route+': verified about');const blocks=Array.isArray(guide.blocks)?guide.blocks:Object.values(guide.blocks);
 for(const b of blocks){assert.ok(visible.includes(b.text),route+': visible '+b.title);assert.ok(faq.some(q=>q.acceptedAnswer.text===b.text),route+': schema '+b.title);}
 results.push({route,status:response.status,blocks:blocks.length,faq:faq.length});
}
const out=path.join(os.tmpdir(),'ab-bing-ssr-results.json');
fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log('PASS',results.length,'страниц: 5 аэропортов × 12 локалей × 2 направления;',
 'SSR, FAQ, canonical, hreflang'+(skipped?`; hreflang пропущен у ${skipped} страниц на фикстуре`:'')+'.','Отчёт:',out);
