// Помогла ли справочная по аэропорту — замер «до/после» с контрольной группой.
//
// 25.10.2026 справочная (data/airport-guide) появилась у десятков страниц сразу. Сравнивать их
// визиты «до» и «после» в лоб нельзя: сезон (курорты к ноябрю падают, Казань и Уфа — нет) сдвинет
// цифры сильнее любой правки. Поэтому рядом всегда меряется контрольная группа — аэропорты из
// топа поискового спроса, у которых справочной НЕТ, — и смотрится разница изменений, а не
// изменение одной группы.
//
// Источник — Метрика 110112198, только органика (как в scripts/seo-priority.mjs: ферма ботов
// приходит «прямыми заходами»), посадочная /ru/airport/XXX.
//
// Usage:
//   node ops/guide-effect/measure.mjs baseline   → ops/guide-effect/baseline-2026-10-25.json (28 дней до 25.10)
//   node ops/guide-effect/measure.mjs compare    → те же группы за 28 дней с 26.10, разница изменений
// Сравнивать не раньше 23.11.2026, когда наберутся полные 28 дней «после».

import fs from 'node:fs';
import path from 'node:path';
import { readEnvFile } from '../../scripts/seo-priority.mjs';

const DIR = 'ops/guide-effect';
const BASE_FILE = path.join(DIR, 'baseline-2026-10-25.json');
const LAUNCH = '2026-10-25';
const DAYS = 28;
const mode = process.argv[2];

const iso = (t) => new Date(t).toISOString().slice(0, 10);
const day = 86400_000;

async function visitsByAirport(date1, date2) {
  const token = readEnvFile('yandex-metrika').YANDEX_OAUTH_TOKEN;
  if (!token) throw new Error('нет YANDEX_OAUTH_TOKEN в ~/.env.yandex-metrika');
  const qs = new URLSearchParams({
    ids: '110112198', metrics: 'ym:s:visits', dimensions: 'ym:s:startURLPathLevel4',
    date1, date2, limit: '1000', sort: '-ym:s:visits',
    filters: "ym:s:lastTrafficSource=='organic'",
  });
  const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${qs}`, { headers: { Authorization: `OAuth ${token}` } });
  if (!res.ok) throw new Error(`Метрика: HTTP ${res.status}`);
  const out = {};
  for (const row of (await res.json()).data ?? []) {
    const name = row.dimensions[0]?.name ?? ''; const code = /\/ru\/airport\/([A-Z0-9]{3})\/?$/.exec(name)?.[1];
    if (code) out[code] = (out[code] ?? 0) + (row.metrics[0] ?? 0);
  }
  return out;
}

const guides = fs.readdirSync('data/airport-guide').filter((f) => /^[A-Z]{3}\.json$/.test(f)).map((f) => f.slice(0, 3)).sort();
const sum = (m, codes) => codes.reduce((s, c) => s + (m[c] ?? 0), 0);

if (mode === 'baseline') {
  const to = iso(Date.parse(LAUNCH) - day), from = iso(Date.parse(LAUNCH) - DAYS * day);
  const v = await visitsByAirport(from, to);
  // Контроль — 40 самых посещаемых аэропортов БЕЗ справочной: сопоставимый спрос, тот же сезон.
  const control = Object.entries(v).filter(([c]) => !guides.includes(c)).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([c]) => c);
  const base = { window: { from, to }, launched: LAUNCH, guide: guides, control, visits: v,
    totals: { guide: sum(v, guides), control: sum(v, control) } };
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(BASE_FILE, JSON.stringify(base, null, 1) + '\n');
  console.log(`база ${from}…${to}: со справочной ${guides.length} аэропортов, ${base.totals.guide} визитов; контроль ${control.length}, ${base.totals.control}`);
} else if (mode === 'compare') {
  const base = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
  const from = iso(Date.parse(LAUNCH) + day), to = iso(Math.min(Date.parse(LAUNCH) + DAYS * day, Date.now() - day));
  const v = await visitsByAirport(from, to);
  const g0 = sum(base.visits, base.guide), g1 = sum(v, base.guide);
  const c0 = sum(base.visits, base.control), c1 = sum(v, base.control);
  const ch = (a, b) => (a ? (100 * (b - a)) / a : 0);
  console.log(`после ${from}…${to}${to < iso(Date.parse(LAUNCH) + DAYS * day) ? ' (окно ещё не полное!)' : ''}`);
  console.log(`  со справочной: ${g0} → ${g1} (${ch(g0, g1).toFixed(1)}%)`);
  console.log(`  контроль:      ${c0} → ${c1} (${ch(c0, c1).toFixed(1)}%)`);
  console.log(`  разница изменений: ${(ch(g0, g1) - ch(c0, c1)).toFixed(1)} п.п. — без сезона, но не без шума; одна пара окон — не доказательство`);
} else {
  console.error('usage: measure.mjs baseline|compare');
  process.exit(1);
}
