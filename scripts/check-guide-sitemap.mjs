// Узкий допуск справочных не должен включать прилёты, aliases, весь хвост
// или обходить robots. Выполняем настоящий цикл sitemap без сети и Airlabs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const demand = JSON.parse(fs.readFileSync('data/search-demand-guides.json', 'utf8'));
const locales = (
  [...fs.readFileSync('lib/i18n.ts', 'utf8').match(/export const locales = \[([^\]]+)\]/)[1].matchAll(/'([a-z]{2})'/g)].map(m => m[1])
);
assert.equal(locales.length, 12);
assert.deepEqual(Object.keys(demand), ['ORK', 'JER'], 'расширение списка требует проверки спроса и границ');
for (const [code, evidence] of Object.entries(demand)) {
  assert.match(code, /^[A-Z]{3}$/);
  assert.ok(evidence.length > 40);
  const base = JSON.parse(fs.readFileSync(`data/airport-guide/${code}.json`, 'utf8'));
  assert.equal(base.iata, code);
  assert.ok(base.blocks.length >= 3, 'список не предназначен для справки с одним фактом');
  const age = (Date.now() - Date.parse(base.checked + 'T00:00:00Z')) / 86400000;
  assert.ok(age >= 0 && age < 181, 'справочная должна пройти проверку свежести');
  for (const loc of locales) {
    const translated = loc === 'ru' ? base : JSON.parse(fs.readFileSync(`data/airport-guide/${loc}/${code}.json`, 'utf8'));
    if (base.about) assert.ok(translated.about?.trim(), `${loc}/${code}/about`);
    const blocks = loc === 'ru' ? Object.fromEntries(base.blocks.map(b => [b.id, b])) : translated.blocks;
    assert.deepEqual(Object.keys(blocks).sort(), base.blocks.map(b => b.id).sort());
    for (const block of Object.values(blocks)) for (const key of ['title', 'hint', 'text']) assert.ok(block[key]?.trim(), `${loc}/${code}/${key}`);
  }
}
const source = fs.readFileSync('app/sitemap.ts', 'utf8');
const start = source.indexOf('  for (const iata of slice) {');
const end = source.indexOf('\n  return entries;', start);
assert.ok(start > 0 && end > start);
const body = ts.transpileModule(source.slice(start, end), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext}}).outputText;
const execute = new Function('searchDemandGuides', 'isUnfillable', 'hasNoService', 'advertisedInSitemap', 'slice', 'locales', `
 const entries = [], HUBS = new Set(['LHR']), ARRIVALS_MIN_DAILY = 10;
 const serviceLevel = () => 35, boardStamp = () => undefined;
 const entry = path => locales.map(loc => '/' + loc + path);
 ${body}
 return entries;
`);
const run = (list, closed = () => false, noService = () => false, warm = c => c === 'LHR') => execute(list, closed, noService, warm, ['LHR', 'ORK', 'JER', 'GCI', 'ZZZ'], locales);
// На одинаковых данных новый список добавляет только JER, а ранее добавленный
// ORK остаётся на месте. Отдельно проверяем каждый справочный допуск против robots.
const before = run({ORK: demand.ORK}), after = run(demand);
assert.equal(before.length, 36);
assert.equal(after.length, 48);
assert.deepEqual(after.filter(u => !before.includes(u)), locales.map(l => `/${l}/airport/JER`));
assert.ok(before.every(u => after.includes(u)));
assert.equal(new Set(after).size, after.length);
for (const code of Object.keys(demand)) {
  const without = after.filter(u => !u.endsWith('/airport/' + code));
  assert.deepEqual(run(demand, c => c === code), without);
  assert.deepEqual(run(demand, () => false, c => c === code), without);
  const promoted = run(demand, () => false, () => false, c => c === 'LHR' || c === code);
  assert.equal(promoted.length, 60, `переход ${code} в обычный ярус не дублирует URL`);
  assert.equal(new Set(promoted).size, promoted.length);
  assert.ok(!after.some(u => u.endsWith(`/airport/${code}/arrivals`)));
}
assert.ok(!after.some(u => /\/departures$/.test(u)));
assert.ok(!after.some(u => /GCI|ZZZ/.test(u)));
console.log('PASS: +12 JER, ORK и прежние URL сохранены; отрицательные сценарии обоих справочных допусков, переход яруса без дублей; 12 полных переводов и about');
