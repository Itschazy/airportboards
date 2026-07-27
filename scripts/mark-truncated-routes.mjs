// Find which airports' route lists the provider cut off, by proof rather than by guess.
//
// airlabs /routes returns at most 500 rows, sorted by destination code — so a truncated list
// does not merely end early, it ends ALPHABETICALLY. Dublin's stops at BUD, Gatwick's at BCN,
// Sheremetyevo's at KZN. Nothing in the response says so.
//
// The proof is the reverse index. If some airport O publishes a route O→X, then X is served
// from O, and a complete list for X would normally contain O. Collect every such O missing
// from X's own list and ask where they fall alphabetically: for an airport with genuinely
// asymmetric routes they scatter across the alphabet, but for a truncated one they sit
// ENTIRELY past its last destination. Dublin: 144 of 144 missing destinations sort after BUD.
// Gatwick: 136 of 136. Chicago, whose list reaches ZRH: 0 of 47.
//
// My first attempt guessed from service level and row count instead, and missed Sheremetyevo,
// Dublin and Gatwick — the three worst cases — while flagging airports that were merely quiet.
//
//   node scripts/mark-truncated-routes.mjs
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'data/airport-routes.json');
const file = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const R = file.airports;

/** How many proven-missing destinations must sit past the cut before we call it truncation. */
const MIN_MISSING = 5;
const RATIO = 0.8;

const dests = new Map();                       // origin -> Set(destination)
for (const [o, rows] of Object.entries(R)) dests.set(o, new Set(rows.map((t) => t[2])));

const inbound = new Map();                     // destination -> Set(origin)
for (const [o, set] of dests) {
  for (const d of set) {
    let s = inbound.get(d);
    if (!s) { s = new Set(); inbound.set(d, s); }
    s.add(o);
  }
}

const truncated = [];
const detail = [];
for (const [x, have] of dests) {
  if (!have.size) continue;
  let max = '';
  for (const d of have) if (d > max) max = d;
  const proven = inbound.get(x);
  if (!proven) continue;
  let missing = 0, after = 0;
  for (const o of proven) {
    if (have.has(o)) continue;
    missing++;
    if (o > max) after++;
  }
  if (after >= MIN_MISSING && after / missing >= RATIO) {
    truncated.push(x);
    detail.push({ iata: x, cutAt: max, have: have.size, missing, after });
  }
}
truncated.sort();

file.truncated = truncated;
fs.writeFileSync(FILE, JSON.stringify(file));

detail.sort((a, b) => b.missing - a.missing);
console.log(`truncated: ${truncated.length} of ${dests.size} airports`);
console.log('worst:');
for (const d of detail.slice(0, 12)) {
  console.log(`  ${d.iata}: has ${d.have}, cut at ${d.cutAt}, ${d.after}/${d.missing} missing sort after it (×${((d.have + d.missing) / d.have).toFixed(1)} understated)`);
}
