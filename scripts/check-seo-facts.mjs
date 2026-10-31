// Полнота Airport в отдельной странице прилётов и правдивый FAQ о свежести.
// Запуск: node scripts/check-seo-facts.mjs http://localhost:3099
// Только audit-bot, без API рейсов. Холодный сценарий проверять на фикстуре.
import fs from 'node:fs';
import assert from 'node:assert/strict';
// Формы имени берутся ИЗ КОДА, а не подставляются руками.
//
// 🔴 31.10.2026. Ожидаемый ответ собирался заменой {name} и {iata} в шаблоне, и этого
// хватало, пока во французском стояло «de {name}». Элизия обязательна и перед именами
// собственными («le tableau d’Antalya»), поэтому предлог приезжает готовым в {deName} —
// и наивная подстановка перестала совпадать с отрисованной страницей. Проверка обязана
// повторять предикат кода, а не изобретать свой: берём ту же функцию, что и страница.
const { deName } = await import('data:text/javascript;base64,' + Buffer.from(
  fs.readFileSync('lib/fr-elision.ts', 'utf8').replaceAll(': string', ''),
).toString('base64'));
const base = process.argv[2] || 'http://localhost:3099';
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function read(p) {
  const res = await fetch(base + p, {headers: {'user-agent': 'audit-bot'}});
  assert.equal(res.status, 200, p);
  const html = await res.text();
  const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  const visible = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ''));
  return {graph, visible};
}
const files = fs.readdirSync('messages').filter(f => f.endsWith('.json'));
const keys = (o,p='') => Object.entries(o).flatMap(([k,v])=>v && typeof v==='object' ? keys(v,p+k+'.') : [p+k]).sort();
let expected;
for (const file of files) {
  const locale = file.replace('.json','');
  const messages = JSON.parse(fs.readFileSync('messages/'+file));
  const signature = JSON.stringify(keys(messages)); expected ??= signature; assert.equal(signature,expected);
  const parent = await read(`/${locale}/airport/AYT`);
  const arrivals = await read(`/${locale}/airport/AYT/arrivals`);
  const airport = parent.graph.find(s=>s['@type']==='Airport');
  assert.deepEqual(arrivals.graph.find(s=>s['@type']==='Airport'), airport, locale+': общая сущность');
  assert.equal(airport.iataCode,'AYT'); assert.equal(airport.address.addressCountry,'TR');
  assert.equal(airport.url, `https://airportsboard.live/${locale}/airport/AYT`);
  assert.equal(airport['@id'], 'https://airportsboard.live/en/airport/AYT#airport');
  assert.ok(airport.sameAs.some(s=>s.includes('wikidata.org')));
  for (const page of [parent,arrivals]) {
    assert.equal(page.graph.find(s=>s['@type']==='WebPage').mainEntity['@id'],airport['@id']);
    const faq = page.graph.find(s=>s['@type']==='FAQPage').mainEntity;
    const answer = messages.home.faq_live_a
      .replaceAll('{deName}',deName(airport.name,locale))
      .replaceAll('{name}',airport.name).replaceAll('{iata}','AYT');
    assert.ok(answer.includes('10'),locale+': порог');
    assert.ok(faq.some(q=>q.acceptedAnswer.text===answer),locale+': JSON-LD FAQ');
    assert.ok(page.visible.includes(answer),locale+': тот же ответ в видимом HTML');
  }
  console.log(`PASS ${locale}: Airport, общий @id, FAQ совпадает с HTML`);
}
assert.equal(files.length,12);
const cold = await read('/ru/airport/DME/arrivals');
if (new URL(base).hostname === 'localhost') {
  assert.ok(!cold.graph.find(s=>s['@type']==='FAQPage').mainEntity.some(q=>q.acceptedAnswer.text.includes('10 минут')), 'На пустой фикстуре нет обещания live-табло');
}
console.log('PASS 12 locales; structured and visible facts agree');
