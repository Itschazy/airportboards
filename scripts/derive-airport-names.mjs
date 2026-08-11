// Fill airport-name gaps that can be DERIVED, and only those.
//
// 42 served airports had no Russian name, the largest being Stockholm-Arlanda at 179 departures
// a day, shown to a Russian reader as "Stockholm-Arlanda Airport". The same gap exists in the
// other locales: ar 22, hi 22, ko 12, tr 6.
//
// Most of those names cannot be filled by a machine. "Ingeniero Ambrosio Taravella",
// "Touat Cheikh Sidi Mohamed Belkebir", "Fatmawati Soekarno" are people, and inventing a
// Cyrillic or Devanagari spelling for a person is how this corpus acquired "Берлевåg" and
// "कोंस्तानța" — 43 names that had to be deleted rather than repaired.
//
// But one subset needs no invention at all. When the English name is nothing more than
// "<City> Airport", the airport carries no information the city does not, and the localised
// name IS the localised city — which is already in data/city-names.json, already reviewed, and
// already printed on the page next to it. That is derivation from verified data, not authorship.
//
// Four guards, each of which removed real candidates during the dry run:
//   - the name must reduce to exactly the city, ignoring case and diacritics — "Kristiansand
//     Airport" qualifies, "Stockholm-Arlanda Airport" does not, because Arlanda is a place the
//     city name does not name;
//   - the city translation must exist and be clean — no Latin left in a non-Latin locale, no
//     bracket, no question mark. "Левая алша-баннер (Алуша?)" is not something to publish;
//   - only airports with measured service, because an unserved airfield's page falls back to
//     the English name and nobody opens it anyway;
//   - the result must not collide with a sibling airport in the same city, or this would
//     recreate the "three airports all called Хьюстон" defect that was just fixed.
//
// Usage:
//   node scripts/derive-airport-names.mjs            — report
//   node scripts/derive-airport-names.mjs --write    — apply

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const read = (f) => JSON.parse(fs.readFileSync(path.join('data', f), 'utf8'));

const names = read('airport-names.json');
const cities = read('city-names.json');
const rawAirports = read('airports.json');
const airports = rawAirports.airports ?? rawAirports;
const svcRaw = read('airport-service.json');
const levels = svcRaw.airports ?? svcRaw;

const LOCALES = ['ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'de', 'fr', 'es', 'it', 'tr'];
/** Scripts a locale is expected to be written in — a Latin leftover means the name is unfinished. */
const NATIVE = { ru: /\p{Script=Cyrillic}/u, zh: /\p{Script=Han}/u,
  ja: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u, ko: /\p{Script=Hangul}/u,
  ar: /\p{Script=Arabic}/u, hi: /\p{Script=Devanagari}/u };

/** "Aomori Airport", "Hokitika Airfield", "Meixian International Airport" → the bare place. */
const GENERIC = /^(.+?)\s+(International\s+|Regional\s+)?(Airport|Airfield|Airpark|Aerodrome)$/i;
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Siblings sharing a city AND country — the unit within which a name must stay distinct. */
const byCity = new Map();
for (const a of airports) {
  if (!a.city || !(Number(levels[a.iata]) > 0)) continue;
  const key = `${a.city}|${a.country ?? ''}`;
  byCity.set(key, [...(byCity.get(key) ?? []), a]);
}

const applied = [];
const skipped = { notGeneric: 0, noCity: 0, dirtyCity: 0, collision: 0 };

for (const a of airports) {
  if (!(Number(levels[a.iata]) > 0)) continue;
  const m = a.name.match(GENERIC);
  if (!m || norm(m[1]) !== norm(a.city)) { skipped.notGeneric++; continue; }

  for (const locale of LOCALES) {
    if (names[a.iata]?.[locale]) continue;          // already has one
    const city = cities[a.city]?.[locale];
    if (!city) { skipped.noCity++; continue; }

    // Clean enough to publish: right script, no brackets, no leftover marker.
    const script = NATIVE[locale];
    const dirty = /[()（）?？]/.test(city)
      || (script && !script.test(city))
      || (script && /[A-Za-z]/.test(city));
    if (dirty) { skipped.dirtyCity++; continue; }

    // Would it become indistinguishable from a neighbour?
    const siblings = byCity.get(`${a.city}|${a.country ?? ''}`) ?? [];
    const clash = siblings.some((s) => s.iata !== a.iata && names[s.iata]?.[locale] === city);
    if (clash) { skipped.collision++; continue; }

    applied.push({ iata: a.iata, locale, value: city, flights: Number(levels[a.iata]), en: a.name });
    if (WRITE) {
      names[a.iata] = names[a.iata] ?? {};
      names[a.iata][locale] = city;
    }
  }
}

if (WRITE && applied.length) {
  fs.writeFileSync(path.join('data', 'airport-names.json'), JSON.stringify(names, null, 2) + '\n');
}

const perLocale = {};
for (const x of applied) perLocale[x.locale] = (perLocale[x.locale] || 0) + 1;

console.log(`${WRITE ? 'записано' : 'будет записано'}: ${applied.length} названий`);
console.log('  по локалям:', Object.entries(perLocale).sort((a, b) => b[1] - a[1])
  .map(([l, n]) => `${l}:${n}`).join(' ') || '—');
console.log('  пропущено: имя не сводится к городу ' + skipped.notGeneric
  + ', нет имени города ' + skipped.noCity
  + ', имя города грязное ' + skipped.dirtyCity
  + ', столкнулось бы с соседом ' + skipped.collision);

const top = applied.filter((x) => x.locale === 'ru').sort((a, b) => b.flights - a.flights).slice(0, 8);
if (top.length) {
  console.log('\n  самые заметные (ru):');
  for (const x of top) console.log(`    ${x.iata} ${String(x.flights).padStart(4)}/сут  ${x.en} → «${x.value}»`);
}
if (!WRITE) console.log('\nСухой прогон — ничего не записано. Повтори с --write.');
