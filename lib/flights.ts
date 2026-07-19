import airports from '@/data/airports.json';
import airlines from '@/data/airlines.json';
import { getCityName } from '@/lib/places';
import { getFresh, getStale, getStaleTs, put, canSpend, spend, noteProviderLimit, type SpendKind } from '@/lib/flightStore';
import { getActiveEventAirports } from '@/lib/event-content';
import { dueAirports, tickBudget } from '@/lib/warm';

const AIRLABS_KEY = process.env.AIRLABS_API_KEY || '';
export const CACHE_SECONDS = 60;
const MAX_FLIGHTS = 80;

export type AirlabsFlight = {
  airline_iata: string;
  flight_iata: string;
  flight_number: string;
  aircraft_icao?: string | null;
  cs_flight_iata?: string | null;
  dep_iata: string;
  dep_terminal?: string;
  dep_gate?: string;
  dep_time: string;
  dep_time_ts?: number;
  dep_estimated?: string | null;
  dep_estimated_ts?: number | null;
  dep_delayed?: number | null;
  arr_iata: string;
  arr_terminal?: string;
  arr_gate?: string;
  arr_baggage?: string | null;
  arr_time: string;
  arr_time_ts?: number;
  arr_estimated?: string | null;
  arr_estimated_ts?: number | null;
  arr_delayed?: number | null;
  status: string;
};

// De-dupe concurrent live fetches of the same query (thundering-herd guard).
const inflight = new Map<string, Promise<AirlabsFlight[]>>();

const CITY_BY_IATA: Record<string, string> = {};
for (const a of airports as { iata: string; city: string }[]) {
  if (a.iata) CITY_BY_IATA[a.iata] = a.city;
}
export const AIRLINE = airlines as Record<string, string>;
export const airlineName = (iata: string) => AIRLINE[iata] ?? AIRLINE[`${iata}*`] ?? iata;

function timePart(datetime: string | null | undefined): string {
  if (!datetime) return '';
  return (datetime.split(' ')[1] ?? '').slice(0, 5);
}

function airportLabel(iata: string, locale: string): string {
  const city = CITY_BY_IATA[iata];
  if (!city) return iata;
  return `${getCityName(city, locale)} (${iata})`;
}

export function mapStatus(f: AirlabsFlight, direction: 'departures' | 'arrivals'): string {
  if (f.status === 'cancelled' || f.status === 'diverted') return 'cancelled';
  if (direction === 'arrivals') {
    if (f.status === 'landed') return 'baggage';
    // airlabs often lags the 'landed' status — if the (estimated) arrival time has
    // already passed, the flight is on the ground, not "arriving now / on schedule".
    const arrTs = f.arr_estimated_ts || f.arr_time_ts;
    if (arrTs && arrTs <= Date.now() / 1000) return 'baggage';
    if ((f.arr_delayed ?? 0) > 15) return 'delayed';
    return 'ontime';
  }
  if (f.status === 'active' || f.status === 'landed') return 'departed';
  // Mirror of the arrivals guard above: airlabs lags the status field, so a flight whose
  // (estimated) departure time has passed is gone, whatever `dep_delayed` still says. This
  // check used to sit BELOW the delay check, which left departed flights showing "Delayed"
  // indefinitely — JFK was advertising seven of them 1.5 hours after pushback. Worse, the
  // delay statistics line counts anything not 'departed', so those ghosts inflated both its
  // numerator and its denominator, corrupting the one original figure the hub pages publish.
  const depTs = f.dep_estimated_ts || f.dep_time_ts;
  const minsUntil = depTs ? (depTs - Date.now() / 1000) / 60 : null;
  if (minsUntil !== null && minsUntil <= 0) return 'departed';
  if ((f.dep_delayed ?? 0) > 15) return 'delayed';
  if (minsUntil !== null) {
    if (minsUntil <= 10) return 'finalcall';
    if (minsUntil <= 30) return 'boarding';
  }
  return 'ontime';
}

