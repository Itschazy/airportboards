// Can a reader find an airport by the name this site just printed for them?
//
// That is the whole test, and it used to fail about half the time. The search index was built
// from the English source fields — code, city, country, name, plus a hand-built alias list —
// while every page renders the LOCALISED name. So the site would show "अरखांगेल्स्क", the reader
// would type "अरखांगेल्स्क", and get nothing. Measured on production, 60 served airports per
// locale, query = the exact string the site had displayed:
//
//     hi 53%   ko 48%   ja 40%   zh 38%   ar 38%   ru 13%   de 7%   (en 0%)
//
// The alias file hid this during casual checking: big hubs carry ~16 aliases each in every
// script, so KZN, LHR and DXB all worked and the failure only appeared on ordinary airports.
//
// Two things are asserted, because fixing recall by wrecking precision is not a fix:
//   1. RECALL — every localised name resolves to its own airport;
//   2. PRECISION — a well-known hub is still the FIRST result, not merely present.
//
// Runs against a server, so a build must be up. No provider calls: /api/airports/search reads
// local data only and never touches the paid airlabs endpoints.
//
// Usage:  node scripts/check-search-i18n.mjs [base-url]     (default http://localhost:3002)

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';
const SAMPLE_PER_LOCALE = 40;

const read = (f) => JSON.parse(fs.readFileSync(`data/${f}`, 'utf8'));
const cities = read('city-names.json');
const airportsRaw = read('airports.json');
const airports = airportsRaw.airports ?? airportsRaw;
const svcRaw = read('airport-service.json');
const levels = svcRaw.airports ?? svcRaw;

// Only airports with scheduled service: those are the ones people search for, and the ones
// whose pages carry a board.
const served = airports.filter((a) => Number(levels[a.iata]) > 0);
const step = Math.max(1, Math.floor(served.length / SAMPLE_PER_LOCALE));
const sample = served.filter((_, i) => i % step === 0).slice(0, SAMPLE_PER_LOCALE);

const LOCALES = ['ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'de', 'fr', 'es', 'it', 'tr'];

/** Hubs a reader is most likely to type, with the answer that must come FIRST. */
const PRECISION = [
  ['London', 'en', 'LHR'], ['Paris', 'en', 'CDG'], ['New York', 'en', 'JFK'],
  ['Москва', 'ru', 'SVO'], ['Лондон', 'ru', 'LHR'], ['Дубай', 'ru', 'DXB'],
  ['Frankfurt', 'de', 'FRA'], ['東京', 'ja', 'HND'], ['北京', 'zh', 'PEK'],
  ['서울', 'ko', 'ICN'], ['دبي', 'ar', 'DXB'], ['दिल्ली', 'hi', 'DEL'],
];

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

async function search(q, locale) {
  const url = `${BASE}/api/airports/search?q=${encodeURIComponent(q)}&locale=${locale}`;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'search-i18n-check' } });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.airports ?? d.results ?? []);
    return arr.map((x) => x.iata);
  } catch { return null; }
}

console.log(`выборка: ${sample.length} обслуживаемых аэропортов × ${LOCALES.length} локалей\n`);

// ── 1. Recall ────────────────────────────────────────────────────────────────────────────
for (const locale of LOCALES) {
  const cases = sample
    .map((a) => ({ iata: a.iata, q: cities[a.city]?.[locale] }))
    .filter((c) => c.q);
  if (!cases.length) { console.log(`  · ${locale}: нет локализованных имён в выборке`); continue; }

  const misses = [];
  for (const c of cases) {
    const codes = await search(c.q, locale);
    if (codes === null) { fail(`${locale}: сервер не отвечает — поднят ли он на ${BASE}?`); break; }
    if (!codes.includes(c.iata)) misses.push(`${c.q}→${c.iata}`);
  }
  misses.length
    ? fail(`${locale}: не находит ${misses.length} из ${cases.length} — ${misses.slice(0, 3).join(', ')}`)
    : pass(`${locale}: находит все ${cases.length}`);
}

// ── 2. Precision ─────────────────────────────────────────────────────────────────────────
console.log('');
for (const [q, locale, want] of PRECISION) {
  const codes = await search(q, locale);
  if (codes === null) { fail(`${locale} «${q}»: сервер не ответил`); continue; }
  codes[0] === want
    ? pass(`${locale} «${q}» → ${want} первым`)
    : fail(`${locale} «${q}»: ожидался ${want} первым, получено ${codes.slice(0, 3).join(' ') || 'пусто'}`);
}

// ── 3. Spelling variants a real keyboard produces ────────────────────────────────────────
//
// Recall above types the name back EXACTLY as the site printed it, which is the one thing a
// person never does. They add the vowel marks they were taught to write, or their keyboard
// emits a different-but-equivalent letter, or they append the word "airport" in their own
// script. Each of those went through a different code path, and two of them were broken:
//
//   - fold() in lib/airports.ts stripped U+0300–U+036F only — the LATIN combining block — so
//     "دُبي" with a damma returned nothing while "دبي" returned four airports;
//   - the "airport" words removed from a query were stored composed while the query had been
//     decomposed by the same fold, so 공항 never matched and Korean queries kept the suffix.
//
// Each case asserts against the plain form rather than a hardcoded list, so the test states
// the actual contract: writing it the other way must not change the answer.
console.log('');
const VARIANTS = [
  ['ar', 'دبي',        'دُبي',          'огласовка (дамма)'],
  ['ar', 'دبي',        'دبى',           'алиф максура вместо йа'],
  ['ar', 'دبي',        'مطار دُبي',      'слово «аэропорт» + огласовка'],
  ['ar', 'القاهرة',    'القاهره',       'та марбута → ха'],
  ['ar', 'اسطنبول',    'اســطنبول',      'татвиль (растяжка)'],
  ['ko', '서울',        '서울공항',        '+ 공항'],
  ['ko', '인천',        '인천국제공항',     '+ 국제공항'],
  ['ja', '東京',        '東京国際空港',     '+ 国際空港'],
  ['zh', '北京',        '北京首都国际机场',  '+ 国际机场'],
  ['hi', 'दिल्ली',      'दिल्ली हवाई अड्डा', '+ हवाई अड्डा'],
  ['de', 'Zurich',     'Z\u00FCrich',       'умляут (NFC, один символ)'],
  ['de', 'Zurich',     'Zu\u0308rich',      'умляут (NFD, буква + знак)'],
  ['ru', 'Москва',     'Мо\u0301сква',      'комбинирующее ударение'],
  ['tr', 'Istanbul',   'İstanbul',      'турецкая I с точкой'],
];
for (const [locale, plain, variant, what] of VARIANTS) {
  const base = await search(plain, locale);
  const got = await search(variant, locale);
  if (base === null || got === null) { fail(`${locale} «${variant}»: сервер не ответил`); continue; }
  if (!base.length) { fail(`${locale} «${plain}»: базовый запрос сам ничего не находит — тест бессмыслен`); continue; }
  got.includes(base[0])
    ? pass(`${locale} ${what}: «${variant}» → ${base[0]}, как и «${plain}»`)
    : fail(`${locale} ${what}: «${variant}» → ${got.slice(0, 3).join(' ') || 'ПУСТО'}, а «${plain}» → ${base[0]}`);
}

console.log(failures ? `\n${failures} проблем(ы) поиска` : '\nпоиск находит на всех языках');
process.exit(failures ? 1 : 0);
