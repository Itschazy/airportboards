// Регрессии из Вебмастера 23.10.2026: дубли справки/прилётов и города/страны.
// На стандартной фикстуре DME имеет timestamp, но ноль рейсов: это проверяет ночную
// стабильность robots, а не только счастливый случай с заполненным табло.
// Usage: node scripts/check-seo-metadata.mjs http://localhost:3099
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:3099';
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function read(path) {
  const r = await fetch(base + path, { headers: { 'user-agent': 'audit-bot' } });
  assert.equal(r.status, 200, path);
  const h = await r.text();
  const meta = name => decode(h.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] || '');
  const graph = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  return { title: decode(h.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''), description: meta('description'), robots: meta('robots'), web: graph.find(x => x['@type'] === 'WebPage'), h };
}
for (const file of fs.readdirSync('messages').filter(f => f.endsWith('.json'))) {
  const loc = file.slice(0, -5);
  const parent = await read(`/${loc}/airport/TKQ`);
  const arrivals = await read(`/${loc}/airport/TKQ/arrivals`);
  assert.notEqual(arrivals.title, parent.title, `${loc}: title справки и прилётов`);
  assert.notEqual(arrivals.description, parent.description, `${loc}: description справки и прилётов`);
  assert.equal(arrivals.web.description, arrivals.description, `${loc}: JSON-LD соответствует meta`);
  const dme = await read(`/${loc}/airport/DME/arrivals`);
  assert(!dme.robots.includes('noindex'), `${loc}: пустой DME сохраняет index`);
  assert(dme.h.includes('hrefLang="x-default"') || dme.h.includes('hreflang="x-default"'), `${loc}: DME сохраняет hreflang`);
  console.log(`✓ ${loc}: уникальная справка, согласованный JSON-LD, устойчивый DME`);
}
const city = await read('/ru/city/columbia');
const country = await read('/ru/airports/colombia');
assert.notEqual(city.title, country.title, 'Columbia/Colombia — разные сущности');
const closed = await read('/ru/airport/TXL/arrivals');
assert(closed.robots.includes('noindex'), 'закрытый аэропорт не открывается для индексации');
console.log('✓ город/страна различимы, закрытый аэропорт остаётся noindex');
