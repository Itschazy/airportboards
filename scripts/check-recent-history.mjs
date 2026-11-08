// Execute the real component + React renderer; the hook adapter flushes its
// localStorage effect without a browser. UI verification remains separate.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
const source = fs.readFileSync(process.argv[2] || 'components/RecentlyViewed.tsx', 'utf8');
const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020}}).outputText;
function fixture(raw) {
  let state = [], effects = [], deps, stored = raw, parseCalls = 0, writes = 0;
  const context = {exports: {}, JSON: {parse(s) { parseCalls++; return JSON.parse(s); }},
    localStorage: {getItem() { if (stored instanceof Error) throw stored; return stored; }, setItem() { writes++; }, removeItem() { writes++; }},
    require(name) {
      if (name === 'react') return {useState: () => [state, v => {state = v;}], useEffect(fn, next) { if (!deps || next.some((v, i) => v !== deps[i])) {deps = next; effects.push(fn);} }};
      if (name === 'react/jsx-runtime') return {jsx, jsxs};
      if (name === 'next/link') return {default: ({href, children, ...props}) => React.createElement('a', {href, ...props}, children)};
      throw new Error(name);
    }};
  vm.runInNewContext(js, context);
  return {
    render(locale = 'en', exclude = 'DOH') {
      const props = {locale, exclude, title: 'Recent'};
      context.exports.RecentlyViewed(props);
      const pending = effects; effects = []; pending.forEach(fn => fn());
      return renderToStaticMarkup(context.exports.RecentlyViewed(props));
    },
    setRaw(value) {stored = value;},
    get parseCalls() {return parseCalls;}, get writes() {return writes;}, get stored() {return stored;},
  };
}
let count = 0;
const test = (label, fn) => {fn(); count++; console.log('PASS ' + label);};
const london = {iata: 'LHR', city: 'London'};
for (const bad of [null, 42, {}, {iata: 'DXB', city: {unexpected: 'object'}}, {iata: 'DXB', city: ['Dubai']}, {iata: 'DXB', city: 42}, {iata: '../api', city: 'Bad'}, {iata: 'dxb', city: 'Bad'}, {iata: 'DXB', city: 'x'.repeat(257)}]) {
  test('invalid row preserves valid legacy neighbour ' + JSON.stringify(bad).slice(0, 60), () => {
    const raw = JSON.stringify([bad, london]); const f = fixture(raw);
    const html = f.render(); assert.ok(html.includes('/en/airport/LHR')); assert.ok(html.includes('London'));
    assert.equal((html.match(/<a /g) || []).length, 1); assert.equal(f.writes, 0); assert.equal(f.stored, raw);
  });
}
for (const raw of [null, 'null', '{}', '42', 'invalid JSON', new Error('storage denied')]) test('unavailable/malformed history ' + String(raw), () => {
  const f = fixture(raw); assert.equal(f.render(), ''); assert.equal(f.writes, 0);
});
test('oversized history is not JSON-parsed', () => {const f = fixture(' '.repeat(16_385)); assert.equal(f.render(), ''); assert.equal(f.parseCalls, 0);});
test('five unique entries, exclude current, preserve order', () => {
  const f = fixture(JSON.stringify([{iata: 'DOH', city: 'Doha'}, london, {...london, city: 'Duplicate'}, ...['DXB','AYT','CEK','JFK','SVO','KZN'].map(iata => ({iata, city: iata}))]));
  const html = f.render(); assert.deepEqual([...html.matchAll(/href="\/en\/airport\/([A-Z]{3})"/g)].map(m => m[1]), ['LHR','DXB','AYT','CEK','JFK']);
});
test('changed page clears stale state when storage is invalid', () => {
  const f = fixture(JSON.stringify([london])); assert.ok(f.render().includes('London'));
  f.setRaw('{}'); assert.equal(f.render('en', 'AYT'), '');
});
for (const locale of ['ru','en','de','fr','es','it','tr','zh','ja','ko','ar','hi']) test('safe link on ' + locale, () => {
  const f = fixture(JSON.stringify([{iata:'DXB',city:'<img onerror=alert(1)>'},london])); const html=f.render(locale);
  assert.ok(html.includes(`/${locale}/airport/LHR`)); assert.ok(html.includes('&lt;img')); assert.ok(!html.includes('<img')); assert.equal(f.writes,0);
});
console.log(`${count} scenarios passed`);