export function mapFlight(f: AirlabsFlight, direction: 'departures' | 'arrivals', locale: string) {
  const flightNum = (f.flight_iata && f.flight_iata.replace('-', ' ').trim())
    || [f.airline_iata, f.flight_number].filter(Boolean).join(' ').trim()
    || '—';
  const airline   = airlineName(f.airline_iata);
  const status    = mapStatus(f, direction);
  const scheduled = timePart(direction === 'departures' ? f.dep_time : f.arr_time);
  const estimated = timePart(direction === 'departures' ? f.dep_estimated : f.arr_estimated);
  // Show the effective (estimated/actual) time as the primary time whenever it
  // differs from scheduled — this keeps the displayed time CONSISTENT with the
  // sort key (fetchRaw orders by the estimated timestamp), so the list never looks
  // out of order. The scheduled time is rendered struck-through next to it.
  const actual    = estimated && estimated !== scheduled ? estimated : undefined;
  const gate     = direction === 'departures' ? f.dep_gate    : f.arr_gate;
  const terminal = direction === 'departures' ? f.dep_terminal : f.arr_terminal;
  const baggage  = direction === 'arrivals' ? f.arr_baggage : undefined;
  const aircraft = f.aircraft_icao || undefined;
  const delay    = (direction === 'departures' ? f.dep_delayed : f.arr_delayed) || undefined;
  return {
    flight: flightNum,
    airline,
    arrIata: f.arr_iata,
    depIata: f.dep_iata,
    airlineIata: f.airline_iata,
    ...(direction === 'departures'
      ? { destination: airportLabel(f.arr_iata, locale) }
      : { origin:      airportLabel(f.dep_iata, locale) }),
    scheduled,
    ...(actual ? { actual } : {}),
    ...(gate     ? { gate }     : {}),
    ...(terminal ? { terminal } : {}),
    ...(baggage  ? { baggage }  : {}),
    ...(aircraft ? { aircraft } : {}),
    ...(delay    ? { delay }    : {}),
    status,
  };
}

export type FlightRow = ReturnType<typeof mapFlight>;

// Show arrivals that landed within the last ~2h, so people meeting a flight can
// see when it touched down (could have been 10 min ago).
const RECENT_ARR_WINDOW = 2 * 60 * 60;
const RECENT_ARR_MAX = 50; // cap recently-landed shown, so upcoming arrivals still fit

// Read flight schedules for a query (board / route / flight), served from the persistent
// store. airlabs is only contacted on the HUMAN-facing path (`opts.live`) and only while
// under the monthly budget — SSR page renders (which crawlers trigger across 6072 airports)
// pass live:false and NEVER spend quota, so airlabs cost is decoupled from crawl volume.
// Falls back to stale store data, then empty. Never throws.
export async function fetchRaw(
  query: string,
  direction: 'departures' | 'arrivals' = 'departures',
  opts: { live?: boolean; kind?: SpendKind } = {},
): Promise<AirlabsFlight[]> {
  const cacheKey = `${direction}:${query}`;
  const fresh = getFresh(cacheKey);
  if (fresh) return fresh;
  if (!opts.live || !AIRLABS_KEY || !canSpend()) return getStale(cacheKey) ?? [];
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const p = doFetch(query, direction, cacheKey, opts.kind ?? 'human').finally(() => inflight.delete(cacheKey));
  inflight.set(cacheKey, p);
  return p;
}

async function doFetch(query: string, direction: 'departures' | 'arrivals', cacheKey: string, kind: SpendKind): Promise<AirlabsFlight[]> {
  const url = `https://airlabs.co/api/v9/schedules?${query}&api_key=${AIRLABS_KEY}`;
  let json: {
    response?: AirlabsFlight[];
    error?: { message?: string };
    request?: { key?: { limits_by_month?: number } };
  };
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    spend(kind); // any answered airlabs request counts against the monthly budget
    if (!res.ok) return getStale(cacheKey) ?? [];
    json = await res.json();
  } catch {
    return getStale(cacheKey) ?? []; // network/timeout — keep serving last good data
  }
  // Every response echoes the real monthly allowance for our key. Recording it lets the
  // budget clamp itself to what the plan actually is, instead of trusting an env var that
  // was set in anticipation of an upgrade that had not landed. Done before the validity
  // checks below on purpose: an error response still carries an accurate limit.
  noteProviderLimit(json?.request?.key?.limits_by_month);
  if (!json || json.error || !Array.isArray(json.response)) return getStale(cacheKey) ?? [];
  let raw = (json.response as AirlabsFlight[]).filter(f => !f.cs_flight_iata);
  const now = Date.now() / 1000;
  const tsOf = (f: AirlabsFlight) => (direction === 'arrivals'
    ? (f.arr_estimated_ts || f.arr_time_ts)
    : (f.dep_estimated_ts || f.dep_time_ts)) || 0;

  if (direction === 'arrivals') {
    // Single ascending timeline by arrival time: earliest recent landing (up to ~2h
    // ago) at the top → most recent → upcoming. Cap the recent block (keeping the
    // MOST recent ones) so a busy hub still shows plenty of upcoming arrivals.
    const recent = raw
      .filter(f => { const t = tsOf(f); return t >= now - RECENT_ARR_WINDOW && t < now; })
      .sort((a, b) => tsOf(a) - tsOf(b))
      .slice(-RECENT_ARR_MAX);
    const upcoming = raw.filter(f => tsOf(f) >= now).sort((a, b) => tsOf(a) - tsOf(b));
    raw = [...recent, ...upcoming];
  } else {
    // Departures: next-to-depart first, then recently departed (most recent first).
    raw.sort((a, b) => {
      const ta = tsOf(a), tb = tsOf(b);
      const aUp = ta >= now, bUp = tb >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? ta - tb : tb - ta;
    });
  }

  raw = raw.slice(0, MAX_FLIGHTS);
  put(cacheKey, raw);
  return raw;
}

