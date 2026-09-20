// Тратится ли оплаченный план целиком — и не просит ли расписание больше, чем может получить.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. Недобор плана не проявляется НИКАК: сайт отвечает 200, борта
// на месте, просто чуть старее, чем могли бы быть, а деньги за неиспользованные запросы уже
// уплачены. Так прожили весь август и половину сентября: расписание стоило 556 470 в месяц
// при оплаченном миллионе, людской путь брал 27 000, и 40% плана не тратил никто.
//
// Обратная крайность так же тиха и куда вреднее: если расписание просит БОЛЬШЕ доли прогрева,
// система встаёт в режим постоянного дефицита, а там веса очереди [6,3,1.5,1.2,1] режут с
// хвоста — младший ярус (1 765 аэропортов, 63% обслуживаемых) начинает голодать первым.
//
// Поэтому проверяется коридор, а не «чем больше, тем лучше», и отдельно — пропускная
// способность: спрос, который тики физически не успевают обслужить, это тот же дефицит,
// только замаскированный.
//
// Все числа берутся из тех же файлов, что читает прод: TIERS из lib/warm.ts, доля резерва и
// план из .env.production. Ни сети, ни квоты.
//
// Usage:  node scripts/check-plan-utilisation.mjs

import fs from 'node:fs';

/** Замер 20.09.2026: полный обход 2 001 аэропорта занял 808 с — 0.40 с на аэропорт
 *  (два обращения к поставщику плюс пауза 120 мс между аэропортами). */
const SEC_PER_AIRPORT = 0.4;
/** Дедлайн одного тика, lib/flights.ts TICK_DEADLINE_MS. */
const TICK_DEADLINE_SEC = 420;
/** Ниже этой доли плана деньги простаивают, выше — расписание не помещается в долю. */
const FLOOR = 0.8;
/** Запас пропускной способности: тик не должен упираться в дедлайн вплотную. */
const THROUGHPUT_HEADROOM = 0.85;

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
const n = (x) => Math.round(x).toLocaleString('ru-RU');

const SRC = fs.readFileSync('lib/warm.ts', 'utf8');
const ENV = fs.readFileSync('.env.production', 'utf8');
const SVC = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports ?? {};

const tiers = [...SRC.matchAll(/\{ name: '(\w+)', minFlights: (\d+), intervalMin: (\d+), skipNight: (\w+)/g)]
  .map((m) => ({ name: m[1], min: +m[2], interval: +m[3], night: m[4] === 'true' }));
say(tiers.length === 5, `ярусов прочитано из lib/warm.ts: ${tiers.length}`);
if (tiers.length !== 5) process.exit(1);

const num = (re, dflt) => { const m = re.exec(ENV); return m ? Number(m[1]) : dflt; };
const cap = num(/^AIRLABS_MONTHLY_CAP=(\d+)/m, 0);
const pct = num(/^AIRLABS_HUMAN_RESERVE_PCT=(\d+)/m, 35);
const runsPerDay = num(/^WARM_RUNS_PER_DAY=(\d+)/m, 12);
say(cap > 0, cap ? `план из .env.production: ${n(cap)}` : 'AIRLABS_MONTHLY_CAP не задан');

// ── Спрос расписания ─────────────────────────────────────────────────────────────────────
const tierOf = (f) => tiers.find((t) => f >= t.min) ?? null;
const counts = Object.fromEntries(tiers.map((t) => [t.name, 0]));
for (const code of Object.keys(SVC)) {
  const t = tierOf(SVC[code]);
  if (SVC[code] > 0 && t) counts[t.name]++;
}
let reqPerDay = 0, airportsPerDay = 0;
console.log('\n  ярус     аэропортов  интервал    запросов/сутки');
for (const t of tiers) {
  const perDay = counts[t.name] * (1440 / t.interval) * (t.night ? 5 / 6 : 1);
  airportsPerDay += perDay;
  reqPerDay += perDay * 2;
  console.log(`  ${t.name.padEnd(7)} ${String(counts[t.name]).padStart(9)}  ${String(t.interval / 60 + ' ч').padStart(7)}  ${n(perDay * 2).padStart(15)}`);
}
const demand = reqPerDay * 30;
const warmShare = Math.round(cap * (1 - pct / 100));
console.log(`\n  спрос расписания: ${n(demand)}/мес · доля прогрева: ${n(warmShare)} (резерв людям ${pct}%)\n`);

// ── 1. Коридор: план тратится, но не переливается ────────────────────────────────────────
const ratio = demand / warmShare;
say(ratio >= FLOOR,
  ratio >= FLOOR
    ? `расписание выбирает ${Math.round(ratio * 100)}% доли прогрева`
    : `НЕДОБОР: расписание просит лишь ${Math.round(ratio * 100)}% доли (${n(warmShare - demand)} оплаченных запросов в месяц не потратит никто) — уплотнять интервалы в lib/warm.ts`);
say(ratio <= 1,
  ratio <= 1
    ? `спрос помещается в долю прогрева, запас ${n(warmShare - demand)}`
    : `ПЕРЕБОР: спрос на ${n(demand - warmShare)} больше доли — очередь встанет в постоянный дефицит, и веса срежут младший ярус`);

// ── 2. Пропускная способность тиков ──────────────────────────────────────────────────────
const perTickCapacity = Math.floor((TICK_DEADLINE_SEC / SEC_PER_AIRPORT) * THROUGHPUT_HEADROOM);
const needPerTick = Math.ceil(airportsPerDay / runsPerDay);
say(needPerTick <= perTickCapacity,
  needPerTick <= perTickCapacity
    ? `тик успевает: нужно ${n(needPerTick)} аэропортов, успевает до ${n(perTickCapacity)} при ${runsPerDay} тиках в сутки`
    : `НЕ УСПЕВАЕТ: нужно ${n(needPerTick)} аэропортов за тик, а за дедлайн ${TICK_DEADLINE_SEC} с проходит ${n(perTickCapacity)} — увеличить WARM_RUNS_PER_DAY и крон-строку на боксе`);

// ── 3. Частоту тиков задаёт вызывающий, а не догадка кода ────────────────────────────────
const ROUTE = fs.readFileSync('app/api/cron/warm/route.ts', 'utf8');
say(/searchParams\.get\('runsPerDay'\)/.test(ROUTE) && /asked <= 48/.test(ROUTE),
  /searchParams\.get\('runsPerDay'\)/.test(ROUTE) && /asked <= 48/.test(ROUTE)
    ? 'частота тиков приходит от вызывающего и ограничена диапазоном'
    : 'маршрут не принимает runsPerDay от вызывающего — крон и код снова смогут разойтись молча');

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nплан выбирается целиком и помещается в пропускную способность');
process.exit(fails ? 1 : 0);
