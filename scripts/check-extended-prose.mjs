// Execute the real readers against the corpus: legacy generated prose must obey
// the same locale boundary in both loaders, while verified tables remain intact.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

function load(file, dependencies) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, { exports, process, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return exports;
}
const policy = load('lib/airport-content.ts', {
  fs, path, '@/lib/airport-guide': { getAirportGuide: () => null },
});
const { getAirportContentExtended: get } = load('lib/airport-content-extended.ts', {
  fs, path, '@/lib/airport-content': policy,
});
const locales = fs.readdirSync('messages').filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
assert.equal(locales.length, 12);
assert.equal(get('NTE', 'en'), null, 'NTE has no verified table: generated English advice must not render');
assert.equal(get('AGP', 'xx'), null, 'a missing translation must not borrow English tables or prose');
assert.equal(get('INVALID', 'ru'), null);
let checked = 0, tables = 0;
for (const file of fs.readdirSync('data/airport-content-extended').filter(f => f.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join('data/airport-content-extended', file), 'utf8'));
  for (const locale of locales) {
    const source = data[locale];
    const actual = get(file.slice(0, -5).toLowerCase(), locale);
    if (!source) { assert.equal(actual, null); continue; }
    const expectedProse = Object.fromEntries(['transport', 'terminals', 'tips'].map(key => [key,
      locale === 'ru' ? (source[key] || '').trim() : '',
    ]));
    const guide = source.guide;
    const hasTable = (guide?.transfers?.length || 0) + (guide?.transit?.length || 0) > 0;
    if (hasTable) {
      assert.deepEqual(JSON.parse(JSON.stringify(actual?.guide)), {
        transfers: guide.transfers || [], transit: guide.transit || [], asOf: guide.asOf || '',
      }, `${file}/${locale}: verified facts changed`);
      tables++;
    }
    if (!hasTable && !Object.values(expectedProse).some(Boolean)) assert.equal(actual, null, `${file}/${locale}`);
    else for (const [key, value] of Object.entries(expectedProse)) assert.equal(actual[key], value, `${file}/${locale}/${key}`);
    checked++;
  }
}
console.log(`PASS: ${checked} airport/locale cases; ${tables} verified tables preserved; Russian prose unchanged; no English fallback.`);
