// Tiered, self-pacing background warmer.
//
// The old warmer kept a hand-written list of 61 hubs fresh and left the other 6,011 airports
// serving an empty board — including Phuket, Cagliari and Trabzon, which have plenty of
// flights. Google read the result as thin content and declined to index 4,035 pages.
//
// This replaces the fixed list with a schedule driven by real flight volume, measured by
// scripts/discover-schedules.mjs into data/airport-service.json:
//
//   - airports are tiered by how many scheduled departures they actually have, so a busy
//     airport can never sit cold because nobody remembered to add it to a list;
//   - each tier gets a refresh interval matched to how fast its board really changes —
//     a strip with four flights a day does not need hourly polling;
//   - airports with zero scheduled service are never probed at all. They are ~2/3 of the
//     dataset, and no amount of polling will conjure flights that do not exist.
//
// Pacing is derived, not hardcoded: each run computes what it may spend from the budget
// still unspent this month and the number of days left. Upgrading the airlabs plan (or
// letting it lapse) changes behaviour automatically with no code change.

import fs from 'node:fs';
import path from 'node:path';
import { getAirport } from '@/lib/airports';
import { getStaleTs, usage, canSpend } from '@/lib/flightStore';

export type WarmTier = {
  name: string;
  /** Minimum scheduled departures per day for an airport to land in this tier. */
  minFlights: number;
  /** Target refresh interval, minutes. */
  intervalMin: number;
  /** Skip while it is the middle of the night at the airport (nothing is moving). */
  skipNight: boolean;
};

// Ordered busiest-first; the first tier an airport qualifies for wins.
//
// Sized for the agreed split of a 200k plan: 130k for warming, 70k left for live visitors.
// Total demand here is ~131.5k/month, so the warmer runs at ~99% of target and the budget is
// spent rather than left idle. dueAirports() orders by how overdue each board is *relative to
// its own tier*, so if a month ever comes up short every tier slows proportionally instead of
// the tail starving.
//
// The tail is the expensive part on purpose: mid + small are 1,820 of the 2,280 served
// airports and daily refresh for them costs 91k of the 130k. That is the deliberate trade —
// the busiest 68 airports settle for a 6h warm because their visitors get a live fetch on
// demand out of the 70k human reserve, whereas a small airport's page is mostly read by a
// crawler, which only ever sees whatever the warmer last stored.
//
// Measured 2026-07-19 (scripts/discover-schedules.mjs, 6,069 probes):
//   mega 68 · hub 92 · major 300 · mid 567 · small 1,253 — 2,280 airports with service.
// Run scripts/warm-plan.mjs after any change; it prints demand against any plan size.
export const TIERS: WarmTier[] = [
  { name: 'mega', minFlights: 400, intervalMin: 360, skipNight: false },
  { name: 'hub', minFlights: 150, intervalMin: 720, skipNight: true },
  { name: 'major', minFlights: 40, intervalMin: 1440, skipNight: true },
  { name: 'mid', minFlights: 10, intervalMin: 1440, skipNight: true },
  { name: 'small', minFlights: 1, intervalMin: 1440, skipNight: true },
];

export function tierOf(flights: number): WarmTier | null {
  if (!flights || flights < 1) return null;
  return TIERS.find(t => flights >= t.minFlights) ?? null;
}

type ServiceFile = { generated?: string; airports?: Record<string, number> };

let service: Record<string, number> | null = null;
export function getServiceData(): Record<string, number> {
  if (service) return service;
  try {
    const p = path.join(process.cwd(), 'data', 'airport-service.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8')) as ServiceFile;
    service = j.airports ?? {};
  } catch {
    service = {};   // not generated yet — callers fall back to the legacy hub list
  }
  return service;
}

/** True when it is the small hours at this airport, so almost nothing is scheduled. */
function isLocalNight(tz: string | null | undefined): boolean {
  if (!tz) return false;
  try {
    const hour = Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', hour12: false,
    }).format(new Date()));
    return hour >= 1 && hour < 5;
  } catch { return false; }
}

export type Due = { iata: string; tier: WarmTier; overdue: number };

/**
 * Airports whose board is older than their tier allows, most overdue first.
 * `overdue` is a ratio (1 = exactly due, 3 = three intervals late) so tiers compete on
 * lateness rather than a fixed hierarchy — a badly stale small airport can overtake a
 * hub that was refreshed a moment ago.
 */
export function dueAirports(now = Date.now()): Due[] {
  const svc = getServiceData();
  const out: Due[] = [];
  for (const [iata, flights] of Object.entries(svc)) {
    const tier = tierOf(flights);
    if (!tier) continue;                       // no scheduled service — never warm
    const airport = getAirport(iata);
    if (!airport || airport.closed) continue;
    if (tier.skipNight && isLocalNight(airport.tz)) continue;
    const ts = getStaleTs(`departures:dep_iata=${iata}`) ?? 0;
    const overdue = (now - ts) / (tier.intervalMin * 60_000);
    if (overdue < 1) continue;
    out.push({ iata, tier, overdue });
  }
  out.sort((a, b) => b.overdue - a.overdue);
  return out;
}

/**
 * How many airlabs requests this run may spend.
 *
 * Spreads whatever is left of the monthly budget evenly across the days remaining, then
 * across the runs expected in a day. Deliberately derived rather than configured: if the
 * plan doubles, every tier simply gets refreshed more often.
 */
