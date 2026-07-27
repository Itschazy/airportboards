// One-time import of airlabs /routes for every served airport — the timetable the boards
// cannot give us.
//
// A board answers "what is flying in the next few hours"; /routes answers "what operates on
// which WEEKDAYS at what time" — AER alone carries 412 route rows against its 80-row board
// cap. With days-of-week per route the site can finally render an honest schedule for any
// future date ("flights to Moscow on Friday"), which no amount of board-polling provides.
//
// Cost and timing, reasoned: the July quota resets on the 1st and the untouched part of the
// human reserve (~10K of the 12% hold-back) burns with it. This import is ~2.8-3.2K requests
// (one per served airport, plus pagination on hubs) — it fits inside the quota that would
// otherwise evaporate in four days. A hard MAX_REQ stop guards the arithmetic: the script
// spends from the same monthly pool the production warmer does, and the warmer's own
// accounting cannot see local spend, so the guard errs low.
//
//   node scripts/import-routes.mjs           # resumable: skips airports already present
//   LIMIT=20 node scripts/import-routes.mjs  # pilot
//
// Output data/airport-routes.json, compact per-airport tuples:
//   [flight_iata, airline_iata, arr_iata, "HH:MM", days_bitmask(mon=1..sun=64), duration_min]
// Codeshare rows are dropped (cs_flight_iata set) — same policy as the boards: one operating
// flight, not five sales labels for it.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'airport-routes.json');
const KEY = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^AIRLABS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('AIRLABS_API_KEY not found in .env.local'); process.exit(1); }

const MAX_REQ = 4000;               // absolute stop — protects the shared monthly pool
const PAGE = 500;
const DAY_BIT = { mon: 1, tue: 2, wed: 4, thu: 8, fri: 16, sat: 32, sun: 64 };

const service = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airport-service.json'), 'utf8')).airports;
const served = Object.entries(service).filter(([, v]) => v > 0).map(([k]) => k).sort();

let store = {}, meta = {};
if (fs.existsSync(OUT)) {
  try { const j = JSON.parse(fs.readFileSync(OUT, 'utf8')); store = j.airports ?? {}; meta = j; } catch { /* fresh */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function fetchPage(iata, offset) {
  if (requests >= MAX_REQ) throw new Error('request budget exhausted');
  const url = `https://airlabs.co/api/v9/routes?dep_iata=${iata}&limit=${PAGE}&offset=${offset}&api_key=${KEY}`;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      requests++;
      if (r.status === 429 || r.status >= 500) { await sleep(2500 * (a + 1)); continue; }
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'api error');
      return Array.isArray(j.response) ? j.response : [];
    } catch (e) {
      if (String(e).includes('budget')) throw e;
      await sleep(1500 * (a + 1));
    }
  }
  return null;   // page failed — airport recorded as absent, resumable next run
}

async function importAirport(iata) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await fetchPage(iata, offset);
    if (page === null) return null;
    for (const r of page) {
      if (r.cs_flight_iata) continue;                    // codeshare of an operating flight
      const mask = (r.days || []).reduce((m, d) => m | (DAY_BIT[d] || 0), 0);
      if (!r.flight_iata || !r.arr_iata || !r.dep_time || !mask) continue;
      rows.push([r.flight_iata, r.airline_iata || '', r.arr_iata, r.dep_time, mask, r.duration || 0]);
    }
    if (page.length < PAGE) break;
  }
  return rows;
}

const todo = served.filter((c) => !(c in store));
const LIMIT = process.env.LIMIT ? +process.env.LIMIT : todo.length;
const work = todo.slice(0, LIMIT);
console.log(`served ${served.length}, already imported ${served.length - todo.length}, this run ${work.length}, budget ${MAX_REQ} req`);

function flush() {
  const routesTotal = Object.values(store).reduce((n, a) => n + a.length, 0);
  fs.writeFileSync(OUT, JSON.stringify({
    generated: meta.generated || new Date().toISOString().slice(0, 10),
    source: 'airlabs /routes, one-time import; codeshares dropped; days as bitmask mon=1..sun=64',
    counts: { airports: Object.keys(store).length, routes: routesTotal },
    airports: store,
  }));
}

const CONCURRENCY = 5;
let done = 0, failed = 0, i = 0;
async function worker() {
  while (i < work.length) {
    const iata = work[i++];
    let rows;
    try { rows = await importAirport(iata); }
    catch (e) { console.log(`STOP: ${e.message} (после ${done})`); i = work.length; break; }
    if (rows === null) { failed++; continue; }
    store[iata] = rows;
    if (++done % 100 === 0) { flush(); console.log(`  ${done}/${work.length} — requests ${requests}`); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flush();
console.log(`done ${done}, failed ${failed}, requests spent ${requests}`);
console.log(`airports in file: ${Object.keys(store).length}, routes: ${Object.values(store).reduce((n, a) => n + a.length, 0)}`);
