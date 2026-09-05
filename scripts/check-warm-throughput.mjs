// Успевает ли прогрев за собственным расписанием.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. 04.09.2026 план подняли до миллиона, и я уплотнил ярусы под
// него. Число до работающего процесса не доехало — рабочие переменные на VDS приходят из
// окружения pm2, а оно главнее .env.production, — и потолок остался прежним. tickBudget() сел
// на аварийный пол в 40 запросов: тик стал брать двадцать аэропортов вместо семисот.
//
// Снаружи это не проявлялось НИКАК. Ответы 200, страницы целые, борта на месте, все 37
// проверок зелёные — просто на каждой странице лежал борт одиннадцатичасовой давности вместо
// двухчасового. Двое суток. Нашлось случайно, при разборе совсем другого вопроса.
//
// Ни одна прежняя проверка этого поймать не могла:
//   · check-warm-demand смотрит только топ-25 по трафику и лишь на ДВУКРАТНУЮ просрочку;
//   · check-service-freshness меряет ПУСТОТУ борта, а не его возраст;
//   · check-live-refresh меряет живой путь, а он как раз работал.
//
// ЧТО МЕРЯЕТСЯ ЗДЕСЬ. Возраст борта по ярусам против их СОБСТВЕННЫХ нормативов, прочитанных из
// lib/warm.ts. Ярус mega — решающий: очередь ранжируется весами [6,3,1.5,1.2,1], то есть mega
// обслуживается первым при любом дефиците. Если просрочен ОН, значит бюджета не хватает даже на
// самое дорогое, и дело не в расписании, а в потолке. Прочие ярусы ловят широкое голодание.
//
// Провайдерских запросов НОЛЬ: страницы читаются под audit-bot, то есть из хранилища.
//
// Usage:  node scripts/check-warm-throughput.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'https://airportsboard.live';
/** Тик прогрева идёт раз в два часа; борт законно проводит часть цикла просроченным. */
const TICK_MIN = 120;
/** Во сколько раз медиана яруса может превысить норматив, прежде чем это систематический сбой. */
const MEGA_TOLERANCE = 2;
const TIER_TOLERANCE = 3;
/** Доля корпуса, которая обязана обновляться хотя бы раз в сутки. */
const DAILY_FLOOR = 0.9;
const PER_TIER = { mega: 26, hub: 26, major: 30, mid: 30, small: 30 };

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
const fmt = (v) => v == null ? '—' : v < 60 ? `${Math.round(v)} мин` : v < 1440 ? `${(v / 60).toFixed(1)} ч` : `${(v / 1440).toFixed(1)} дн`;

console.log(`успевает ли прогрев за расписанием (${BASE})\n`);

// ── Ярусы читаются ИЗ КОДА, а не дублируются здесь ───────────────────────────────────────
const SRC = fs.readFileSync('lib/warm.ts', 'utf8');
const TIERS = [...SRC.matchAll(/\{ name: '(\w+)', minFlights: (\d+), intervalMin: (\d+), skipNight: (\w+)/g)]
  .map((m) => ({ name: m[1], min: +m[2], interval: +m[3], night: m[4] === 'true' }));
say(TIERS.length === 5, `из lib/warm.ts прочитано ярусов: ${TIERS.length}`);
if (TIERS.length !== 5) process.exit(1);

const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports ?? {};
const serviced = Object.keys(svc).filter((c) => svc[c] > 0);
const tierOf = (n) => TIERS.find((t) => n >= t.min) ?? null;

const byTier = {};
for (const c of serviced) {
  const t = tierOf(svc[c]);
  if (t) (byTier[t.name] ??= []).push(c);
}

const AGE = /Обновлено\s+(?:(\d+)\s*мин|(\d+)\s*ч|(\d+)\s*дн)[^·]*назад/;

/** Снять возраст борта со страницы. Возраст ДАННЫХ, не ответа — ровно это видит читатель. */
async function ageOf(code) {
  try {
    const html = await (await fetch(`${BASE}/ru/airport/${code}`, { headers: { 'user-agent': 'audit-bot' } })).text();
    // Мерить по ВИДИМОМУ тексту: в RSC-нагрузке лежит весь каталог сообщений, и поиск по
    // всей странице отвечает «да» на любой вопрос (см. CLAUDE.md, ловушки замера).
    const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
    const m = AGE.exec(body);
    if (!m) return null;
    return m[1] ? +m[1] : m[2] ? +m[2] * 60 : +m[3] * 1440;
  } catch { return null; }
}

async function sample(codes, want) {
  const step = Math.max(1, Math.floor(codes.length / want));
  const pick = [];
  for (let i = 0; i < codes.length && pick.length < want; i += step) pick.push(codes[i]);
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: 10 }, async () => {
    while (i < pick.length) {
      const a = await ageOf(pick[i++]);
      if (a != null) out.push(a);
    }
  }));
  return out.sort((a, b) => a - b);
}

