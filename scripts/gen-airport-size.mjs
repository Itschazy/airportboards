// Record each airport's size class from OurAirports, so the site can tell a regional hub
// apart from a bush strip.
//
// Needed for one decision: which pages to stop asking Google to index. 1,060 airports have no
// schedule at the provider under any code (re-probed 2026-07-26, all 1,102 candidates), so
// their boards can never fill — they render "live board data is not available right now" and
// always will. At twelve locales that is 12,720 URLs competing for crawl budget on a site with
// 1,770 pages indexed in total.
//
// Blanket-noindexing them would be wrong: 62 are large airports — Adana, Dakar, Al Maktoum,
// Groningen, Karlovy Vary — with genuine search demand that the About/guides/FAQ still answer.
// The size class is what separates those from the 428 small fields, heliports and seaplane
// bases nobody searches for. Measured against Yandex Webmaster: not one of the 1,060 appears in
// any of 2,778 queries the site receives, so there is no live traffic signal to use instead.
//
//   node scripts/gen-airport-size.mjs
//
// Source: https://davidmegginson.github.io/ourairports-data/airports.csv (public domain), the
// same dataset scripts/crosscheck-service.mjs already uses for the scheduled-service flag.
import fs from 'node:fs';
import path from 'node:path';

const URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUT = path.join(process.cwd(), 'data', 'airport-size.json');

/** Minimal CSV reader: the file is well-formed and quotes any field containing a comma. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const res = await fetch(URL);
if (!res.ok) { console.error(`fetch failed: ${res.status}`); process.exit(1); }
const rows = parseCsv(await res.text());
const head = rows[0];
const iIata = head.indexOf('iata_code');
const iType = head.indexOf('type');
const iSched = head.indexOf('scheduled_service');

const size = {};
let sched = 0;
for (const r of rows.slice(1)) {
  const iata = (r[iIata] || '').trim();
  if (!iata || iata.length !== 3) continue;
  size[iata] = r[iType];
  if (r[iSched] === 'yes') sched++;
}

const counts = {};
for (const v of Object.values(size)) counts[v] = (counts[v] || 0) + 1;

fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  source: URL,
  note: 'OurAirports size class per IATA code. Used by lib/warm.ts isUnfillable() to decide '
      + 'which permanently-empty airport pages should stop requesting an index slot.',
  counts,
  airports: size,
}, null, 2) + '\n');

console.log(`wrote ${Object.keys(size).length} codes to ${path.relative(process.cwd(), OUT)}`);
console.log('by type:', counts);
console.log(`(${sched} rows flagged scheduled_service=yes)`);
