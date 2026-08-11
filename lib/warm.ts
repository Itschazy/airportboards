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
import { getStaleTs, usage, canSpend, humanReserve } from '@/lib/flightStore';
import { hasWikiAirlines, getWikiRoutes } from '@/lib/wiki-routes';

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

export type Due = { iata: string; tier: WarmTier; overdue: number; pinned: boolean };

/**
 * Airports whose refresh interval is pinned to the mega cadence REGARDLESS of their tier,
 * because measured demand says so.
 *
 * The tiers size the schedule by flight volume, which is the right default — but it is a
 * proxy for demand, and where demand is actually measured it wins. Yandex Webmaster,
 * 2,778 queries over July 2026: Sochi alone takes 32.8% of every impression the site earns,
 * Mineralnye Vody 19.8%, and the top dozen cities 80.6% — yet AER (39 departures/day) and
 * MRV (19) fall into the mid tier and refresh every 24 hours, while the 6-hour mega slots go
 * to LHR and JFK, which bring this site zero impressions. The visible result was the site's
 * highest-traffic page serving five-hour-old data with eight already-departed rows above the
 * fold, on a query that literally says "онлайн табло".
 *
 * Freshness is NOT pinned in the hope of CTR — that link was tested and refuted (boards
 * ≤1.5h old CTR-perform the same as >3h; PVG at 4h stale does 11%). It is pinned because
 * serving day-old data on the pages nearly every visitor actually opens is a product defect
 * on its own terms.
 *
 * AYT is here, not ATA: "Анта" (Peru) is a substring of «Анталья», and naive city matching
 * had credited a Peruvian strip with Antalya's impressions. Cost of the whole list: 12
 * airports lifted from 24h to 6h ≈ +72 requests/day ≈ 2.2k/month, ~3% of the warm budget.
 * Revisit against fresh Webmaster data, not by feel.
 */