// High-level helpers.
// Each helper sanity-filters the raw response to rows that ACTUALLY match what was
// requested. airlabs returns a fixed demo set (always the same ~6 Russian flights,
// incl. a nonsensical SVO→SVO) when the API key is invalid / over-quota — without this
// guard every airport board rendered identical fake flights (catastrophic duplicate
// content + user-facing fake data). The filter is a no-op when real data is returned.
const norm = (s?: string) => (s || '').toUpperCase().replace(/[\s-]/g, '');

// `live` = may this call spend airlabs quota? Pages (SSR / crawler-triggered) pass false
// (read store only). The client /api/* path passes true for human (non-bot) requests.
export async function getBoard(iata: string, direction: 'departures' | 'arrivals', locale: string, live = false, kind: SpendKind = 'human'): Promise<FlightRow[]> {
  const code = iata.toUpperCase();
  const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  const raw = await fetchRaw(param, direction, { live, kind });
  const own = raw.filter(f => (direction === 'departures' ? f.dep_iata : f.arr_iata) === code);
  return own.map(f => mapFlight(f, direction, locale));
}

/** When the stored board for this airport/direction was last written by airlabs, or null.
 *  This is the age of the DATA, which is not the same as when we answered the request —
 *  a tail airport is refreshed daily, so a board served instantly can still be a day old.
 *  The UI shows this rather than the response time, so "updated now" is never a lie. */
export function getBoardFetchedAt(iata: string, direction: 'departures' | 'arrivals'): number | null {
  const code = iata.toUpperCase();
  const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  return getStaleTs(`${direction}:${param}`);
}

export async function getRoute(from: string, to: string, locale: string, live = false): Promise<FlightRow[]> {
  const F = from.toUpperCase(), T = to.toUpperCase();
  let raw = await fetchRaw(`dep_iata=${F}&arr_iata=${T}`, 'departures', { live });
  // The pair query has its own store key ("dep_iata=LHR&arr_iata=JFK") which the warmer
  // never writes — it warms whole boards ("dep_iata=LHR"). So for a crawler, which cannot
  // trigger a live fetch, every route page was permanently empty and told the world "no
  // direct flights found today" about routes that run several times a day. The origin's
  // warmed board already contains those flights: filter it. No extra airlabs spend, same
  // store, and the noindex-when-empty guard still holds for routes that genuinely have none.
  if (!raw.length) {
    const board = await fetchRaw(`dep_iata=${F}`, 'departures', { live });
    raw = board.filter(f => f.arr_iata === T);
  }
  const own = raw.filter(f => f.dep_iata === F && f.arr_iata === T);
  return own.map(f => mapFlight(f, 'departures', locale));
}

export async function getFlightByNumber(flightIata: string, locale: string, live = false): Promise<FlightRow | null> {
  const code = norm(flightIata);
  const raw = await fetchRaw(`flight_iata=${flightIata}`, 'departures', { live });
  const match = raw.filter(f => norm(f.flight_iata) === code);
  if (!match.length) return null;
  // pick the soonest upcoming (or most recent) instance
  return mapFlight(match[0], 'departures', locale);
}

export async function getAirlineFlights(iata: string, locale: string, live = false): Promise<FlightRow[]> {
  const code = iata.toUpperCase();
  const raw = await fetchRaw(`airline_iata=${code}`, 'departures', { live });
  const own = raw.filter(f => (f.airline_iata || '').toUpperCase() === code);
  return own.map(f => mapFlight(f, 'departures', locale));
}

