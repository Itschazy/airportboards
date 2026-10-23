// Проверяем экспорт DevTools Lighthouse, не запускаем браузер и не ходим на прод.
// Предыдущий стенд ошибочно принимал cursor-chat.png расширения за LCP сайта.
// Поэтому одного числа мало: требуем фактическое throttling, локальную фикстуру,
// мобильный viewport, один профиль во всей серии и LCP-текст самого табло.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
assert.ok(files.length >= 3, 'Нужны минимум три JSON-отчёта одной сборки и фикстуры');
const samples = [];
let profile;
for (const file of files) {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const s = r.configSettings;
  const url = new URL(r.finalDisplayedUrl || r.finalUrl);
  assert.equal(url.hostname, 'localhost', 'Замер только на локальной фикстуре');
  assert.equal(s.throttlingMethod, 'devtools', 'Не смешивать расчётную модель и реальные тайминги');
  assert.equal(s.formFactor, 'mobile');
  assert.ok(s.screenEmulation.width <= 440 && s.throttling.cpuSlowdownMultiplier >= 4);
  assert.equal(r.runtimeError, undefined);
  assert.equal(r.runWarnings.length, 0, 'Предупреждения Lighthouse требуют ручного разбора');
  const signature = JSON.stringify([r.lighthouseVersion, url.href, s.throttling, s.screenEmulation]);
  profile ??= signature;
  assert.equal(signature, profile, 'Профиль и URL должны совпадать');
  const a = r.audits;
  const node = a['lcp-breakdown-insight'].details.items.find(x => x.type === 'node');
  assert.ok(node && node.selector.startsWith('main >') && node.nodeLabel.includes('(AYT)'),
    'LCP должен быть текстом аэропорта; иной элемент требует разбора');
  const requests = a['network-requests'].details.items;
  assert.ok(!requests.some(x => /extension:/.test(x.url)), 'В замер попало расширение');
  const fcp = a['first-contentful-paint'].numericValue;
  const lcp = a['largest-contentful-paint'].numericValue;
  const tbt = a['total-blocking-time'].numericValue;
  assert.ok(lcp <= 2500 && fcp <= 1800 && tbt <= 300,
    `Регрессия первого экрана: FCP=${fcp}, LCP=${lcp}, TBT=${tbt}`);
  samples.push({ fcp, lcp, tbt });
  console.log(`PASS ${file}: FCP=${Math.round(fcp)}, LCP=${Math.round(lcp)}, TBT=${Math.round(tbt)} ms; ${node.nodeLabel}`);
}
const median = key => samples.map(x => x[key]).sort((a,b) => a-b)[Math.floor(samples.length / 2)];
console.log(`Медианы: FCP=${Math.round(median('fcp'))}, LCP=${Math.round(median('lcp'))}, TBT=${Math.round(median('tbt'))} ms. Это лабораторный профиль, не полевая скорость.`);