const DEMAND_PINNED = new Set([
  // Были с самого начала. HOR, LWN, PES и CAN держатся НАМЕРЕННО, хотя в русском спросе их
  // нет: Яндекс.Метрика стоит только на русской локали (components/YandexMetrica.tsx:21), а
  // Search Console по этому сайту не отдаёт ничего. Их аудитория просто не видна ни одному
  // доступному счётчику, и снимать закрепление на основании слепого пятна нельзя.
  'AER', 'MRV', 'SUI', 'KZN', 'GYD', 'TAS', 'HOR', 'AYT', 'SVX', 'LWN', 'PES', 'CAN',

  // Добавлены 12.08 по замеру Яндекс.Вебмастера: 500 запросов, 99 382 показа, сопоставлено с
  // аэропортами 98%. Правило отбора: аэропорт входит в топ-25 по показам И его ярусный
  // норматив хуже шести часов — иначе закрепление ничего не меняет (IST, DXB и PVG в топе
  // есть, но они mega и уже получают 6 ч, поэтому их здесь нет).
  //
  // Первым идёт UFA — 17 262 показа, ВТОРОЙ результат по сайту после Казани, и на момент
  // замера её борт стоял на 53 часах при нормативе 24. Пятнадцать из двадцати пяти самых
  // востребованных страниц приходили на просроченный борт; в показах это 47.4% спроса.
  //
  // Очереди это добавляет 112 запросов в сутки из 2 933 доступных — 3.8%. Общий расход НЕ
  // растёт ни на запрос: тик тратит ровно tickBudget(), меняется только кому достаётся.
  'UFA', 'EVN', 'DYU', 'TBS', 'FRU', 'BAX', 'NJC', 'SLY', 'TIV', 'MQF', 'BJV', 'ARH', 'KGD', 'DME',
]);
const DEMAND_INTERVAL_MIN = 360;

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
    const pinned = DEMAND_PINNED.has(iata);
    // Pinned airports also skip the night gate, for the same reason mega does: their boards
    // are full of red-eyes (AER departs 00:55, 01:00, 01:25…), and the people checking at
    // 01:30 are exactly the measured demand this pin exists for.
    if (!pinned && tier.skipNight && isLocalNight(airport.tz)) continue;
    const ts = getStaleTs(`departures:dep_iata=${iata}`) ?? 0;
    const interval = pinned ? Math.min(tier.intervalMin, DEMAND_INTERVAL_MIN) : tier.intervalMin;
    const overdue = (now - ts) / (interval * 60_000);
    if (overdue < 1) continue;
    out.push({ iata, tier, overdue, pinned });
  }
  // Busiest tier first, most overdue within it.
  //
  // This used to sort on the raw overdue ratio alone, which sounds fair and is not: a board
  // that has never been warmed has ts = 0, so its ratio is the epoch divided by the interval —
  // tens of thousands. It outranks a hub that is genuinely three times late, permanently,
  // because there are always more un-warmed airports than budget. The note on TIERS promises
  // that a short month slows every tier proportionally rather than starving anyone; an
  // unbounded ratio quietly broke that promise in the tail's favour, and clamping the ratio
  // does not fix it either (the clamped tail still outranks a hub at 2x).
  //
  // Measured on production 2026-07-19, demand ~5,200/day against ~2,750 of budget: DXB, CDG,
  // SIN and HND sat at 12 hours against a 6-hour target, ATL and PEK at 15, while the tail
  // took the runs. Those are the most valuable pages on the site.
  //
  // Ordering by tier costs the tail nothing it was entitled to: boards refreshed within their
  // own interval never enter this list at all (overdue < 1 is filtered above), so this only
  // decides who goes first among boards that are ALL already late. Mega and hub together are
  // 160 airports and ~850 requests a day, leaving ~1,900 of the 2,750 flowing downwards.
  // Lateness, clamped, weighted by tier. Both halves are load-bearing and each fixes a
  // failure the other caused.
  //
  // Sorting on the raw ratio starved the busiest boards: a board never warmed has ts = 0, so
  // its ratio is the epoch over its interval — tens of thousands — and it outranks a hub that
  // is genuinely three times late, permanently. Measured before the clamp: mega 49% fresh.
  //
  // Ordering by tier index instead fixed that and inverted it. With tier as the PRIMARY key
  // the whole capacity deficit lands on the last tier, and there is a deficit: capacity is
  // ~1,400 refreshes a day against demand of ~2,600. Measured on production after that
  // change: 41.6% of served airports cold, small at 5%, a ~242-hour cycle. The comment that
  // replaced was only true while supply exceeded demand, which it never did.
  //
  // Weighting keeps tier influential without letting it be absolute, so a shortfall spreads
  // across tiers instead of falling entirely on the smallest. Simulated over a week at the
  // measured capacity: mega/hub/major/mid 100%, small 58% — against 5% for tier-first and
  // 49% mega for raw overdue.
  const CAP = 3;                                   // past this, "very late" carries no more information
  const WEIGHT = [6, 3, 1.5, 1.2, 1];              // parallel to TIERS, busiest first

  /**
   * Закрепление поднимает не только срок, но и ВЕС — иначе оно не работает.
   *
   * DEMAND_PINNED резал интервал (строка выше), но в ранге его не было вовсе, а ранг решает,
   * кто попадёт в бюджет тика. Из-за ограничителя CAP очередь режется примерно по потолку
   * младшего яруса, поэтому достижимый возраст борта равен CAP / вес × интервал: у mega и hub
   * это ровно цель, у major вдвое хуже, у mid в 2.5 раза, у small втрое. Закреплённый
   * аэропорт из яруса mid получал цель 6 часов и потолок ранга 3.6 — то есть цель, которой не
   * мог достичь никогда.
   *
   * Замерено на проде 11.08: из двенадцати закреплённых восемь цель 6 ч не выполняли — Сухум,
   * Баку и Екатеринбург стояли на 13 часах, Сочи и Минводы на 7. Предсказание формулы
   * совпало с замером до часа, что и подтвердило причину.
   *
   * Пол 3 (вес яруса hub) даёт закреплённому потолок ранга 9 при CAP=3 — достаточно, чтобы
   * он проходил ватерлинию каждый раз, когда просрочен. Расход при этом не растёт ни на
   * запрос: тик тратит ровно tickBudget() вызовов, меняется только КОМУ они достаются.
   */
  const PINNED_WEIGHT = 3;
  const rank = (d: Due) => Math.min(d.overdue, CAP)
    * Math.max(WEIGHT[TIERS.indexOf(d.tier)] ?? 1, d.pinned ? PINNED_WEIGHT : 0);
  out.sort((a, b) => rank(b) - rank(a));
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
  // See humanReserve() for why this is a share of the cap rather than a fixed number. It is
  // the same figure live-budget.ts holds visitors to, so neither side can outgrow the other.
  const reserve = humanReserve();
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
 * IATA codes our probe recorded as zero but OurAirports flags as having scheduled service.
 * See scripts/crosscheck-service.mjs — 1,580 of 3,789 zero verdicts, concentrated in exactly
 * the regions where the provider's coverage is thin (Norway 38 of 40, Canada 175 of 292).
 */
