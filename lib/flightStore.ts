// Persistent flight-data store + monthly airlabs budget guard.
//
// Why this exists: airlabs is billed per request (100k/mo plan). Previously every
// on-demand SSR render fetched airlabs, so crawlers across 6072 airports burned the
// whole month's quota in ~2 days. This store decouples airlabs spend from traffic:
//   - reads are served from here (fresh within TTL, or stale as a fallback),
//   - only the human-facing path may spend quota, and only under a hard monthly cap,
//   - a bounded background warmer keeps the top hubs fresh.
// On a single-process PM2 deploy this is an in-memory mirror persisted to one JSON file
// (outside the repo so `git clean` on deploy doesn't wipe it). The counter is a
// best-effort backstop; the real guarantee is structural (crawlers never spend).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AirlabsFlight } from '@/lib/flights';

const STORE_PATH = process.env.FLIGHT_STORE_PATH || path.join(os.tmpdir(), 'airportsboard-flights.json');
const TTL_MS = (Number(process.env.FLIGHT_TTL_SEC) || 600) * 1000;       // 10 min freshness window
// Hard backstop, deliberately just under the plan.
//
// This used to be the whole story, and it was wrong: the operator set
// AIRLABS_MONTHLY_CAP=195000 in anticipation of a larger plan, but airlabs still reports
// limits_by_month=100000, so the warmer was pacing to spend ~127k against a real 100k wall.
// It would have run the plan dry a few days before month end and taken every board on the
// site down with it — silently, because nothing in our own accounting knows the real limit.
//
// So the env var is now only a ceiling we ask for, never a promise. airlabs echoes the true
// figure in `request.key.limits_by_month` on EVERY response, and noteProviderLimit() records
// it; the effective cap is the lower of the two. Upgrading the plan therefore needs no code
// change and no env change — the first response after the upgrade raises the cap by itself.
const CONFIGURED_CAP = Number(process.env.AIRLABS_MONTHLY_CAP) || 95000;

/** The lower of what we were configured to spend and what the provider actually allows. */
export function monthlyCap(): number {
  const observed = db().providerLimit;
  return observed && observed > 0 ? Math.min(CONFIGURED_CAP, observed) : CONFIGURED_CAP;
}

/**
 * Record the monthly limit airlabs reports for our key. Persisted with the store so a restart
 * does not briefly forget it and let one over-generous warm cycle through.
 */
export function noteProviderLimit(limit: unknown): void {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return;
  const s = db();
  if (s.providerLimit === n) return;
  s.providerLimit = n;
  persist();
}
// Two entries (departures + arrivals) per warmed airport. The tiered warmer covers every
// airport that has scheduled service — ~2,000 of the 6,072 — so the ceiling has to clear
// ~4,100 comfortably, or eviction would start throwing away boards we just paid for.
const MAX_ENTRIES = 12000;

type Entry = { ts: number; data: AirlabsFlight[] };
/** Who spent the request. The plan is split between the two (see lib/warm.ts tickBudget),
 *  so a single total cannot answer "did visitors have enough left?". */
export type SpendKind = 'warm' | 'human';
type Store = {
  month: string; count: number; entries: Record<string, Entry>;
  byKind?: Record<SpendKind, number>;
  /** monthly limit airlabs reports for our key; see noteProviderLimit(). */
  providerLimit?: number;
};

const monthKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM (calendar month)

let mem: Store | null = null;
function db(): Store {
  if (!mem) {
    try { mem = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as Store; }
    catch { mem = { month: monthKey(), count: 0, entries: {} }; }
  }
  if (mem.month !== monthKey()) mem = { month: monthKey(), count: 0, entries: {} }; // roll over each month
  return mem;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try { fs.writeFileSync(STORE_PATH, JSON.stringify(mem)); } catch { /* best-effort */ }
  }, 2000);
  if (typeof timer.unref === 'function') timer.unref();
}

/** Fresh data within the TTL window, or null. */
export function getFresh(key: string): AirlabsFlight[] | null {
  const e = db().entries[key];
  return e && Date.now() - e.ts < TTL_MS ? e.data : null;
}
/** Any stored data regardless of age (serve-stale fallback), or null. */
export function getStale(key: string): AirlabsFlight[] | null {
  const e = db().entries[key];
  return e ? e.data : null;
}
/** When this key was last written, or null if never. Used by the warmer to decide what is due. */
export function getStaleTs(key: string): number | null {
  const e = db().entries[key];
  return e ? e.ts : null;
}
export function put(key: string, data: AirlabsFlight[]) {
  const s = db();
  s.entries[key] = { ts: Date.now(), data };
  const keys = Object.keys(s.entries);
  if (keys.length > MAX_ENTRIES) delete s.entries[keys[0]]; // bound memory/disk
  persist();
}
/** True while we are still under the monthly airlabs budget. */
export function canSpend(): boolean { return db().count < monthlyCap(); }
export function spend(kind: SpendKind = 'human') {
  const s = db();
  s.count++;
  s.byKind ??= { warm: 0, human: 0 };
  s.byKind[kind]++;
  persist();
}
export function usage() {
  const s = db();
  const byKind = s.byKind ?? { warm: 0, human: 0 };
  return {
    month: s.month, count: s.count, cap: monthlyCap(),
    configuredCap: CONFIGURED_CAP, providerLimit: s.providerLimit ?? null,
    remaining: Math.max(0, monthlyCap() - s.count),
    warm: byKind.warm, human: byKind.human,
  };
}
