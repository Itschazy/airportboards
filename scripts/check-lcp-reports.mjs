// Проверяем экспорт DevTools Lighthouse, не запускаем браузер и не ходим на прод.
// Предыдущий стенд ошибочно принимал cursor-chat.png расширения за LCP сайта.
// Поэтому одного числа мало: требуем фактическое throttling, локальную фикстуру,
// мобильный viewport, один профиль во всей серии и проверенный LCP-текст сайта.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
assert.ok(files.length >= 3, 'Нужны минимум три JSON-отчёта одной сборки и фикстуры');
const samples = [];
let profile;
let target;
const captures = new Set();
for (const file of files) {
  const r = JSON.parse(readFileSync(file, 'utf8'));
  const s = r.configSettings;
  const url = new URL(r.finalDisplayedUrl || r.finalUrl);
  assert.equal(url.hostname, 'localhost', 'Замер только на локальной фикстуре');
  assert.equal(url.pathname, '/ru/airport/AYT', 'Этот сторож проверяет именно табло AYT');
  assert.ok(typeof r.fetchTime === 'string' && Number.isFinite(Date.parse(r.fetchTime)), 'Нужна дата прогона');
  assert.ok(!captures.has(r.fetchTime), 'Копия одного прогона не заменяет повторный замер');
  captures.add(r.fetchTime);
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
  // После изменения шапки крупнейший видимый текст — wordmark. Подтверждено
  // тремя JSON Lighthouse 05.11.2026 и снимком 412 px: .hdr-wordmark, airportsboard,
  // без ресурсов расширений. Старый селектор описания оставлен для сравнения с
  // предыдущими сборками. Любой другой элемент по-прежнему требует ручного разбора,
  // а смену кандидата внутри серии нельзя спрятать в общей медиане.
  const airportText = node?.selector.startsWith('main >') && node.nodeLabel.includes('(AYT)');
  const wordmark = node?.selector === 'header.site-header > div.hdr-row > a.hdr-pill > span.hdr-wordmark'
    && node.nodeLabel === 'airportsboard';
  assert.ok(airportText || wordmark, 'LCP должен быть проверенным текстом аэропорта или wordmark; иной элемент требует разбора');
  const candidate = JSON.stringify([node.selector, node.nodeLabel]);
  target ??= candidate;
  assert.equal(candidate, target, 'Кандидат LCP изменился внутри серии: требуется разбор');
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
