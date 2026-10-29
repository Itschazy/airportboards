// Проверяем настоящий HTTP/SSR, а не только макет. По умолчанию локально;
// на проде исключительно audit-bot, без платных ручек и браузера.
import assert from 'node:assert/strict';
import vm from 'node:vm';
const base=(process.argv[2]||'http://localhost:3111').replace(/\/$/,'');
const ua={'user-agent':'audit-bot'};
const get=path=>fetch(base+path,{headers:ua});
const url='https://airportsboard.live/ru/flight-map';
const response=await get('/ru/flight-map');assert.equal(response.status,200);
const html=await response.text();
const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'');
assert.equal((visible.match(/<h1[ >]/g)||[]).length,1);
assert.match(visible,/О карте перелётов/);assert.match(visible,/Автоматической синхронизации между устройствами нет/);
assert.match(html,new RegExp(`<link rel="canonical" href="${url}"`));
assert.match(html,/<meta name="robots" content="index, follow"/);
assert.match(html,/<meta property="og:image" content="https:\/\/airportsboard.live\/images\/flight-map-ru.jpg"/);
assert.match(visible,/<a[^>]+href="\/ru\/flight-map"/);
assert.ok(!visible.includes('my-flights-prototype'));
assert.match(html,/id=\"journalSearch\"/);assert.match(html,/id=\"undatedOnly\"/);assert.match(html,/id=\"saveMore\"/);assert.match(html,/id=\"shareService\"/);
assert.ok(!visible.includes('f_restore_test_20261028'));
const json=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
assert.ok(json.some(d=>d['@graph']?.some(n=>n['@type']==='WebPage'&&n.url===url)));
const graph=json.flatMap(d=>d['@graph']||[]);
assert.ok(graph.some(n=>n['@type']==='WebApplication'&&n.isAccessibleForFree===true));
const faq=graph.find(n=>n['@type']==='FAQPage');assert.equal(faq.mainEntity.length,8);
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for(const q of faq.mainEntity){assert.ok(decode(visible).includes(q.name));assert.ok(decode(visible).includes(q.acceptedAnswer.text));}
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 if(!m[1].includes('ld+json')&&!m[1].includes('src='))new vm.Script(m[2]);
}
for(const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']){
 const r=await get(`/${locale}/flight-map`);assert.equal(r.status,200,locale);const h=await r.text();
 const v=decode(h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,''));
 assert.equal((v.match(/<h1[ >]/g)||[]).length,1,locale);assert.ok(h.includes(`rel="canonical" href="https://airportsboard.live/${locale}/flight-map"`));
 for(const l of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])assert.ok(h.includes(`hrefLang="${l}" href="https://airportsboard.live/${l}/flight-map"`),locale+'/'+l);
 if(locale!=='ru')assert.doesNotMatch(v.replace(/<a[^>]*lang="ru"[^>]*>[\s\S]*?<\/a>/g,''),/[А-Яа-яЁё]/,locale+' leaked Russian');
 assert.doesNotMatch(v,/undefined|\{\{m\d+\}\}/);assert.ok(h.includes('rel="modulepreload" href="/flight-map/v6/runtime.js"'),locale+' runtime preload');assert.ok(h.includes(`href="/flight-map/v6/airports-${locale}.json"`),locale+' catalogue preload');assert.ok(v.includes(`lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"`));
 const graph=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).flatMap(d=>d['@graph']||[]);
 const f=graph.find(n=>n['@type']==='FAQPage');assert.equal(f.mainEntity.length,8,locale);assert.equal(f.inLanguage,locale);
 for(const q of f.mainEntity){assert.ok(v.includes(q.name),locale+' question');assert.ok(v.includes(q.acceptedAnswer.text),locale+' answer');}
 assert.equal((await get(`/flight-map/v4/airports-${locale}.json`)).status,200);
 const catalogue=await get(`/flight-map/v6/airports-${locale}.json`);assert.equal(catalogue.status,200);assert.match(catalogue.headers.get('cache-control'),/max-age=31536000.*immutable/);
 assert.ok(h.includes('data-flight-map-layout="true"'),locale+' pre-paint layout');
 const image=await get(`/images/flight-map-${locale}.jpg`);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/jpeg/);
}
for(const path of ['/flight-map/v6/runtime.js','/flight-map/v6/data.js','/flight-map/v6/map.js','/flight-map/v6/app.js','/flight-map/v6/geography.json','/flight-map/v5/runtime.js','/flight-map/v5/exporter.js','/flight-map/v5/app.js','/flight-map/v5/share.js','/flight-map/v5/state.js','/flight-map/v5/entry.js','/flight-map/v4/app.js','/flight-map/v4/entry.js','/flight-map/v4/journal.js','/flight-map/v4/share.js','/flight-map/v4/i18n.js','/flight-map/v4/storage.js','/flight-map/v4/sharing.js','/flight-map/v3/app.js','/flight-map/v3/journal.js','/flight-map/v3/gestures.js','/flight-map/v2/app.js','/flight-map/v2/map.js','/flight-map/v2/share.js','/flight-map/v2/storage.js','/flight-map/v2/jobs.js','/flight-map/v2/entry.js','/flight-map/v2/sharing.js','/flight-map/v1/land-v2.json','/flight-map/v1/flags/ru.svg','/flight-map/v1/flags/jp.svg','/flight-map/v1/app.js','/flight-map/v1/share.js','/flight-map/v1/airports.json','/flight-map/v1/land.json','/images/flight-map-demo.jpg']){
 const r=await get(path);assert.equal(r.status,200,path);
 if(path.startsWith('/flight-map/v6/'))assert.match(r.headers.get('cache-control'),/max-age=31536000.*immutable/,path);
 if(path.endsWith('.jpg')){assert.match(r.headers.get('content-type'),/image\/jpeg/);const b=new Uint8Array(await r.arrayBuffer());assert.equal(b[0],255);assert.equal(b[1],216);}
}
// Обычный переход на соседний раздел не должен включать стили карты в SSR.
for(const path of ['/ru','/ru/settings','/ru/favorites','/en']){
 const r=await get(path);assert.equal(r.status,200,path);const h=await r.text();
 assert.ok(!h.includes('.flight-map-root'),path+' scoped CSS leaked');
 assert.ok(!/rel="(?:preload|modulepreload)"[^>]*flight-map/.test(h),path+' map preload leaked');
 assert.ok(!h.includes('data-flight-map-layout'),path+' pre-paint script leaked');
 assert.ok(!/\/flight-map\/v[123456]\/app\.js/.test(h),path+' tool code leaked');
}
console.log('Flight map: SSR/SEO, inline JS, 12 localized pages/navigation/catalogues/OG images, compatible old and new assets and 4 adjacent pages OK');
