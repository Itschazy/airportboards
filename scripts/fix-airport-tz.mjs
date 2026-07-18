#!/usr/bin/env node
// Repair the literal "\N" timezone sentinel inherited from the OpenFlights dump.
//
// 557 airports carry tz === "\\N" (OpenFlights' null marker). It reaches users two ways:
//   - components/AirportBottom.tsx:86 renders it as the visible answer to "What time zone
//     is X in?", and into the FAQPage JSON-LD;
//   - components/FlightBoard.tsx:510 passes it to Intl.DateTimeFormat, which throws
//     RangeError: Invalid time zone specified — so the board breaks the moment such an
//     airport is warmed.
//
// No timezone dependency is needed: 5,515 airports in the same file already have a valid
// IANA zone plus coordinates, so a missing zone is imputed from the nearest airport in the
// SAME country that has one. Timezone boundaries follow borders and geography, so a
// same-country nearest neighbour is right except very close to an internal boundary.
// Airports with no same-country donor fall back to the nearest donor worldwide; if even
// that is implausibly far, tz is set to null so the UI can omit it honestly.
//
// Usage:
//   node scripts/fix-airport-tz.mjs           # dry run
//   node scripts/fix-airport-tz.mjs --write
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const FILE = 'data/airports.json';
const MAX_KM = 1200;   // beyond this a donor says nothing useful about the zone

const airports = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const valid = (t) => typeof t === 'string' && t.includes('/') && t !== '\\N';

const donors = airports.filter(a => valid(a.tz) && Number.isFinite(a.lat) && Number.isFinite(a.lon));
const broken = airports.filter(a => !valid(a.tz));
console.log(`donors: ${donors.length}   broken: ${broken.length}`);

const R = 6371;
const rad = d => (d * Math.PI) / 180;
function km(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const byCountry = new Map();
for (const d of donors) {
  if (!byCountry.has(d.country)) byCountry.set(d.country, []);
  byCountry.get(d.country).push(d);
}

let fixedSame = 0, fixedGlobal = 0, nulled = 0, noCoords = 0;
const samples = [];

for (const a of broken) {
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon)) { a.tz = null; noCoords++; nulled++; continue; }
  const pick = (pool) => {
    let best = null, bestD = Infinity;
    for (const d of pool) { const dist = km(a, d); if (dist < bestD) { bestD = dist; best = d; } }
    return { best, bestD };
  };
  let { best, bestD } = pick(byCountry.get(a.country) ?? []);
  let scope = 'same-country';
  if (!best || bestD > MAX_KM) {
    const g = pick(donors);
    if (!best || g.bestD < bestD) { best = g.best; bestD = g.bestD; scope = 'worldwide'; }
  }
  if (best && bestD <= MAX_KM) {
    a.tz = best.tz;
    scope === 'same-country' ? fixedSame++ : fixedGlobal++;
    if (samples.length < 12) samples.push(`${a.iata} ${a.city || a.name}, ${a.country} → ${a.tz}  (${scope}, ${Math.round(bestD)} km, donor ${best.iata})`);
  } else { a.tz = null; nulled++; }
}

console.log(`  imputed from same country : ${fixedSame}`);
console.log(`  imputed worldwide         : ${fixedGlobal}`);
console.log(`  set to null (no donor)    : ${nulled}${noCoords ? ` (of which ${noCoords} had no coords)` : ''}`);
console.log('\nsamples:');
for (const s of samples) console.log('  ' + s);

// every non-null zone must be one Intl actually accepts
let invalid = 0;
for (const a of airports) {
  if (a.tz == null) continue;
  try { new Intl.DateTimeFormat('en', { timeZone: a.tz }).format(new Date()); }
  catch { invalid++; console.log(`  INVALID after fix: ${a.iata} → ${a.tz}`); }
}
console.log(`\nzones rejected by Intl: ${invalid}`);

if (WRITE && invalid === 0) {
  fs.writeFileSync(FILE, JSON.stringify(airports, null, 2) + '\n');
  console.log(`\nwritten ${FILE}`);
} else if (!WRITE) {
  console.log('\nDry run — nothing written. Re-run with --write.');
} else {
  console.log('\nNOT written — fix the invalid zones first.');
  process.exit(1);
}
