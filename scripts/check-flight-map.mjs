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
assert.match(html,/<meta property="og:image" content="https:\/\/airportsboard.live\/images\/flight-map-demo.jpg"/);
assert.match(visible,/<a[^>]+href="\/ru\/flight-map"/);
assert.ok(!visible.includes('my-flights-prototype'));
assert.ok(!visible.includes('f_restore_test_20261028'));
const json=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
assert.ok(json.some(d=>d['@graph']?.some(n=>n['@type']==='WebPage'&&n.url===url)));
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 if(!m[1].includes('ld+json')&&!m[1].includes('src='))new vm.Script(m[2]);
}
for(const locale of ['en','de','fr','es','it','tr','zh','ja','ko','ar','hi'])assert.equal((await get(`/${locale}/flight-map`)).status,404,locale);
for(const path of ['/flight-map/v1/app.js','/flight-map/v1/map.js','/flight-map/v1/share.js','/flight-map/v1/storage.js','/flight-map/v1/airports.json','/flight-map/v1/land.json','/images/flight-map-demo.jpg']){
 const r=await get(path);assert.equal(r.status,200,path);
 if(path.endsWith('.jpg')){assert.match(r.headers.get('content-type'),/image\/jpeg/);const b=new Uint8Array(await r.arrayBuffer());assert.equal(b[0],255);assert.equal(b[1],216);}
}
// Обычный переход на соседний раздел не должен включать стили карты в SSR.
for(const path of ['/ru','/ru/settings','/ru/favorites','/en']){
 const r=await get(path);assert.equal(r.status,200,path);const h=await r.text();
 assert.ok(!h.includes('.flight-map-root'),path+' scoped CSS leaked');
 assert.ok(!h.includes('/flight-map/v1/app.js'),path+' tool code leaked');
}
console.log('Flight map: SSR/SEO, inline JS, RU navigation, 11 honest 404s, 7 assets and 4 adjacent pages OK');
