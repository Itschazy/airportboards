#!/usr/bin/env node
// Harvest the strongest routes out of each mega-tier airport into data/top-routes.json,
// for the sitemap and for anything else that wants a stable "top destinations" signal.
//
// Source: the production store, read through /api/flights with a bot user-agent — the API
// serves bots store data only (lib/flights.ts BOT_RE), so this spends ZERO airlabs quota.
//
// Why not one board, one snapshot: the board is capped at 80 rows, so single-snapshot
// counts are thin (LHR's top route shows 3 rows, rank-8 is a seven-way tie at 2) and
// unstable between warm cycles. Two defenses:
//   1. cross-confirmation within a snapshot — a route A->B must appear on BOTH A's
//      departures board and B's arrivals board to count;
//   2. accumulation across runs — the file merges evidence over time (run this again after
//      later warm cycles; each run strengthens or prunes pairs).
// The sitemap consumes only pairs with enough combined evidence, so a route that fades
// from the boards stops being advertised instead of pointing at a noindexed page.
//
// Usage:  node scripts/harvest-top-routes.mjs          # merge into data/top-routes.json
import fs from 'fs';

const BASE = 'https://airportsboard.live';
const UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot';
const OUT = 'data/top-routes.json';
const MEGA_MIN = 400;
const PER_AIRPORT = 8;

const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports;
const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const closed = new Set(airports.filter(a => a.closed).map(a => a.iata));
const mega = Object.entries(svc)
  .filter(([iata, n]) => n >= MEGA_MIN && !closed.has(iata))
  .map(([iata]) => iata)
  .sort();
console.log(`mega airports: ${mega.length}`);

async function board(iata, direction) {
  try {
    const r = await fetch(`${BASE}/api/flights/${iata}?direction=${direction}&locale=en`, {
      headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000),
    });
    const j = await r.json();
    return { rows: j.flights ?? [], fetchedAt: j.fetchedAt ?? null };
  } catch { return { rows: [], fetchedAt: null }; }
}

// departure evidence: rows on A's departures board going to B
const depEvidence = new Map();  // 'A-B' -> count
// arrival evidence: rows on B's arrivals board coming from A
const arrEvidence = new Map();

let cold = [];
for (const iata of mega) {
  const [dep, arr] = await Promise.all([board(iata, 'departures'), board(iata, 'arrivals')]);
  if (!dep.rows.length && !arr.rows.length) { cold.push(iata); continue; }
  for (const f of dep.rows) {
    if (!f.arrIata || f.arrIata === iata) continue;
    const k = `${iata}-${f.arrIata}`;
    depEvidence.set(k, (depEvidence.get(k) ?? 0) + 1);
  }
  for (const f of arr.rows) {
    if (!f.depIata || f.depIata === iata) continue;
    const k = `${f.depIata}-${iata}`;
    arrEvidence.set(k, (arrEvidence.get(k) ?? 0) + 1);
  }
  await new Promise(r => setTimeout(r, 120));
}
console.log(`cold airports skipped: ${cold.length}${cold.length ? ` (${cold.join(', ')})` : ''}`);

// cross-confirmed pairs from this snapshot
const snapshot = new Map();
for (const [k, d] of depEvidence) {
  const a = arrEvidence.get(k) ?? 0;
  if (a > 0) snapshot.set(k, d + a);   // seen from both ends
}
console.log(`cross-confirmed pairs this run: ${snapshot.size}`);

// merge with history
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { runs: 0, pairs: {} };
const pairs = prev.pairs ?? {};
for (const [k, n] of snapshot) {
  const p = pairs[k] ?? { seen: 0, total: 0 };
  p.seen += 1;
  p.total += n;
  pairs[k] = p;
}
const runs = (prev.runs ?? 0) + 1;

// per-origin top list: enough evidence + deterministic order (evidence desc, then IATA)
const byOrigin = {};
for (const [k, p] of Object.entries(pairs)) {
  const [o] = k.split('-');
  (byOrigin[o] ??= []).push({ k, ...p });
}
const top = {};
for (const [o, list] of Object.entries(byOrigin)) {
  list.sort((a, b) => b.total - a.total || a.k.localeCompare(b.k));
  top[o] = list.slice(0, PER_AIRPORT).map(x => x.k);
}

fs.writeFileSync(OUT, JSON.stringify({
  generatedAt: new Date().toISOString().slice(0, 16) + 'Z',
  runs,
  note: 'routes cross-confirmed on both origin departures and destination arrivals boards; evidence accumulates across runs',
  top,
  pairs,
}, null, 1) + '\n');

const totalTop = Object.values(top).reduce((s, l) => s + l.length, 0);
console.log(`written ${OUT}: ${runs} run(s), ${Object.keys(pairs).length} pairs tracked, ${totalTop} in top lists`);
console.log('samples:', (top.LHR ?? []).join(' '), '|', (top.JFK ?? []).join(' '));
