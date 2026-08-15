// Совпадает ли расписание прогрева с тем, куда люди РЕАЛЬНО приходят.
//
// Ярусы в lib/warm.ts выбираются по числу рейсов, и это верное умолчание — но число рейсов
// лишь ПРОКСИ спроса, а там, где спрос измерен, он должен побеждать. Расхождение бывает
// огромным: у Казани 29 вылетов в сутки и 2 384 визита в месяц, у Дубая 573 вылета и 251
// визит. По ярусам Казань — «mid», прогрев раз в сутки; по спросу это первая страница сайта.
//
// Для этого и заведён DEMAND_PINNED: он режет норматив закреплённым до шести часов. Механизм
// работает — замер 16.08 показал, что цель ≤6 ч выполняется для 90.1% визитов. Но СПИСОК
// ПРОТУХАЕТ: он собран руками по замеру, спрос меняется каждый месяц, а протухание ничем не
// проявляется — страница просто тихо отдаёт вчерашний борт. Ровно так и оказались снаружи
// OSS, CXR, SSH и LBD: 423 визита в месяц на табло, где «все рейсы уже вылетели», а у LBD борт
// стоял ТРОЕ суток при суточном нормативе.
//
// Проверка сверяет три вещи:
//
//   1. Каждый аэропорт из топа по измеренному спросу либо закреплён, либо назван в
//      DEMAND_NOT_PINNED с причиной. Молчаливых пропусков быть не должно.
//   2. Оба списка не расходятся с реальностью: закреплённый аэропорт не может одновременно
//      стоять в списке исключений, а несуществующий код — ни в одном.
//   3. Боевые борта укладываются в свой ФАКТИЧЕСКИЙ норматив. Объявить цель и не достигать её
//      — то же протухание, только на другом уровне; замер прода единственный это ловит.
//
// Спрос берётся из Метрики (счётчик стоит только на русской локали — это и есть рынок сайта).
// Без токена проверка не падает, а честно пропускает то, что не может измерить: падение из-за
// отсутствия ключа быстро учит запускать её с --skip.
//
// Провайдерских запросов НОЛЬ: страницы читаются под audit-bot, то есть из хранилища.
//
// Usage:  node scripts/check-warm-demand.mjs [base]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.argv[2] || 'https://airportsboard.live';
/** Сколько аэропортов из хвоста спроса ещё считать «топом». */
const TOP_N = 25;
const PIN_TARGET_MIN = 360;

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`расписание прогрева против спроса (${BASE})\n`);

