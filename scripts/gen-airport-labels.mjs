// Города для кодов, которые встречаются на табло как НАПРАВЛЕНИЯ, но своей страницы не имеют.
//
// Строка табло печатала «SVC», «AXX», «TFU» вместо названия города — во всех двенадцати
// локалях, включая aria-label для незрячих. Причина не в переводе: `airportLabel()` в
// lib/flights.ts ищет город в data/airports.json и при промахе отдаёт голый код. Провайдер
// рейсов знает коды, которых в нашем срезе OurAirports нет: 3157 из 9055.
//
// Почему НЕ дополняем data/airports.json, хотя это выглядит очевидным решением: из него
// строится набор страниц. Плюс 3157 аэропортов — это плюс 37 884 URL на двенадцати локалях,
// на сайте, который уже получал бан за массовые сгенерированные страницы, и владелец
// отдельно решил новых не плодить. Ни один из этих кодов не имеет измеренных регулярных
// рейсов (проверено по airport-service.json — ровно ноль), так что собственная страница им
// и не нужна: они существуют только как пункт назначения в чужой строке.
//
// Поэтому — отдельный плоский справочник подписей. Он не участвует в генерации страниц, не
// попадает в sitemap и не расширяет поисковый индекс.
//
// Источник: https://davidmegginson.github.io/ourairports-data/airports.csv (public domain) —
// тот же, что уже используют scripts/gen-airport-size.mjs и scripts/crosscheck-service.mjs.
//
// Usage:
//   node scripts/gen-airport-labels.mjs [путь-к-airports.csv]
//   (без пути качает сам)

import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = path.join('data', 'airport-labels.json');

/** Разбор CSV с кавычками — в названиях аэропортов есть и запятые, и экранированные кавычки. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const csv = SRC
  ? fs.readFileSync(SRC, 'utf8')
  : await (await fetch('https://davidmegginson.github.io/ourairports-data/airports.csv')).text();

const rows = parseCsv(csv);
const head = rows[0];
const col = Object.fromEntries(head.map((h, i) => [h.replace(/"/g, ''), i]));

const raw = JSON.parse(fs.readFileSync(path.join('data', 'airports.json'), 'utf8'));
const own = raw.airports ?? raw;
const known = new Set(own.map((a) => a.iata).filter(Boolean));

const labels = {};
let seen = 0, skippedKnown = 0, skippedNoCity = 0;

for (const r of rows.slice(1)) {
  const iata = (r[col.iata_code] ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  seen++;
  if (known.has(iata)) { skippedKnown++; continue; }

  const city = (r[col.municipality] ?? '').trim();
  const name = (r[col.name] ?? '').trim();
  // Без города подпись не улучшить: имя вида "Bugalaga Airstrip" читателю говорит не больше,
  // чем сам код, а места в строке занимает втрое больше. Такие пропускаем — код честнее.
  if (!city) { skippedNoCity++; continue; }

  labels[iata] = { city, country: (r[col.iso_country] ?? '').trim(), name };
}

fs.writeFileSync(OUT, JSON.stringify(labels, null, 0) + '\n');

const size = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`${OUT}: ${Object.keys(labels).length} подписей, ${size} КБ`);
console.log(`  просмотрено кодов IATA: ${seen}`);
console.log(`  уже есть своя страница: ${skippedKnown}`);
console.log(`  пропущено без города: ${skippedNoCity}`);

const sample = ['TFU', 'SVC', 'AXX', 'JJD', 'COV', 'RZV', 'DGH'].filter((c) => labels[c]);
if (sample.length) {
  console.log('\n  контрольные из отчёта аудита:');
  for (const c of sample) console.log(`    ${c} → ${labels[c].city} (${labels[c].country})`);
}
