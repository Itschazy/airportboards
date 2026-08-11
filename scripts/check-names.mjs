// Validate the localised place-name tables, and repair the mechanical defects.
//
// These three files are what every page shows a reader instead of an IATA code, in twelve
// languages: 61,395 city translations, 66,617 airport translations, 2,584 country translations.
// Nothing else in the repo checks them, and they were generated in bulk, so the defects are
// mechanical and repeat: a name emitted twice with the second copy in brackets, a Latin name
// left untranslated in a non-Latin script, stray whitespace.
//
// Two of the three classes are repaired here; the third is only reported, because "this name
// stayed in Latin" is sometimes correct — Anguilla's capital really is called The Valley, and
// inventing a Cyrillic spelling for it would be worse than leaving it.
//
// Usage:
//   npm run check:names          — report only, exits non-zero on repairable defects
//   node scripts/check-names.mjs --write   — repair what is unambiguous

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const FILES = {
  'city-names.json': 'города',
  'airport-names.json': 'аэропорты',
  'country-names.json': 'страны',
};

/** Locales whose names are expected NOT to be written in the Latin alphabet. */
const NON_LATIN = { ru: /[Ѐ-ӿ]/, zh: /[一-鿿]/, ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/ };

/**
 * "Bandirma（Bandirma）" — the same name repeated inside brackets.
 *
 * Both bracket families, because the CJK locales use the full-width pair: measured across the
 * corpus, 26 of the 40 occurrences are Chinese with （）, and a rule written for ASCII
 * parentheses alone would have found fourteen of them.
 */
const DUPE = /^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/;

let repairable = 0, repaired = 0;
const report = { dupe: [], latin: [], space: [], broken: [] };

for (const [file, label] of Object.entries(FILES)) {
  const p = path.join('data', file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;
  let entries = 0, translations = 0;
  const perLocale = {};

  for (const [key, locs] of Object.entries(data)) {
    if (!locs || typeof locs !== 'object') continue;
    entries++;
    for (const [loc, value] of Object.entries(locs)) {
      if (typeof value !== 'string') continue;
      translations++;
      perLocale[loc] = (perLocale[loc] || 0) + 1;

      // 1. Name repeated in brackets — unambiguous, repaired.
      const m = value.match(DUPE);
      if (m && m[1].trim() === m[2].trim()) {
        report.dupe.push(`${label} ${key}/${loc}: ${value} → ${m[1].trim()}`);
        repairable++;
        if (WRITE) { locs[loc] = m[1].trim(); changed = true; repaired++; }
        continue;
      }

      // 2. Leading/trailing whitespace — unambiguous, repaired.
      //
      // Deliberately NOT touching non-breaking spaces inside a name. Sixteen names carry U+00A0
      // or U+202F, and in "Mswati III" or "São José do Rio Preto" that is CORRECT typography —
      // it keeps a regnal number or a particle from being orphaned at a line break. It also
      // costs nothing in search: fold() in lib/show-city.ts strips everything that is not a
      // letter or digit, so U+00A0 and a plain space collapse to the same key. The first
      // version of this script normalised them, which would have damaged the typography to
      // fix a problem that does not exist.
      if (value !== value.trim() || /\s\s/.test(value)) {
        report.space.push(`${label} ${key}/${loc}: ${JSON.stringify(value)}`);
        repairable++;
        if (WRITE) { locs[loc] = value.replace(/\s{2,}/g, ' ').trim(); changed = true; repaired++; }
        continue;
      }

      // 3a. Битая индийская вязь — РЕМОНТУ НЕ ПОДЛЕЖИТ, только удаление.
      //
      // Знак гласной (matra) и вирама не могут начинать слово, а пробел не может стоять между
      // согласной и её знаком: «ुओगाडौगौ» — это Ouagadougou, потерявшая первую букву, «वाल् डो′र»
      // — Val d'Or, разорванный посреди слога. Браузер рисует такие строки испорченными глифами.
      // Достроить недостающую букву нельзя не угадывая, а угадывание однажды уже дало
      // «Берлевåg» и «कोंस्तानța», поэтому такие значения удаляются и имя откатывается на
      // английское — оно по крайней мере правдиво.
      if ((loc === 'hi' || loc === 'bn' || loc === 'mr') && /^[\u093E-\u094D\u0962\u0963]|\u094D\s|\s[\u093E-\u094D]/.test(value)) {
        report.broken.push(`${label} ${key}/${loc}: ${value}`);
        repairable++;
        if (WRITE) { delete locs[loc]; changed = true; repaired++; }
        continue;
      }

      // 3. Latin script where the locale writes in another — REPORTED ONLY.
      //    Not every case is a defect: some places have no established name in that language,
      //    and coining one would be worse than leaving the original. A human decides.
      const script = NON_LATIN[loc];
      if (script && !script.test(value) && /[A-Za-z]/.test(value)) {
        report.latin.push(`${label} ${key}/${loc}: ${value}`);
      }
    }
  }

  if (WRITE && changed) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
  }

  const missing = Object.entries(perLocale).sort((a, b) => a[1] - b[1]).slice(0, 3)
    .map(([l, n]) => `${l} ${entries - n}`).join(', ');
  console.log(`${label}: ${entries} записей, ${translations} переводов; хуже всего покрыты — ${missing}`);
}

