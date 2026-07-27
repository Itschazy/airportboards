import fs from 'fs';
import path from 'path';

/**
 * Weekly departure pattern, derived from data/airport-routes.json.
 *
 * The live board answers "what is flying in the next few hours" — capped at 80 rows and a
 * window of roughly a day. A route that operates on Tuesdays is therefore absent from the
 * board five days out of seven, and nothing else on the site knows it exists. This module
 * answers the other question: which destinations do NOT run every day, and on which days.
 *
 * Only irregular destinations are surfaced. Sorting every destination by frequency puts the
 * daily ones on top — Sochi's first eight are all mask 127 — so the days column would read
 * "every day" in every visible row and say nothing at all. Daily destinations are counted in
 * the lead sentence instead, where the count is the fact worth having.
 *
 * Rows are collapsed per DESTINATION, not per flight number: 30% of the dataset is one flight
 * number split across several rows (different weekdays, different times), 1,415 numbers serve
 * more than one airport, and TU397 leaves Abidjan at 22:30 for two different cities depending
 * on the day. Collapsing by destination makes all of that a non-problem.
 */
const FILE = path.join(process.cwd(), 'data/airport-routes.json');

export type ScheduleRow = {
  /** Destination IATA — links to that airport's existing page, never a new URL. */
  iata: string;
  /** Weekday bitmask, mon=1 … sun=64. Never 127 here: daily routes are excluded by design. */
  mask: number;
  /** Operating carriers, at most three, most frequent first. */
  airlines: string[];
  /** Distinct local departure times, ascending. */
  times: string[];
  /** Departures per week — the sort key, and the last column. */
  perWeek: number;
};

export type AirportSchedule = {
  rows: ScheduleRow[];
  /** Destinations served every single day — a number, not a list. */
  dailyCount: number;
  /** Total irregular destinations, including those beyond the row cap. */
  irregularCount: number;
  /** Destinations reachable on each weekday, mon-first. */
  perDay: number[];
  /** Snapshot date of the underlying data, YYYY-MM-DD. */
  asOf: string;
};

const MAX_ROWS = 20;
/** Below this many irregular destinations there is no pattern worth a section. */
const MIN_IRREGULAR = 8;

let cache: { airports: Record<string, [string, string, string, string, number, number][]>; generated: string } | null = null;
function load() {
  if (cache) return cache;
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    cache = { airports: j.airports ?? {}, generated: j.generated ?? '' };
  } catch {
    cache = { airports: {}, generated: '' };
  }
  return cache;
}

export function countDays(mask: number): number {
  let n = 0;
  for (let i = 0; i < 7; i++) if (mask & (1 << i)) n++;
  return n;
}

/**
 * @param known — IATA codes that have a page on this site. Destinations outside it are
 *   dropped rather than rendered as bare codes: a row nobody can click and nobody can read
 *   is worse than no row.
 */
export function getAirportSchedule(iata: string, known: Set<string>): AirportSchedule | null {
  const db = load();
  const rows = db.airports[iata.toUpperCase()];
  if (!rows?.length) return null;

  const byDest = new Map<string, { mask: number; airlines: Map<string, number>; times: Set<string>; perWeek: number }>();
  for (const [, airline, dest, time, mask] of rows) {
    if (!known.has(dest)) continue;
    let e = byDest.get(dest);
    if (!e) { e = { mask: 0, airlines: new Map(), times: new Set(), perWeek: 0 }; byDest.set(dest, e); }
    e.mask |= mask;
    e.times.add(time);
    e.perWeek += countDays(mask);
    if (airline) e.airlines.set(airline, (e.airlines.get(airline) ?? 0) + 1);
  }
  if (!byDest.size) return null;

  const perDay = [0, 0, 0, 0, 0, 0, 0];
  let dailyCount = 0;
  const irregular: ScheduleRow[] = [];
  for (const [dest, e] of byDest) {
    for (let i = 0; i < 7; i++) if (e.mask & (1 << i)) perDay[i]++;
    if (e.mask === 127) { dailyCount++; continue; }
    irregular.push({
      iata: dest,
      mask: e.mask,
      airlines: [...e.airlines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a),
      times: [...e.times].sort(),
      perWeek: e.perWeek,
    });
  }
  if (irregular.length < MIN_IRREGULAR) return null;

  irregular.sort((a, b) => b.perWeek - a.perWeek || a.iata.localeCompare(b.iata));
  return {
    rows: irregular.slice(0, MAX_ROWS),
    dailyCount,
    irregularCount: irregular.length,
    perDay,
    asOf: db.generated,
  };
}

/** Weekday names in the reader's own language — no translation strings needed. */
export function weekdayNames(locale: string, style: 'short' | 'long' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' });
  // 2024-01-01 was a Monday; seven consecutive days give Monday-first names.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2024, 0, 1 + i))));
}

export function maskToDays(mask: number, names: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) if (mask & (1 << i)) out.push(names[i]);
  return out;
}
