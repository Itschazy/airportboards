#!/usr/bin/env node
// One-time (well, occasional) discovery sweep: ask airlabs how many scheduled departures
// each airport in the dataset actually has, and write the answer to data/airport-service.json.
//
// Everything downstream keys off this file:
//   - the warmer tiers airports by real flight volume instead of a hand-maintained hub list,
//     so a busy airport can never sit cold just because nobody thought to add it;
//   - airports with genuinely no scheduled service (military fields, bush strips, private
//     industrial airstrips — roughly two thirds of the 6,072 IATA codes) get an honest page
//     with no flight board, rather than an empty board that reads as a broken promise.
//
// Departures only: an airport with scheduled service essentially always has departures, so
// one request per airport is enough to classify it, and it halves the sweep's cost.
//
// NOTE: this talks to airlabs directly, so its spend does NOT pass through lib/flightStore's
// monthly counter. Subtract the reported total from the production figure by hand.
//
// Resumable — rerunning skips airports already recorded unless --refresh is passed.
//
// Usage:
//   node scripts/discover-schedules.mjs --limit 50      # try it on 50 airports first
//   node scripts/discover-schedules.mjs                 # full sweep
//   node scripts/discover-schedules.mjs --refresh       # re-probe everything
import fs from 'fs';

const OUT = 'data/airport-service.json';
const KEY = (fs.readFileSync('.env.local', 'utf8').match(/^AIRLABS_API_KEY=(.*)$/m) || [])[1]?.trim();
if (!KEY) { console.error('AIRLABS_API_KEY missing from .env.local'); process.exit(1); }

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? dflt : Number(process.argv[i + 1]);
};
const LIMIT = arg('--limit', Infinity);
const BUDGET = arg('--budget', 8000);          // hard stop so a bug can't drain the plan
const CONCURRENCY = arg('--concurrency', 5);
const REFRESH = process.argv.includes('--refresh');

const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { airports: {} };
const seen = prev.airports || {};

// Closed airports are never going to have flights; don't spend a request finding that out.
const todo = airports
  .filter(a => a.iata && !a.closed)
  .filter(a => REFRESH || seen[a.iata] === undefined)
  .slice(0, LIMIT);

console.log(`dataset ${airports.length} | already known ${Object.keys(seen).length} | to probe ${todo.length} | budget ${BUDGET}`);

let spent = 0, withService = 0, empty = 0, errors = 0, done = 0;
const started = Date.now();

async function probe(iata) {
  if (spent >= BUDGET) return null;
  spent++;
  const url = `https://airlabs.co/api/v9/schedules?dep_iata=${iata}&api_key=${KEY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const j = await res.json();
      if (j?.error) { errors++; return null; }
      return Array.isArray(j?.response) ? j.response.length : 0;
    } catch { await sleep(1000 * (attempt + 1)); }
  }
  errors++;
  return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function save() {
  fs.writeFileSync(OUT, JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    note: 'scheduled departures returned by airlabs at probe time; 0 = no scheduled commercial service',
    counts: { probed: Object.keys(seen).length, withService, empty },
    airports: seen,
  }, null, 2) + '\n');
}

const queue = [...todo];
async function worker() {
  while (queue.length) {
    if (spent >= BUDGET) return;
    const a = queue.shift();
    const n = await probe(a.iata);
    if (n !== null) {
      seen[a.iata] = n;
      n > 0 ? withService++ : empty++;
    }
    done++;
    if (done % 200 === 0) {
      const rate = done / ((Date.now() - started) / 1000);
      const eta = Math.round((queue.length / rate) / 60);
      console.log(`  ${done}/${todo.length}  service ${withService}  empty ${empty}  errors ${errors}  ~${eta} min left`);
      save();
    }
    await sleep(1000 / CONCURRENCY);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
save();

const vals = Object.values(seen).filter(n => n > 0).sort((a, b) => b - a);
const pct = p => vals[Math.floor(vals.length * p)] ?? 0;
console.log(`\ndone in ${Math.round((Date.now() - started) / 60000)} min — spent ${spent} requests`);
console.log(`  with scheduled service : ${withService}`);
console.log(`  no scheduled service   : ${empty}`);
console.log(`  errors                 : ${errors}`);
console.log(`\ndaily departures distribution (airports with service):`);
console.log(`  max ${vals[0]} | p90 ${pct(0.1)} | median ${pct(0.5)} | p10 ${pct(0.9)} | min ${vals[vals.length - 1]}`);
console.log(`\nwritten ${OUT}`);
