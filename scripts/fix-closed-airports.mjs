#!/usr/bin/env node
// The airport dataset is an OpenFlights dump from ~2012, so it still lists airports that
// have since closed and is missing ones that have since opened. Left alone, the site serves
// "Live Arrivals & Departures" pages for airports that have been shut for years — Tempelhof
// closed in 2008 — which is both useless to a traveller and exactly the kind of thing an
// AdSense reviewer opens first.
//
// Rather than delete the closed entries (their URLs are indexed, and a 404 wastes them),
// mark them `closed` with the year and the airport that took over. The page can then say so
// honestly and point at the successor, which is genuinely more useful than a dead board.
//
// Facts verified 2026-07-19 against Wikipedia / berlin.de:
//   TXL  closed 8 Nov 2020        -> BER
//   SXF  became BER Terminal 5, IATA folded into BER 25 Oct 2020; T5 shut 2022 -> BER
//   THF  closed 30 Oct 2008       -> BER
//   NAY  closed 25 Sep 2019       -> PKX
//   BER  opened 31 Oct 2020, EDDB, 52.3667 / 13.5033, 157 ft
//
// Usage: node scripts/fix-closed-airports.mjs [--write]
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const FILE = 'data/airports.json';
const airports = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const CLOSED = {
  TXL: { closed: 2020, successor: 'BER' },
  SXF: { closed: 2020, successor: 'BER' },
  THF: { closed: 2008, successor: 'BER' },
  NAY: { closed: 2019, successor: 'PKX' },
};

const ADD = [
  {
    iata: 'BER', icao: 'EDDB', name: 'Berlin Brandenburg Airport', city: 'Berlin',
    country: 'Germany', iso2: 'DE', lat: 52.3667, lon: 13.5033, elev: 157, tz: 'Europe/Berlin',
  },
];

let marked = 0, added = 0, skipped = 0;
const have = new Set(airports.map(a => a.iata));

for (const a of airports) {
  const c = CLOSED[a.iata];
  if (!c) continue;
  if (!have.has(c.successor) && !ADD.some(x => x.iata === c.successor)) {
    console.log(`  ! ${a.iata}: successor ${c.successor} is not in the dataset — leaving as is`);
    continue;
  }
  a.closed = c.closed;
  a.successor = c.successor;
  marked++;
  console.log(`  closed  ${a.iata}  ${a.name} → ${c.successor} (${c.closed})`);
}

for (const n of ADD) {
  if (have.has(n.iata)) { skipped++; console.log(`  = ${n.iata} already present`); continue; }
  airports.push(n);
  added++;
  console.log(`  added   ${n.iata}  ${n.name}`);
}

// keep the file ordered by IATA so diffs stay readable
airports.sort((a, b) => (a.iata || '').localeCompare(b.iata || ''));

console.log(`\nmarked closed: ${marked}   added: ${added}   already present: ${skipped}   total: ${airports.length}`);

if (WRITE) {
  fs.writeFileSync(FILE, JSON.stringify(airports, null, 2) + '\n');
  console.log(`written ${FILE}`);
} else {
  console.log('Dry run — nothing written. Re-run with --write.');
}