let unverified: Set<string> | null = null;
function getUnverified(): Set<string> {
  if (unverified) return unverified;
  try {
    const p = path.join(process.cwd(), 'data', 'airport-service-unverified.json');
    unverified = new Set((JSON.parse(fs.readFileSync(p, 'utf8')) as { codes?: string[] }).codes ?? []);
  } catch {
    unverified = new Set();   // no cross-check file — fall back to the raw measurement
  }
  return unverified;
}

/**
 * Scheduled departures we last measured for this airport.
 *   > 0  — it has commercial service
 *   0    — it does not (military field, bush strip, general-aviation or private airfield)
 *   null — unknown: never probed, OR probed once as zero and contradicted by OurAirports
 *
 * The null case is load-bearing. A single empty `schedules?dep_iata=X` response is one sample of
 * a feed whose coverage varies by region, not proof that no airline flies there — and we were
 * publishing it as "No airline operates scheduled passenger flights from X" in the page copy,
 * the meta description and a FAQPage answer, across whole networks (Widerøe, Loganair). Silence
 * is the only honest answer when the two sources disagree.
 */
export function serviceLevel(iata: string): number | null {
  const v = getServiceData()[iata];
  if (v === undefined) return null;
  if (v === 0 && getUnverified().has(iata)) return null;
  return v;
}

/**
 * Explicitly known to have no scheduled commercial service. Never true for un-probed airports.
 *
 * Yields to Wikipedia. Where our probe measured zero AND OurAirports agreed, the page states
 * "No airline operates scheduled passenger flights from X" as fact — and for some of those
 * airports Wikipedia lists current airlines with destinations. One of the two is wrong, and it
 * is not the one maintained by people who follow the airport: our figure is a single probe from
 * a single provider at a single moment, and that provider demonstrably has gaps (42 of the 1,102
 * it zeroed returned a schedule on a re-probe a week later).
 *
 * So when there are published airlines, we stop asserting the negative. The page shows those
 * routes instead — see components/AirportBottom.tsx — which is both true and more useful than
 * a claim we cannot stand behind. Every downstream consumer of this function follows suit: the
 * banner, the FAQ gate, the nearest-served-airport line and the JSON-LD description.
 */
export function hasNoService(iata: string): boolean {
  const level = serviceLevel(iata);
  if (level !== null && level > 0) return false;
  if (hasWikiAirlines(iata)) return false;
  if (level === 0) return true;
  // Level unknown, but the airport's own article states there is no commercial service —
  // the Ukrainian airports are the load-bearing case (civil airspace closed since 24.02.2022,
  // KBP's article listed 24 historical carriers that were briefly published here as current).
  // An explicit sourced negative beats an unknown.
  return getWikiRoutes(iata)?.status === 'no_commercial_service';
}

/**
 * The airport's own source article states it has no commercial service — an independent,
 * sourced negative rather than one empty probe of a feed with patchy coverage.
 *
 * 231 airports. It is the gate on publishing an operations description: a paragraph written in
 * the present tense about terminals, carriers and destinations is not merely thin on a page
 * headed "no scheduled flights", it is false. Surgery on the offending sentence was tried
 * first and does not reach this — after removing every carrier claim from LWO, ODS, HRK, DIA,
 * UIP and ZTU, all six still said the airport "serves domestic and international flights" in
 * most locales, because the whole paragraph is framed as a working airport.
 */
export function sourcedNoCommercialService(iata: string): boolean {
  return getWikiRoutes(iata)?.status === 'no_commercial_service';
}

let sizes: Record<string, string> | null = null;
function getSizes(): Record<string, string> {
  if (sizes) return sizes;
  try {
    const p = path.join(process.cwd(), 'data', 'airport-size.json');
    sizes = (JSON.parse(fs.readFileSync(p, 'utf8')) as { airports?: Record<string, string> }).airports ?? {};
  } catch { sizes = {}; }
  return sizes;
}