export function tickBudget(runsPerDay = 12, now = new Date()): number {
  const u = usage();
  // Split the plan between the warmer and live human traffic. /api/flights fetches live for
  // a real browser off the same quota, so a warmer that drained the plan would leave every
  // visitor on a stale board for the rest of the month.
  //
  // Held as a SHARE of the cap rather than an absolute number so the split survives a plan
  // change: the intended 130k warm / 70k human split on a 200k plan is 35% reserved, and on
  // today's 100k plan the same 35% keeps the ratio instead of starving the warmer down to
  // 25k. AIRLABS_HUMAN_RESERVE still overrides with an absolute figure if that is wanted.
  const pct = Number(process.env.AIRLABS_HUMAN_RESERVE_PCT ?? 35) / 100;
  const abs = process.env.AIRLABS_HUMAN_RESERVE;
  const reserve = abs !== undefined ? Number(abs) : Math.round(u.cap * pct);
  // Warming simply stops once only the reserve is left, which guarantees that many requests
  // remain available to visitors no matter how the month went.
  const spendable = Math.max(0, u.remaining - reserve);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const perDay = Math.floor(spendable / daysLeft);
  // Floor so a nearly-exhausted month still refreshes the busiest boards; ceiling so one
  // run cannot swallow a whole day's allowance and leave the rest of the day cold.
  return Math.max(40, Math.min(Math.floor(perDay / runsPerDay), Math.floor(perDay / 2)));
}

/**
 * Scheduled departures we last measured for this airport.
 *   > 0  — it has commercial service
 *   0    — it does not (military field, bush strip, general-aviation or private airfield)
 *   null — never probed, so we must not claim either way
 */
export function serviceLevel(iata: string): number | null {
  const v = getServiceData()[iata];
  return v === undefined ? null : v;
}

/** Explicitly known to have no scheduled commercial service. Never true for un-probed airports. */
export function hasNoService(iata: string): boolean {
  return serviceLevel(iata) === 0;
}

/**
 * Closest airport that does have scheduled service — the genuinely useful thing to tell
 * someone who landed on the page of an airfield with no airline flights.
 * Returns null while service data is missing, so the UI can stay silent rather than guess.
 */
export function nearestServiced(
  iata: string,
  nearest: { iata: string; km: number }[],
): { iata: string; km: number } | null {
  const svc = getServiceData();
  if (!Object.keys(svc).length) return null;
  for (const n of nearest) {
    if (n.iata === iata) continue;
    const airport = getAirport(n.iata);
    if (!airport || airport.closed) continue;
    if ((svc[n.iata] ?? 0) > 0) return n;
  }
  return null;
}

/**
 * When the service levels were last measured, as YYYY-MM-DD, or null if never.
 * Published alongside every derived count so the claim is dated rather than timeless.
 */
export function serviceMeasuredOn(): string | null {
  try {
    const p = path.join(process.cwd(), 'data', 'airport-service.json');
    return (JSON.parse(fs.readFileSync(p, 'utf8')) as { generated?: string }).generated ?? null;
  } catch { return null; }
}

/**
 * Split a set of airports into the ones with measured scheduled service and the ones without.
 *
 * This is the site's one genuinely exclusive fact: we probed all 6,069 IATA codes, so we can
 * say how many airports in a country a traveller can actually fly from — a number no atlas,
 * Wikipedia list or competitor publishes. Un-probed airports count as unknown, never as
 * "no service", so the published totals stay defensible.
 */
export function splitByService<T extends { iata: string }>(airports: T[]): {
  served: T[]; unserved: T[]; unknown: T[];
} {
  const svc = getServiceData();
  const served: T[] = [], unserved: T[] = [], unknown: T[] = [];
  for (const a of airports) {
    const v = svc[a.iata];
    if (v === undefined) unknown.push(a);
    else if (v > 0) served.push(a);
    else unserved.push(a);
  }
  return { served, unserved, unknown };
}

/** Worldwide counts straight from the measurement file, for the /airports index. */
export function worldServiceCounts(): { probed: number; withService: number; empty: number; generated: string | null } {
  const svc = getServiceData();
  const vals = Object.values(svc);
  return {
    probed: vals.length,
    withService: vals.filter(n => n > 0).length,
    empty: vals.filter(n => n === 0).length,
    generated: serviceMeasuredOn(),
  };
}

export function planSummary(): {
  tiers: { name: string; airports: number; intervalMin: number; reqPerDay: number }[];
  withService: number; noService: number; projectedMonthly: number;
} {
  const svc = getServiceData();
  const rows = TIERS.map(t => ({ name: t.name, airports: 0, intervalMin: t.intervalMin, reqPerDay: 0 }));
  let withService = 0, noService = 0;
  for (const flights of Object.values(svc)) {
    const tier = tierOf(flights);
    if (!tier) { noService++; continue; }
    withService++;
    rows[TIERS.indexOf(tier)].airports++;
  }
  for (const r of rows) {
    // 2 requests (departures + arrivals) per refresh; night-skipped tiers lose ~1/6 of the day
    const refreshesPerDay = (24 * 60) / r.intervalMin;
    const nightFactor = TIERS.find(t => t.name === r.name)!.skipNight ? 5 / 6 : 1;
    r.reqPerDay = Math.round(r.airports * 2 * refreshesPerDay * nightFactor);
  }
  return {
    tiers: rows,
    withService,
    noService,
    projectedMonthly: rows.reduce((s, r) => s + r.reqPerDay, 0) * 30,
  };
}

export { canSpend };
