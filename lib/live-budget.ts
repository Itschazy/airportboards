import type { NextRequest } from 'next/server';
import { usage, humanReserve } from '@/lib/flightStore';

/**
 * Who is allowed to spend airlabs quota on a live fetch.
 *
 * The rule this replaces was a blocklist — `live = !BOT_RE.test(ua)` — and it failed OPEN:
 * anything the pattern did not name counted as a person. okhttp, Dart/dart:io, bare
 * node/undici, PostmanRuntime, Guzzle, Faraday, reqwest, .NET HttpClient, an EMPTY User-Agent
 * and any copied Chrome string all passed. Each pass can force one provider call per store key
 * per TTL window, and /api/flights is undocumented but unauthenticated, so walking it cost:
 * 6,072 served airports x 2 directions = 12,144 keys = 12,144 calls = 6.1% of a 195k month,
 * 1.8x an entire day of warming — repeatable every FLIGHT_TTL_SEC (600s). Nothing but the
 * monthly cap stood in the way, i.e. the plan could be emptied in an afternoon and every board
 * on the site would then sit stale until the 1st.
 *
 * Three layers, each failing closed:
 *
 *   1. Positive browser recognition instead of bot naming. A visitor arrives in a browser, and
 *      a browser sends "Mozilla/5.0" AND an engine token; the libraries above send neither, so
 *      they now read the store like crawlers already did. An attacker defeats this by copying a
 *      Chrome string, and that is fine — the layer exists to remove the whole class of
 *      accidental drain by default HTTP clients, which is what an open endpoint actually meets.
 *
 *   2. A per-IP cap on the number of DISTINCT BOARDS per hour, not on requests. That is the
 *      shape difference between the two populations: a visitor polls one or two boards over and
 *      over (free inside the TTL, and at most ~6 calls an hour per board once outside it),
 *      while a sweep needs breadth — 12,144 different keys. Capping breadth leaves normal use
 *      untouched and cuts a single-source sweep by ~300x.
 *      The cap is deliberately loose because 69.7% of this site's traffic is Russian mobile,
 *      where carrier CGNAT puts many unrelated visitors behind one address: a tight per-IP
 *      number would degrade real users on MTS/Beeline long before it caught a scraper.
 *
 *   3. A hard monthly ceiling on human spend, which is the layer that actually bounds a
 *      distributed sweep — many addresses with copied UAs pass both layers above. warm.ts
 *      already reserves a share of the plan for live traffic; holding live traffic to that same
 *      share completes the split and bounds the worst case to the reserve however the requests
 *      arrive.
 *
 * Refusal is never an error and never visible: the caller falls back to the store, exactly as
 * it already does for crawlers, so a throttled client still gets a board — just not a newly
 * paid-for one.
 */

/** A crawler that copies a browser UA still usually names itself. Kept from the old rule. */
const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|google|baidu|duckduck|facebook|embed|preview|fetch|monitor|lighthouse|headless|wget|curl|python|java|go-http|axios|node-fetch/i;

/** Every mainstream browser still opens with this, twenty years of cargo cult later. */
const BROWSER_PREFIX = /^Mozilla\/5\.0\b/;

/**
 * ...and names an engine or a build. AppleWebKit and the bare `Mobile/15E148` form are both
 * accepted on purpose: an iOS in-app WKWebView (a link opened inside VK or Telegram) sends
 * neither `Safari/` nor `Chrome/`, and 32% of this site's visits arrive inside app webviews.
 */
const ENGINE_TOKEN = /\b(?:AppleWebKit|Gecko|Chrome|CriOS|Chromium|Firefox|FxiOS|Safari|Version|Mobile|Edg|EdgiOS|OPR|OPiOS|YaBrowser|SamsungBrowser|Vivaldi)\/[\w.]+/;

const WINDOW_MS = 60 * 60 * 1000;
const PER_IP_BOARDS = Number(process.env.LIVE_BOARDS_PER_IP_HOUR) || 40;
/** Bound on the table itself, so rotating addresses cannot grow it without limit. */
const MAX_TRACKED_IPS = 4000;