/** Size classes nobody searches for by name. See isUnfillable(). */
const MINOR = new Set(['small_airport', 'heliport', 'seaplane_base', 'closed', 'balloonport']);

/**
 * A page that promises a flight board it can never show.
 *
 * These are the airports our probe zeroed and OurAirports contradicts, so serviceLevel() calls
 * them UNKNOWN — correctly, because publishing "no scheduled flights" about them would be a
 * false claim. But unknown also means the warmer skips them (dueAirports only walks airports
 * with a positive count), so the board stays empty forever and the page says "live board data
 * is not available right now" in perpetuity. Re-probing all 1,102 on 2026-07-26 settled it:
 * 42 do return a schedule and were moved into the measured set; the remaining 1,060 return
 * nothing under any code.
 *
 * At twelve locales that is 12,720 URLs asking for an index slot on a site with 1,770 pages
 * indexed in total — crawl budget spent to arrive at an absent feature. Google already declines
 * them; saying so ourselves stops the requests.
 *
 * Size is the gate, and it has to be: 62 of the 1,060 are large airports — Adana, Dakar, Al
 * Maktoum, Groningen, Karlovy Vary — where the About paragraph, the guides and the FAQ do
 * answer the query even with no board. Only the 428 small fields, heliports and seaplane bases
 * are dropped. There is no live traffic signal to use instead: not one of the 1,060 appears in
 * any of the 2,778 queries Yandex Webmaster reports for the site.
 *
 * `follow` stays on at the call sites — the routes, nearest-airport and navigation links below
 * are still worth crawling from here.
 */
export function isUnfillable(iata: string): boolean {
  if (serviceLevel(iata) !== null) return false;      // measured, either way — not this case
  // Published airline/destination facts make the page worth indexing again, whatever its size.
  // That is the point of scripts/gen-wiki-routes.mjs: hiding a page is the cheap answer to
  // "the board is empty", and filling it is the real one. An airport with a routes section
  // answers "who flies to X and where to" — which is the question people actually bring to a
  // small airport — so it stops being a page about an absent feature.
  if (hasWikiAirlines(iata)) return false;
  return MINOR.has(getSizes()[iata] ?? '');
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
  const served: T[] = [], unserved: T[] = [], unknown: T[] = [];
  for (const a of airports) {
    // Via serviceLevel(), not the raw map, so an airport our probe zeroed but OurAirports
    // contradicts lands in `unknown` rather than being counted as proof of no service. Reading
    // the map directly is what made /airports/norway advertise "8 of 56 have scheduled
    // passenger service" when the real figure is around 45.
    const v = serviceLevel(a.iata);
    if (v === null) unknown.push(a);
    else if (v > 0) served.push(a);
    else unserved.push(a);
  }
  return { served, unserved, unknown };
}

/** Worldwide counts straight from the measurement file, for the /airports index. */
export function worldServiceCounts(): { probed: number; withService: number; empty: number; generated: string | null } {
  const codes = Object.keys(getServiceData());
  const levels = codes.map(serviceLevel);
  return {
    // `probed` stays the full set of codes we measured — that is what the site "tracks", and
    // shrinking it here would have made /airports announce 4,489 airports while every other
    // surface says 6,069. `withService` + `empty` no longer sum to it, which is precisely the
    // signal the caller uses to pick the partial wording instead of claiming a full breakdown.
    probed: codes.length,
    withService: levels.filter(n => n !== null && n > 0).length,
    empty: levels.filter(n => n === 0).length,
    generated: serviceMeasuredOn(),
  };
}

/**
 * Mega-tier airports (>= the top tier's minFlights measured departures/day), excluding
 * closed ones. Used by the sitemap to advertise arrivals/departures subpages: these boards
 * are always warm, so the subpages always carry rows and pass their own robots gate.
 *
 * Deliberately SEPARATE from getStaticIataCodes(): that 30-airport list also drives
 * build-time prerendering, and widening it to the mega tier would add ~1,370 prerendered
 * pages. The sitemap tier costs nothing; the prerender tier costs build time and disk.
 */
export function getMegaIataCodes(): string[] {
  const svc = getServiceData();
  const min = TIERS[0].minFlights;
  return Object.entries(svc)
    .filter(([iata, n]) => n >= min && !getAirport(iata)?.closed)
    .map(([iata]) => iata)
    .sort();
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
