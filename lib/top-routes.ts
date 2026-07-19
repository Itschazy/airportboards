import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import seed from '@/data/top-routes.json';
import { getStale, getStaleTs } from '@/lib/flightStore';
import type { AirlabsFlight } from '@/lib/flights';
import { getMegaIataCodes } from '@/lib/warm';

// Which routes out of the busiest airports actually operate, so the sitemap can advertise
// /route/{FROM}-{TO} pages that will have flights on them.
//
// Two sources, in priority order:
//   1. a live file written by the background warmer (see harvestFromStore below), kept
//      OUTSIDE the repo — the deploy runs `git reset --hard`, so anything the server writes
//      inside the working tree is destroyed on the next release;
//   2. data/top-routes.json committed in the repo — the seed, so a fresh checkout, a wiped
//      tmp directory, or a machine that has never warmed still builds a correct sitemap.
//
// Evidence accumulates rather than being replaced. One board is 80 rows — a single snapshot
// puts Heathrow's top route at three rows and leaves seven-way ties around rank 8. Merging
// snapshots across warm cycles is what makes the ranking stable, and it is also what makes
// the list self-correcting: a route that stops flying stops gaining evidence and drifts out
// of the top before its page goes empty. That matters because /route pages are noindex when
// they have no flights, and a sitemap full of noindexed URLs is the exact signal that got
// 4,035 pages excluded in the first place.

const LIVE_PATH = process.env.TOP_ROUTES_PATH
  || path.join(os.tmpdir(), 'airportsboard-top-routes.json');

/** How much of the day must pass before the warmer takes another snapshot. */
const HARVEST_INTERVAL_MS = 20 * 60 * 60 * 1000;
/** A pair must be seen in this many snapshots before the sitemap will advertise it. */
const MIN_SNAPSHOTS = 2;
const PER_AIRPORT = 8;
/**
 * Evidence retained from one snapshot to the next. Without this, `seen` and `total` only ever
 * grow, so a route that stopped flying years ago would keep its accumulated score and sit in
 * the sitemap forever — pointing the crawler at a page that renders "no flights" and is
 * therefore noindex, which is precisely the pattern that got 4,035 pages excluded.
 *
 * At 0.85 a daily route settles around seen ≈ 1/0.15 ≈ 6.7 and clears MIN_SNAPSHOTS after
 * two or three harvests; a route that stops flying falls back under the threshold in about a
 * week and is pruned entirely once its evidence is negligible.
 */
const DECAY = 0.85;
/** Below this, a pair is stale noise — drop it so the file cannot grow without bound. */
const PRUNE_BELOW = 0.3;
/** Board data older than this is not evidence of anything current. */
const MAX_BOARD_AGE_MS = 12 * 60 * 60 * 1000;

type Pair = { seen: number; total: number };
type RouteFile = {
  generatedAt?: string;
  runs?: number;
  top?: Record<string, string[]>;
  pairs?: Record<string, Pair>;
  lastHarvest?: number;
};

const SEED = seed as RouteFile;

function readLive(): RouteFile | null {
  try {
    const raw = JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8')) as RouteFile;
    return raw && raw.pairs ? raw : null;
  } catch { return null; }
}

/** Rank pairs per origin: strongest evidence first, IATA as a deterministic tie-break. */
function rank(pairs: Record<string, Pair>, minSnapshots: number): Record<string, string[]> {
  const byOrigin: Record<string, { k: string; p: Pair }[]> = {};
  for (const [k, p] of Object.entries(pairs)) {
    if (p.seen < minSnapshots) continue;
    const origin = k.split('-')[0];
    (byOrigin[origin] ??= []).push({ k, p });
  }
  const out: Record<string, string[]> = {};
  for (const [origin, list] of Object.entries(byOrigin)) {
    list.sort((a, b) => b.p.total - a.p.total || a.k.localeCompare(b.k));
    out[origin] = list.slice(0, PER_AIRPORT).map(x => x.k);
  }
  return out;
}

/**
 * The route pairs the sitemap should list. Live evidence when the warmer has produced
 * enough of it, otherwise the committed seed — never an empty list, so a cold machine still
 * ships a working sitemap.
 */