// Airline directory (from airlines.json; '*' keys are airlabs' secondary assignments).
export function getAirline(code: string): string | undefined {
  const u = code.toUpperCase();
  return AIRLINE[u] ?? AIRLINE[`${u}*`];
}
export function getAirlines(): { code: string; name: string }[] {
  return Object.entries(AIRLINE)
    .filter(([k]) => /^[A-Z0-9]{2}$/.test(k))
    .map(([code, name]) => ({ code, name }));
}

// Hubs kept warm by the background refresher (instrumentation.ts) so their boards have
// fresh live data without a per-render airlabs call. Bounded + budget-checked:
// ~WARM_AIRPORTS × 2 directions × (24h / WARM_INTERVAL_MIN) requests/day.
const WARM_HUBS = [
  'JFK','LHR','CDG','DXB','SVO','DME','VKO','LED','SIN','HND','NRT','LAX','SFO','ORD','ATL','DFW','DEN','MIA','BOS','SEA',
  'FRA','AMS','IST','SAW','ICN','PEK','PVG','CAN','HKG','BKK','KUL','DEL','BOM','MAD','BCN','FCO','MUC','ZRH','VIE','CPH',
  'OSL','ARN','HEL','WAW','LIS','ATH','SVX','OVB','AER','KZN','KRR','ROV','UFA','GOJ','MRV','YYZ','YVR','GRU','GIG','MEX','SYD',
];

/** Refresh whatever is most overdue, within this run's share of the monthly budget.
 *
 *  Airports are tiered by real scheduled-flight volume (see lib/warm.ts), so coverage no
 *  longer depends on someone remembering to add a busy airport to a list — which is how
 *  Phuket, Cagliari and Trabzon ended up serving empty boards. Airports of imminent events
 *  jump the queue so an event guide's "money block" never links to a cold board.
 *
 *  Falls back to the legacy fixed hub list until scripts/discover-schedules.mjs has
 *  produced data/airport-service.json.
 */
export async function warmHubs(): Promise<{
  warmed: number; skippedBudget: number; eventAirports: string[]; tiers: Record<string, number>;
}> {
  const eventAirports = getActiveEventAirports();
  const tiers: Record<string, number> = {};
  if (!AIRLABS_KEY) return { warmed: 0, skippedBudget: 0, eventAirports, tiers };

  const due = dueAirports();
  // Events first, then the most overdue. Legacy list only while service data is missing.
  //
  // Event airports are prepended, which put them OUTSIDE the overdue filter entirely: one was
  // refreshed on every two-hourly run regardless of its tier, so ANR — a small field with one
  // departure a day and a 24-hour target — was being warmed twelve times a day while nothing
  // in its tier got touched at all. Six of them cost ~5% of a budget already in deficit.
  // Priority is worth keeping; exemption is not. An hour is well inside every tier's target,
  // so an event airport still gets far more attention than its size would earn it.
  const EVENT_MIN_AGE_MS = 60 * 60_000;
  const now = Date.now();
  const staleEvents = eventAirports.filter(iata => {
    const ts = getStaleTs(`departures:dep_iata=${iata}`);
    return !ts || now - ts >= EVENT_MIN_AGE_MS;
  });
  const queue: string[] = due.length
    ? [...staleEvents, ...due.map(d => d.iata)]
    : [...staleEvents, ...WARM_HUBS];
  const tierByIata = new Map(due.map(d => [d.iata, d.tier.name]));

  const budget = tickBudget();
  let spentHere = 0, warmed = 0;
  const seen = new Set<string>();

  for (const iata of queue) {
    if (seen.has(iata)) continue;
    seen.add(iata);
    if (spentHere + 2 > budget || !canSpend()) break;
    try { await fetchRaw(`dep_iata=${iata}`, 'departures', { live: true, kind: 'warm' }); } catch { /* ignore */ }
    try { await fetchRaw(`arr_iata=${iata}`, 'arrivals', { live: true, kind: 'warm' }); } catch { /* ignore */ }
    spentHere += 2;
    warmed++;
    const t = tierByIata.get(iata) ?? 'event/legacy';
    tiers[t] = (tiers[t] ?? 0) + 1;
    await new Promise(r => setTimeout(r, 120)); // gentle stagger
  }
  return { warmed, skippedBudget: Math.max(0, due.length - warmed), eventAirports, tiers };
}
