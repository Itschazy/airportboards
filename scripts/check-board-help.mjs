// 29.10.2026: проверяем ответы на реальные запросы и видимый текст, а не только
// наличие новых ключей. Пустое табло должно объяснять отсутствие рейса; закрытый
// аэропорт не должен предлагать искать завтрашний рейс или терминал.
// Только SSR GET с audit-bot; никаких API рейсов и покупок данных.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://localhost:3119';
const topics = ['missing', 'tomorrow', 'terminal'];
const decode = s => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function page(path) {
  const response = await fetch(base + path, {headers: {'user-agent': 'audit-bot'}});
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1]));
  const faqs = schemas.filter(s => s['@type'] === 'FAQPage');
  assert.equal(faqs.length, 1, path + ': ровно одна FAQPage');
  const faq = faqs[0].mainEntity;
  assert.equal(new Set(faq.map(f => f.name)).size, faq.length, path + ': нет дублей вопросов');
  const visible = decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ''));
  return {faq, visible};
}
const locales = fs.readdirSync('messages').filter(f => f.endsWith('.json'));
assert.equal(locales.length, 12);
let signature;
const keys = (o, prefix = '') => Object.entries(o).flatMap(([k,v]) => typeof v === 'object' ? keys(v,prefix+k+'.') : prefix+k).sort();
for (const file of locales) {
  const locale = file.slice(0,-5), messages = JSON.parse(fs.readFileSync('messages/'+file));
  const actual = JSON.stringify(keys(messages)); signature ??= actual; assert.equal(actual,signature);
  for (const suffix of ['', '/arrivals']) {
    const {faq,visible} = await page(`/${locale}/airport/AYT${suffix}`);
    for (const topic of topics) {
      const q = messages.home[`faq_${topic}_q`].replace('{iata}', 'AYT');
      const a = messages.home[`faq_${topic}_a`];
      assert.equal(faq.filter(f => f.name === q && f.acceptedAnswer.text === a).length, 1, locale+' '+topic);
      assert.ok(visible.includes(q) && visible.includes(a), locale+': ответ совпадает с видимым HTML');
    }
  }
  console.log('PASS',locale,': 6 пар FAQ/HTML, ключи совпадают');
}
const ru = JSON.parse(fs.readFileSync('messages/ru.json')).home;
for (const [iata,expected] of [['DME',true],['TXL',false],['LBG',false]]) {
  const {faq} = await page(`/ru/airport/${iata}`);
  for (const topic of topics) assert.equal(faq.some(f => f.name === ru[`faq_${topic}_q`].replace('{iata}',iata)), expected, iata+': уместность помощи');
}
console.log('PASS пустое, закрытое табло и аэропорт без регулярных рейсов');