// ── Coverage where it is actually seen ───────────────────────────────────────────────────
//
// A raw "N names missing" count is misleading: two thirds of the corpus is airfields nobody
// searches for, and a gap there costs nothing — the page falls back to the English name, which
// is true. What matters is a gap on an airport that HAS flights, because that is a page people
// open. Russian is the striking case: 75 airports have no Russian name and 42 of them are
// served, including Stockholm-Arlanda at 179 departures a day.
//
// Reported, never filled in by this script. These are proper nouns with established forms, and
// guessing at them is how the corpus acquired "Берлевåg" and "कोंस्तानța".
{
  const names = JSON.parse(fs.readFileSync(path.join('data', 'airport-names.json'), 'utf8'));
  const cityNames = JSON.parse(fs.readFileSync(path.join('data', 'city-names.json'), 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join('data', 'airports.json'), 'utf8'));
  const rows = raw.airports ?? raw;
  const svcRaw = JSON.parse(fs.readFileSync(path.join('data', 'airport-service.json'), 'utf8'));
  const levels = svcRaw.airports ?? svcRaw;

  const served = rows.filter((a) => Number(levels[a.iata]) > 0);
  const locales = ['ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'de', 'fr', 'es', 'it', 'tr'];

  console.log('\nпропуски на ОБСЛУЖИВАЕМЫХ аэропортах (их страницы люди открывают):');
  const worst = [];
  for (const loc of locales) {
    const gapsA = served.filter((a) => !names[a.iata]?.[loc]);
    const gapsC = [...new Set(served.map((a) => a.city).filter(Boolean))].filter((c) => !cityNames[c]?.[loc]);
    if (gapsA.length || gapsC.length) {
      console.log(`  ${loc}: ${gapsA.length} аэропортов, ${gapsC.length} городов`);
      // Rank by traffic, so the list starts with the ones that cost the most.
      const top = gapsA.sort((a, b) => Number(levels[b.iata]) - Number(levels[a.iata])).slice(0, 3);
      if (top.length) worst.push(`${loc}: ${top.map((a) => `${a.iata} (${levels[a.iata]}/сут)`).join(', ')}`);
    }
  }
  if (worst.length) {
    console.log('\n  самые заметные, по числу рейсов:');
    for (const w of worst) console.log(`    ${w}`);
  }
}

const show = (list, title, limit = 8) => {
  if (!list.length) return;
  console.log(`\n${title}: ${list.length}`);
  for (const line of list.slice(0, limit)) console.log(`  ${line}`);
  if (list.length > limit) console.log(`  … ещё ${list.length - limit}`);
};

show(report.dupe, WRITE ? 'исправлено — имя продублировано в скобках' : 'ИМЯ ПРОДУБЛИРОВАНО В СКОБКАХ');
show(report.space, WRITE ? 'исправлено — лишние пробелы' : 'ЛИШНИЕ ПРОБЕЛЫ');
// Non-breaking spaces are reported for awareness only; see the note above.
show(report.broken, WRITE ? 'удалено — битая вязь' : 'БИТАЯ ИНДИЙСКАЯ ВЯЗЬ (знак гласной в начале слова)');
show(report.latin, 'латиница в нелатинской локали (только отчёт, решает человек)', 10);

if (WRITE) {
  console.log(`\nисправлено записей: ${repaired}`);
  process.exit(0);
}
console.log(repairable
  ? `\n${repairable} механических дефекта — запусти: node scripts/check-names.mjs --write`
  : '\nмеханических дефектов нет');
process.exit(repairable ? 1 : 0);
