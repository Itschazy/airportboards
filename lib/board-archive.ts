import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import type { AirlabsFlight } from '@/lib/flights';

/**
 * Append-only archive of every board the site pays airlabs for.
 *
 * The store keeps only the LATEST snapshot per board — each refresh overwrites the last, so
 * the history the site has been buying since June evaporates the moment it is replaced.
 * Nothing downstream can ever be built on data that no longer exists: no "delays at AER over
 * the last 30 days", no punctuality by airline, no seasonal route history — page types a
 * direct competitor (airportinfo.live) already ranks with, and the one asset here that cannot
 * be bought retroactively at any price. Every day this file does not exist is a day of paid
 * data gone.
 *
 * Design is shaped by three hard constraints of this VDS:
 *
 *  1. DISK — the box has run out of disk before, and an archiver must never be the thing that
 *     fills it. One line per BOARD WRITE (not per flight) keeps the plain file at ~10 MB/day;
 *     rotation gzips it to ~1-2 MB (JSON tuples compress ~8-10×), and a hard byte-budget stops
 *     all writes if the directory ever exceeds ARCHIVE_MAX_MB. Silence costs history; a full
 *     disk costs the site.
 *  2. DEPLOYS — the release script runs `git clean -fd` in the working tree, so anything
 *     inside the repo dies on every push. Default lives in os.tmpdir(), like the flight store
 *     (survives deploys, not reboots). FLIGHT_ARCHIVE_PATH moves it somewhere durable —
 *     /home/deploy/airportsboard-archive is the natural spot — without a code change.
 *  3. CRASHES — append-only NDJSON needs no recovery logic: a torn final line is skipped by
 *     the reader and everything before it is intact. No in-memory day state to lose, no
 *     restore path to test, nothing to corrupt.
 *
 * Snapshots are appended as-is, duplicates and all (a mega airport warmed four times a day
 * appears four times). Resolution to "final state per flight per day" is the AGGREGATOR's job,
 * where last-write-wins over sched_ts is trivial — and the intermediate states are themselves
 * the story of how a delay unfolded, which a deduplicating writer would destroy.
 *
 * Line shape (one per board write):
 *   {"t":<unix s>,"a":"AER","d":"dep","f":[[flight,airline,other,sched_ts,est_ts,delay_min,status],…]}
 */

const DIR = process.env.FLIGHT_ARCHIVE_PATH
  || path.join(os.tmpdir(), 'airportsboard-archive');

/** Hard byte budget for the whole archive directory, plain + gzipped. */
const MAX_BYTES = (Number(process.env.ARCHIVE_MAX_MB) || 300) * 1024 * 1024;

/** [flight_iata, airline_iata, other_iata, sched_ts, est_ts, delay_min, status] */
type Tuple = [string, string, string, number, number, number, string];

let disabled = false;          // tripped by the size guard or an unwritable directory
let warned = false;
let knownDay: string | null = null;   // UTC day of the file we are currently appending to

function utcDay(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function dirBytes(): number {
  try {
    return fs.readdirSync(DIR).reduce((n, f) => {
      try { return n + fs.statSync(path.join(DIR, f)).size; } catch { return n; }
    }, 0);
  } catch { return 0; }
}

/** Gzip every plain day-file except today's, then delete the plain original. */
function rotate(today: string): void {
  let files: string[];
  try { files = fs.readdirSync(DIR); } catch { return; }
  for (const f of files) {
    const m = f.match(/^boards-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (!m || m[1] === today) continue;
    const plain = path.join(DIR, f);
    // Async and fire-and-forget: rotation is a courtesy to the disk, not a dependency of the
    // request path, and a ~10 MB gzip must not block a board render.
    fs.readFile(plain, (readErr, buf) => {
      if (readErr) return;
      zlib.gzip(buf, { level: 9 }, (zipErr, gz) => {
        if (zipErr) return;
        fs.writeFile(`${plain}.gz`, gz, (writeErr) => {
          if (!writeErr) fs.unlink(plain, () => { /* best-effort */ });
        });
      });
    });
  }
}

/**
 * Record one paid board snapshot. Called from the single place fresh airlabs data lands
 * (doFetch in lib/flights.ts), for plain board queries only — routes, flight-number and
 * airline lookups are slices of the same data and would only duplicate it here.
 *
 * Every failure mode is swallowed on purpose: the archive is strictly subordinate to the
 * board path. A page render must never learn that archiving had a bad day.
 */
export function archiveBoard(
  direction: 'departures' | 'arrivals',
  iata: string,
  rows: AirlabsFlight[],
): void {
  if (disabled || !rows.length) return;
  try {
    fs.mkdirSync(DIR, { recursive: true });
    const today = utcDay();
    if (knownDay !== today) {
      // First write of a new UTC day: check the byte budget once, then rotate yesterday.
      // Doing both on the day boundary (rather than every call) keeps the hot path to a
      // single appendFileSync.
      if (dirBytes() > MAX_BYTES) {
        disabled = true;
        if (!warned) {
          warned = true;
          console.warn(`[board-archive] ${DIR} exceeds ${MAX_BYTES} bytes — archiving disabled until space is freed`);
        }
        return;
      }
      rotate(today);
      knownDay = today;
    }
    const dep = direction === 'departures';
    const tuples: Tuple[] = rows.map(f => [
      f.flight_iata || f.flight_number || '',
      f.airline_iata || '',
      (dep ? f.arr_iata : f.dep_iata) || '',
      (dep ? f.dep_time_ts : f.arr_time_ts) || 0,
      (dep ? f.dep_estimated_ts : f.arr_estimated_ts) || 0,
      (dep ? f.dep_delayed : f.arr_delayed) || 0,
      f.status || '',
    ]);
    const line = JSON.stringify({ t: Math.round(Date.now() / 1000), a: iata, d: dep ? 'dep' : 'arr', f: tuples });
    fs.appendFileSync(path.join(DIR, `boards-${today}.jsonl`), line + '\n');
  } catch {
    // Unwritable directory, full disk, anything — stop trying rather than throwing on every
    // board write. The warn above (or the operator's disk monitoring) is the signal.
    disabled = true;
  }
}

/**
 * Operator-facing health of the archive, surfaced through /api/airlabs-usage. Without this
 * there is no way to know from outside the box whether history is actually accumulating —
 * and an archiver that fails silently (which this one does BY DESIGN on the request path)
 * needs exactly one place where it is loud.
 */
export function archiveStats(): { dir: string; files: number; bytes: number; today: string | null; disabled: boolean } {
  let files = 0, bytes = 0, today: string | null = null;
  try {
    const day = utcDay();
    for (const f of fs.readdirSync(DIR)) {
      const st = fs.statSync(path.join(DIR, f));
      files++; bytes += st.size;
      if (f === `boards-${day}.jsonl`) today = `${st.size} bytes`;
    }
  } catch { /* directory may not exist yet — zeros are the honest answer */ }
  return { dir: DIR, files, bytes, today, disabled };
}
