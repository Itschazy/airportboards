// Принимает три независимых браузерных замера локального BCN на фикстуре.
// Сбор через локальный PerformanceObserver, не синтетическая оценка Android.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.equal(rows.length, 3);
for (const r of rows) {
  assert.equal(r.path, '/ru/airport/BCN');
  assert.equal(r.width, 375); assert.equal(r.scrollWidth, 375); assert.equal(r.rows, 30);
  assert.ok(r.statusSnapshots[0].rows[0].includes('По расписанию'));
  assert.ok(r.statusSnapshots.some(s => /Через \d+ мин/.test(s.rows[0])), 'отсчёт действительно включился');
  assert.ok(r.supported.includes('layout-shift'));
  assert.ok(Number.isFinite(r.cls) && r.cls >= 0);
}
const median=rows.map(r=>r.cls).sort((a,b)=>a-b)[1];
console.log('BCN countdown CLS median:',median);
assert.ok(median < 0.005, 'Смена спокойного статуса на отсчёт сдвигает первый экран');
console.log('PASS: исходная высота спокойной подписи сохранена');