// ── Предикат берётся ИЗ КОДА, а не пишется заново ────────────────────────────────────────
const SRC = fs.readFileSync('lib/warm.ts', 'utf8');
const pinBlock = SRC.slice(SRC.indexOf('const DEMAND_PINNED'), SRC.indexOf('export const DEMAND_NOT_PINNED'));
const PINNED = new Set([...pinBlock.matchAll(/'([A-Z0-9]{3})'/g)].map((m) => m[1]));
const skipBlock = SRC.slice(SRC.indexOf('export const DEMAND_NOT_PINNED'), SRC.indexOf('const DEMAND_INTERVAL_MIN'));
const NOT_PINNED = Object.fromEntries([...skipBlock.matchAll(/^\s*([A-Z0-9]{3}):\s*'([^']*)'/gm)].map((m) => [m[1], m[2]]));
const TIERS = [...SRC.matchAll(/\{ name: '(\w+)', minFlights: (\d+), intervalMin: (\d+)/g)]
  .map((m) => ({ name: m[1], min: +m[2], interval: +m[3] }));

say(PINNED.size > 0 && TIERS.length === 5 && Object.keys(NOT_PINNED).length > 0,
  `из кода прочитано: закреплённых ${PINNED.size}, исключений ${Object.keys(NOT_PINNED).length}, ярусов ${TIERS.length}`);

const svcRaw = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8'));
const LEVEL = svcRaw.airports ?? svcRaw;
const tierOf = (n) => TIERS.find((t) => n >= t.min) ?? null;
const targetMin = (iata) => {
  const t = tierOf(LEVEL[iata] ?? 0);
  if (!t) return null;
  return PINNED.has(iata) ? Math.min(t.interval, PIN_TARGET_MIN) : t.interval;
};

// ── 2. Списки не противоречат друг другу и данным ────────────────────────────────────────
const both = Object.keys(NOT_PINNED).filter((c) => PINNED.has(c));
say(both.length === 0, both.length
  ? `коды сразу в обоих списках: ${both.join(', ')}`
  : 'ни один код не закреплён и исключён одновременно');
const ghosts = [...PINNED, ...Object.keys(NOT_PINNED)].filter((c) => !(c in LEVEL));
say(ghosts.length === 0, ghosts.length
  ? `коды, которых нет в замере обслуживания: ${ghosts.join(', ')}`
  : 'все коды обоих списков есть в data/airport-service.json');

// ── Спрос ────────────────────────────────────────────────────────────────────────────────
function envFile(name) {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), `.env.${name}`), 'utf8');
    return Object.fromEntries([...raw.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/gm)]
      .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]));
  } catch { return {}; }
}
const token = envFile('yandex-metrika').YANDEX_OAUTH_TOKEN;
let demand = [];
if (!token) {
  console.log('  · токена Метрики нет — сверка со спросом пропущена (это не провал)');
} else {
  const to = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const qs = new URLSearchParams({
    ids: '110112198', metrics: 'ym:s:visits', dimensions: 'ym:s:startURLPathLevel4',
    date1: from, date2: to, limit: '200', sort: '-ym:s:visits',
  });
  try {
    const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${qs}`, { headers: { Authorization: `OAuth ${token}` } });
    const json = await res.json();
    const agg = new Map();
    for (const row of json.data ?? []) {
      const code = /\/airport\/([A-Z0-9]{3})\/?$/.exec(row.dimensions[0]?.name ?? '')?.[1];
      if (code) agg.set(code, (agg.get(code) ?? 0) + (row.metrics[0] ?? 0));
    }
    demand = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N).map(([code, visits]) => ({ code, visits }));
  } catch (e) { console.log(`  · Метрика не ответила (${e.message}) — сверка пропущена`); }
}

// ── 1. Топ спроса не содержит молчаливых пропусков ───────────────────────────────────────
if (demand.length) {
  const totalVisits = demand.reduce((s, d) => s + d.visits, 0);
  const silent = demand.filter((d) => (targetMin(d.code) ?? 0) > PIN_TARGET_MIN && !(d.code in NOT_PINNED));
  const lostVisits = silent.reduce((s, d) => s + d.visits, 0);
  say(silent.length === 0, silent.length
    ? `в топ-${TOP_N} спроса норматив хуже ${PIN_TARGET_MIN / 60} ч и не объяснён у ${silent.length}: `
      + silent.map((d) => `${d.code} (${d.visits} виз, ${LEVEL[d.code] ?? 0} рейсов/сут, ${targetMin(d.code) / 60} ч)`).join(', ')
      + ` — это ${(100 * lostVisits / totalVisits).toFixed(1)}% визитов выборки`
    : `весь топ-${TOP_N} спроса либо закреплён, либо назван в DEMAND_NOT_PINNED с причиной`);

  const covered = demand.filter((d) => (targetMin(d.code) ?? 1e9) <= PIN_TARGET_MIN).reduce((s, d) => s + d.visits, 0);
  console.log(`     цель ≤${PIN_TARGET_MIN / 60} ч охватывает ${(100 * covered / totalVisits).toFixed(1)}% визитов выборки (${totalVisits} за 30 дней)`);

  // ── 3. Прод укладывается в объявленный норматив ────────────────────────────────────────
  const AGE = /Обновлено\s+(?:(\d+)\s*мин|(\d+)\s*ч|(\d+)\s*дн)[^·]*назад/;
  const late = [];
  await Promise.all(demand.map(async ({ code, visits }) => {
    try {
      const html = await (await fetch(`${BASE}/ru/airport/${code}`, { headers: { 'user-agent': 'audit-bot' } })).text();
      const t = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
        .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
      const m = AGE.exec(t);
      if (!m) return;
      const ageMin = m[1] ? +m[1] : m[2] ? +m[2] * 60 : +m[3] * 1440;
      const target = targetMin(code);
      // Порог ДВУКРАТНЫЙ, а не точный: тик прогрева идёт раз в два часа, и борт законно
      // проводит часть времени просроченным. Ловим систематическое отставание, не рябь.
      if (target && ageMin > target * 2) late.push({ code, visits, ageMin, target });
    } catch { /* страница не ответила — не предмет этой проверки */ }
  }));
  late.sort((a, b) => b.visits - a.visits);
  say(late.length === 0, late.length
    ? `борт вдвое просрочен у ${late.length}: ` + late.slice(0, 6).map((d) =>
        `${d.code} ${d.ageMin < 1440 ? Math.round(d.ageMin / 60) + ' ч' : Math.round(d.ageMin / 1440) + ' дн'} при норме ${d.target / 60} ч`).join(', ')
    : 'ни один борт из топа спроса не просрочен вдвое против своего норматива');
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nпрогрев смотрит туда же, куда приходят люди');
process.exit(fails ? 1 : 0);