// ── 1. Ярусы укладываются в свои нормативы ───────────────────────────────────────────────
console.log('\n  ярус     n   норматив   медиана    в нормативе');
const medians = {};
for (const t of TIERS) {
  const ages = await sample(byTier[t.name] ?? [], PER_TIER[t.name] ?? 26);
  if (!ages.length) { console.log(`  ${t.name.padEnd(7)}   — нечего снять`); continue; }
  const med = ages[Math.floor(ages.length / 2)];
  medians[t.name] = med;
  const ok = ages.filter((a) => a <= t.interval).length;
  console.log(`  ${t.name.padEnd(7)} ${String(ages.length).padStart(3)}  ${String(t.interval / 60 + ' ч').padStart(8)}  ${fmt(med).padStart(8)}  ${String(Math.round(100 * ok / ages.length) + '%').padStart(11)}`);
}
console.log();

/**
 * MEGA — РЕШАЮЩИЙ. Очередь ранжируется min(просрочка,3) × вес яруса, у mega вес 6 против 1.5 у
 * major: при любом дефиците бюджета mega обслуживается первым. Значит просроченный mega means
 * бюджета не хватает даже на шестьдесят пять самых дорогих аэропортов — а это уже не про
 * расписание, это про потолок плана.
 */
const mega = medians.mega;
say(mega != null && mega <= TIERS[0].interval * MEGA_TOLERANCE,
  mega == null ? 'ярус mega не снят — проверка не выполнена'
    : mega <= TIERS[0].interval * MEGA_TOLERANCE
      ? `mega укладывается: медиана ${fmt(mega)} при нормативе ${TIERS[0].interval / 60} ч`
      : `MEGA ПРОСРОЧЕН: медиана ${fmt(mega)} при нормативе ${TIERS[0].interval / 60} ч. Он обслуживается ПЕРВЫМ`
        + ' при любом дефиците, значит упёрлись не в расписание, а в бюджет.\n'
        + '      Смотреть /api/airlabs-usage?token=CRON_TOKEN: поля cap, capSource, warm, human.\n'
        + '      Если capSource начинается с env: или bootstrap:, провайдер ещё не ответил либо\n'
        + '      потолок задан вручную и занижен.');

const wide = TIERS.filter((t) => medians[t.name] != null && medians[t.name] > t.interval * TIER_TOLERANCE);
say(wide.length === 0, wide.length
  ? `ярусы просрочены втрое и хуже: ${wide.map((t) => `${t.name} ${fmt(medians[t.name])} при ${t.interval / 60} ч`).join(', ')}`
  : `ни один ярус не просрочен втрое против своего норматива`);

// ── 2. Корпус целиком обновляется хотя бы раз в сутки ────────────────────────────────────
const corpus = await sample(serviced, 120);
const daily = corpus.filter((a) => a <= 1440).length / Math.max(1, corpus.length);
say(daily >= DAILY_FLOOR,
  `за сутки обновляется ${(100 * daily).toFixed(0)}% корпуса (порог ${(100 * DAILY_FLOOR).toFixed(0)}%), медиана ${fmt(corpus[Math.floor(corpus.length / 2)])}`);

// ── Справочно: во что обходится расписание и что тик успевает ────────────────────────────
// Число само по себе ничего не утверждает — оно нужно, чтобы при красном сторож сразу говорил,
// НАСКОЛЬКО не хватает, а не только что не хватает.
const perTickNeed = Math.round(TIERS.reduce((s, t) =>
  s + (byTier[t.name]?.length ?? 0) * ((t.night ? 20 : 24) * 60 / t.interval) / 12, 0));
const fresh = corpus.filter((a) => a < TICK_MIN).length / Math.max(1, corpus.length);
console.log(`\n  · расписанию нужно ${perTickNeed} аэропортов за тик; по свежести видно примерно ${Math.round(fresh * serviced.length)}`);
console.log(`  · ночное окно исключает часть ярусов (isLocalNight, 01:00–05:00 местного), поэтому оценка снизу`);

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nпрогрев успевает за своим расписанием');
process.exit(fails ? 1 : 0);
