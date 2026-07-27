// Repair pass for the hubs the first routes import silently truncated.
//
// airlabs /routes returns at most 500 rows per query — a hard ceiling that `limit` and
// `offset` cannot lift. On a Western hub most of those 500 rows are codeshares (Frankfurt:
// 349 of 500), so after dropping codeshares the import kept 150 operating routes for an
// airport that flies well over a thousand. Atlanta came out with 104. The numbers looked
// plausible, which is exactly what makes this the dangerous kind of wrong: nothing failed.
//
// The way past the ceiling is to slice the query by airline. FRA+LH alone returns 342
// operating routes — more than the entire un-sliced FRA response yielded. So for each
// affected hub: discover which airlines fly from it (one un-sliced query), then re-query per
// airline and merge by flight number.
//
// Candidates are airports whose service level is high but whose route count came out low —
// the signature of truncation, not of a quiet airport.
//
//   node scripts/backfill-routes.mjs            # all candidates, resumable
//   LIMIT=5 node scripts/backfill-routes.mjs    # pilot
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'airport-routes.json');
const STATE = path.join(ROOT, 'data', 'airport-routes-backfilled.json');
const KEY = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^AIRLABS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!KEY) { console.error('AIRLABS_API_KEY not found'); process.exit(1); }

const MAX_REQ = Number(process.env.MAX_REQ || 5000);
const DAY_BIT = { mon: 1, tue: 2, wed: 4, thu: 8, fri: 16, sat: 32, sun: 64 };

const file = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const store = file.airports;
const service = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airport-service.json'), 'utf8')).airports;
const doneSet = new Set(fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')).done : []);

// Truncation signature: busy airport, thin route list.
const candidates = Object.entries(service)
  .filter(([iata, lvl]) => lvl >= 60 && (store[iata]?.length ?? 0) < 300 && !doneSet.has(iata))
  .sort((a, b) => b[1] - a[1])
  .map(([iata]) => iata);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function api(params) {
  if (requests >= MAX_REQ) throw new Error('budget');
  const url = `https://airlabs.co/api/v9/routes?${params}&api_key=${KEY}`;
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      requests++;
      if (r.status === 429 || r.status >= 500) { await sleep(2500 * (a + 1)); continue; }
      const j = await r.json();
      if (j.error) return [];
      return Array.isArray(j.response) ? j.response : [];
    } catch (e) {
      if (String(e).includes('budget')) throw e;
      await sleep(1500 * (a + 1));
    }
  }
  return null;
}

function toTuple(r) {
  const mask = (r.days || []).reduce((m, d) => m | (DAY_BIT[d] || 0), 0);
  if (r.cs_flight_iata || !r.flight_iata || !r.arr_iata || !r.dep_time || !mask) return null;
  return [r.flight_iata, r.airline_iata || '', r.arr_iata, r.dep_time, mask, r.duration || 0];
}

async function backfill(iata) {
  // Which airlines operate here? The un-sliced response is truncated, but its 500 rows still
  // name most carriers — including via the codeshare rows we otherwise discard.
  const probe = await api(`dep_iata=${iata}&limit=500`);
  if (probe === null) return null;
  const carriers = new Set();
  for (const r of probe) {
    if (r.airline_iata) carriers.add(r.airline_iata);
    if (r.cs_airline_iata) carriers.add(r.cs_airline_iata);
  }
  for (const t of store[iata] || []) if (t[1]) carriers.add(t[1]);

  // Key on flight + time + DESTINATION. Keying on flight+time alone collapses the segments
  // of a multi-leg rotation: TU397 leaves Abidjan at 22:30 for Ouagadougou on Thursdays and
  // for Tunis at the same clock time on other days — same number, same minute, two different
  // places. The first version overwrote one with the other and lost the days of both.
  const key = (t) => `${t[0]}:${t[3]}:${t[2]}`;
  // And merge day masks rather than replacing: two sources describing the same segment on
  // different weekdays are two halves of one truth.
  const put = (m, t) => {
    const k = key(t);
    const prev = m.get(k);
    if (prev) prev[4] |= t[4];
    else m.set(k, t);
  };
  const byFlight = new Map();
  for (const t of store[iata] || []) put(byFlight, [...t]);
  for (const r of probe) { const t = toTuple(r); if (t) put(byFlight, t); }

  for (const carrier of carriers) {
    const rows = await api(`dep_iata=${iata}&airline_iata=${carrier}&limit=500`);
    if (!rows) continue;
    for (const r of rows) { const t = toTuple(r); if (t) put(byFlight, t); }
  }
  return { rows: [...byFlight.values()], carriers: carriers.size };
}

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : candidates.length;
const work = candidates.slice(0, LIMIT);
console.log(`candidates ${candidates.length}, this run ${work.length}, budget ${MAX_REQ}`);

function flush() {
  file.counts = {
    airports: Object.keys(store).length,
    routes: Object.values(store).reduce((n, a) => n + a.length, 0),
  };
  file.backfilled = doneSet.size;
  fs.writeFileSync(OUT, JSON.stringify(file));
  fs.writeFileSync(STATE, JSON.stringify({ done: [...doneSet] }));
}

let i = 0, gained = 0;
const CONCURRENCY = 4;
async function worker() {
  while (i < work.length) {
    const iata = work[i++];
    const before = store[iata]?.length ?? 0;
    let res;
    try { res = await backfill(iata); }
    catch (e) { console.log(`STOP: ${e.message}`); i = work.length; break; }
    if (!res) continue;
    store[iata] = res.rows;
    doneSet.add(iata);
    gained += res.rows.length - before;
    if (doneSet.size % 20 === 0) { flush(); console.log(`  ${doneSet.size} готово, +${gained} маршрутов, ${requests} запросов`); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flush();
console.log(`backfilled ${doneSet.size}, routes gained +${gained}, requests ${requests}`);
console.log(`total routes now ${file.counts.routes}`);
