// Узкий допуск справочных не должен включать прилёты, aliases, весь хвост
// или обходить robots. Выполняем настоящий цикл sitemap без сети и Airlabs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const demand = JSON.parse(fs.readFileSync('data/search-demand-guides.json', 'utf8'));
const locales = JSON.parse(JSON.stringify(
  [...fs.readFileSync('lib/i18n.ts', 'utf8').match(/export const locales = \[([^\]]+)\]/)[1].matchAll(/'([a-z]{2})'/g)].map(m => m[1])
));
assert.equal(locales.length, 12);
assert.deepEqual(Object.keys(demand), ['ORK'], 'расширение списка требует проверки спроса и границ');
for (const [code, evidence] of Object.entries(demand)) {
  assert.match(code, /^[A-Z]{3}$/);
  assert.ok(evidence.length > 40);
  const base = JSON.parse(fs.readFileSync(`data/airport-guide/${code}.json`, 'utf8'));
  assert.equal(base.iata, code);
  assert.ok(base.blocks.length >= 3, 'список не предназначен для справки с одним фактом');
  const age = (Date.now() - Date.parse(base.checked + 'T00:00:00Z')) / 86400000;
  assert.ok(age >= 0 && age < 181, 'справочная должна пройти проверку свежести');
  for (const loc of locales) {
    const blocks = loc === 'ru' ? Object.fromEntries(base.blocks.map(b => [b.id, b]))
      : JSON.parse(fs.readFileSync(`data/airport-guide/${loc}/${code}.json`, 'utf8')).blocks;
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
const run = (list, closed = () => false, noService = () => false, warm = c => c === 'LHR') => execute(list, closed, noService, warm, ['LHR', 'ORK', 'GCI', 'ZZZ'], locales);
const before = run({}), after = run(demand);
assert.equal(before.length, 24);
assert.equal(after.length, 36);
assert.deepEqual(after.filter(u => !before.includes(u)), locales.map(l => `/${l}/airport/ORK`));
assert.ok(before.every(u => after.includes(u)));
assert.deepEqual(run(demand, c => c === 'ORK'), before);
assert.deepEqual(run(demand, () => false, c => c === 'ORK'), before);
assert.equal(run(demand, () => false, () => false, c => c === 'LHR' || c === 'ORK').length, 48, 'переход ORK в обычный ярус не дублирует URL');
assert.ok(!after.some(u => /\/arrivals$/.test(u) && u.includes('ORK')));
assert.ok(!after.some(u => /\/departures$/.test(u)));
assert.ok(!after.some(u => /GCI|ZZZ/.test(u)));
console.log('PASS: +12 ORK, прежние URL сохранены; закрытое/без рейсов/прилёты/aliases/хвост исключены; переход яруса без дублей; 12 полных переводов');