/** ip -> boardKey -> last time a live fetch was admitted for it. */
const perIp = new Map<string, Map<string, number>>();

function looksLikeBrowser(ua: string): boolean {
  return BROWSER_PREFIX.test(ua) && ENGINE_TOKEN.test(ua) && !BOT_RE.test(ua);
}

/**
 * The client address, taken from the RIGHT-most X-Forwarded-For entry.
 *
 * Not the left-most, which is the usual reading: nginx's `$proxy_add_x_forwarded_for` APPENDS
 * the peer to whatever the client sent, so the left-most entry is client-controlled and using
 * it would let one attacker present a fresh identity per request and walk straight through
 * layer 2. The right-most entry is the hop our own proxy added. X-Real-IP is preferred when
 * present for the same reason — nginx sets it from `$remote_addr`.
 */
function clientKey(req: NextRequest): string {
  const real = req.headers.get('x-real-ip')?.trim();
  if (real) return real;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',');
    return hops[hops.length - 1].trim();
  }
  return 'direct';
}

function dropExpired(seen: Map<string, number>, now: number): void {
  for (const [key, ts] of seen) if (now - ts > WINDOW_MS) seen.delete(key);
}

function sweepTable(now: number): void {
  for (const [ip, seen] of perIp) {
    dropExpired(seen, now);
    if (seen.size === 0) perIp.delete(ip);
  }
}

/**
 * Layer 2. Repeat views of a board already admitted this hour stay free — that is the visitor
 * pattern, and the TTL bounds what it can cost — while reaching a new board consumes budget.
 */
function admitBoard(ip: string, boardKey: string): boolean {
  const now = Date.now();
  let seen = perIp.get(ip);
  if (!seen) {
    if (perIp.size >= MAX_TRACKED_IPS) sweepTable(now);
    if (perIp.size >= MAX_TRACKED_IPS) return false; // still full of live entries: fail closed
    seen = new Map();
    perIp.set(ip, seen);
  }
  dropExpired(seen, now);
  if (!seen.has(boardKey) && seen.size >= PER_IP_BOARDS) return false;
  seen.set(boardKey, now);
  return true;
}

/** Layer 3. Visitors get the reserve warm.ts leaves them, and not the warmer's share. */
function withinHumanReserve(): boolean {
  return usage().human < humanReserve();
}

/**
 * True if this request may trigger a paid provider call. False means "read the store", which
 * is a normal, complete answer — see the note on refusal above.
 */
export function mayFetchLive(req: NextRequest, boardKey: string): boolean {
  // Layer 0: a development machine may never spend the production plan.
  //
  // Every other guard here is about WHO is asking; this one is about WHERE from. The key sits
  // in .env.local on developer machines too, so simply opening a board in a browser fires the
  // client poll and buys flights with real money — measured 2026-08-09, four requests charged
  // by loading /ru/airport/KZN once while verifying an unrelated change. Nothing about a local
  // page view is worth a paid call: the store answer is complete, and if fresh data is genuinely
  // needed it can be fetched deliberately.
  //
  // Host-based rather than NODE_ENV-based on purpose — `next start` runs with NODE_ENV set to
  // production locally, which is exactly the case that caught this out.
  const host = req.nextUrl.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
    return false;
  }
  if (!looksLikeBrowser(req.headers.get('user-agent') || '')) return false;
  if (!withinHumanReserve()) return false;
  return admitBoard(clientKey(req), boardKey);
}

/** Operator visibility, for /api/airlabs-usage: is either throttle actually being reached? */
export function liveBudgetStats() {
  const now = Date.now();
  sweepTable(now);
  let boards = 0;
  let widest = 0;
  for (const seen of perIp.values()) {
    boards += seen.size;
    if (seen.size > widest) widest = seen.size;
  }
  const u = usage();
  return {
    trackedIps: perIp.size,
    boardsThisHour: boards,
    widestIpThisHour: widest,
    perIpLimit: PER_IP_BOARDS,
    humanSpent: u.human,
    humanCeiling: humanReserve(),
  };
}
