// Проверка записанного браузерного прогона именно этой синтетической фикстуры.
// Не запускает браузер и не измеряет Android: сбор замеров описан в RESULT.md.
// node check.mjs /absolute/measurements.json; старый CSS должен дать exit 1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const limits = {
  '/de/airport/BKK': 0.005,
  '/ru/airport/DXB/arrivals': 0.005,
  '/ru/airport/BCN': 0.025,
  '/en/airport/DOH/arrivals': 0.005,
};
assert.equal(rows.length, 12, 'три независимые загрузки на каждую из четырёх страниц');
const failures = [];
for (const [path, max] of Object.entries(limits)) {
  const group = rows.filter(r => r.path === path);
  assert.equal(group.length, 3, path);
  for (const r of group) {
    assert.equal(r.kind, 'loaded');
    assert.equal(r.width, 375);
    assert.equal(r.scrollWidth, 375);
    assert.equal(r.rows, 30);
    assert.ok(r.supported.includes('layout-shift'));
    assert.ok(Number.isFinite(r.cls) && r.cls >= 0);
    assert.ok(Number.isFinite(r.lcp?.time) && r.lcp.time > 0);
  }
  const median = group.map(r => r.cls).sort((a, b) => a-b)[1];
  if (median > max) failures.push(`${path}: CLS ${median.toFixed(5)} > ${max}`);
  else console.log(`PASS ${path}: CLS ${median.toFixed(5)}`);
}
assert.deepEqual(failures, [], 'Первый экран сдвигается при раскрытии content-visibility');