export function getTopRoutes(): Record<string, string[]> {
  const live = readLive();
  if (live?.pairs) {
    const ranked = rank(live.pairs, MIN_SNAPSHOTS);
    const count = Object.values(ranked).reduce((s, l) => s + l.length, 0);
    // Only prefer live data once it is at least as good as the seed; early on, one or two
    // snapshots produce a thinner list than the seed already provides.
    if (count >= Object.values(SEED.top ?? {}).reduce((s, l) => s + l.length, 0) * 0.8) return ranked;
  }
  return (SEED.top ?? {}) as Record<string, string[]>;
}

/**
 * Take one snapshot from the in-process store and merge it into the live file.
 *
 * Reads the store directly — no HTTP, no airlabs call, no quota. Called by the warm cron
 * right after a warm cycle, which is exactly when the boards are freshest, so no separate
 * schedule (and no new crontab line on the VDS) is needed.
 *
 * A pair counts only when it appears on BOTH ends: the origin's departures board and the
 * destination's arrivals board. That filters codeshare noise and one-off charters, which a
 * single-sided count would happily promote.
 */
export function harvestFromStore(now = Date.now()): { snapshotPairs: number; runs: number } | null {
  const live = readLive() ?? { runs: 0, pairs: {} };
  if (live.lastHarvest && now - live.lastHarvest < HARVEST_INTERVAL_MS) return null;

  const mega = new Set(getMegaIataCodes());
  const dep = new Map<string, number>();
  const arr = new Map<string, number>();

  for (const iata of mega) {
    const depKey = `departures:dep_iata=${iata}`;
    const arrKey = `arrivals:arr_iata=${iata}`;
    const depTs = getStaleTs(depKey);
    const arrTs = getStaleTs(arrKey);
    if (depTs && now - depTs < MAX_BOARD_AGE_MS) {
      for (const f of (getStale(depKey) ?? []) as AirlabsFlight[]) {
        if (!f.arr_iata || f.arr_iata === iata) continue;
        const k = `${iata}-${f.arr_iata}`;
        dep.set(k, (dep.get(k) ?? 0) + 1);
      }
    }
    if (arrTs && now - arrTs < MAX_BOARD_AGE_MS) {
      for (const f of (getStale(arrKey) ?? []) as AirlabsFlight[]) {
        if (!f.dep_iata || f.dep_iata === iata) continue;
        const k = `${f.dep_iata}-${iata}`;
        arr.set(k, (arr.get(k) ?? 0) + 1);
      }
    }
  }

  // Age the existing evidence before folding in this snapshot, so the ranking reflects what
  // is flying now rather than everything that ever flew.
  const pairs: Record<string, Pair> = {};
  for (const [k, p] of Object.entries(live.pairs ?? {})) {
    const seen = p.seen * DECAY;
    if (seen < PRUNE_BELOW) continue;
    pairs[k] = { seen, total: p.total * DECAY };
  }

  let snapshotPairs = 0;
  for (const [k, d] of dep) {
    const a = arr.get(k) ?? 0;
    if (!a) continue;                       // not confirmed from the other end
    const p = pairs[k] ?? { seen: 0, total: 0 };
    p.seen += 1;
    p.total += d + a;
    pairs[k] = p;
    snapshotPairs++;
  }
  // Nothing warm enough to learn from. Return before writing: persisting a decay-only pass
  // would erode the evidence every time the boards happen to be cold.
  if (!snapshotPairs) return null;

  const runs = (live.runs ?? 0) + 1;
  const out: RouteFile = {
    generatedAt: new Date(now).toISOString().slice(0, 16) + 'Z',
    runs,
    lastHarvest: now,
    note: 'merged from the in-process flight store; pairs confirmed on both origin departures and destination arrivals boards',
    top: rank(pairs, MIN_SNAPSHOTS),
    pairs,
  } as RouteFile & { note: string };

  try { fs.writeFileSync(LIVE_PATH, JSON.stringify(out)); }
  catch { return null; }                    // read-only fs — seed keeps serving
  return { snapshotPairs, runs };
}
