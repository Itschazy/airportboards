import airports from '@/data/airports.json';
import airlines from '@/data/airlines.json';
import { getCityName } from '@/lib/places';
import { getFresh, getStale, put, canSpend, spend } from '@/lib/flightStore';

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
  if ((f.dep_delayed ?? 0) > 15) return 'delayed';
  const depTs = f.dep_estimated_ts || f.dep_time_ts;
  if (depTs) {
    const minsUntil = (depTs - Date.now() / 1000) / 60;
    if (minsUntil <= 0)  return 'departed';
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
  opts: { live?: boolean } = {},
): Promise<AirlabsFlight[]> {
  const cacheKey = `${direction}:${query}`;
  const fresh = getFresh(cacheKey);
  if (fresh) return fresh;
  if (!opts.live || !AIRLABS_KEY || !canSpend()) return getStale(cacheKey) ?? [];
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const p = doFetch(query, direction, cacheKey).finally(() => inflight.delete(cacheKey));
  inflight.set(cacheKey, p);
  return p;
}

async function doFetch(query: string, direction: 'departures' | 'arrivals', cacheKey: string): Promise<AirlabsFlight[]> {
  const url = `https://airlabs.co/api/v9/schedules?${query}&api_key=${AIRLABS_KEY}`;
  let json: { response?: AirlabsFlight[]; error?: { message?: string } };
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    spend(); // any answered airlabs request counts against the monthly budget
    if (!res.ok) return getStale(cacheKey) ?? [];
    json = await res.json();
  } catch {
    return getStale(cacheKey) ?? []; // network/timeout — keep serving last good data
  }
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
export async function getBoard(iata: string, direction: 'departures' | 'arrivals', locale: string, live = false): Promise<FlightRow[]> {
  const code = iata.toUpperCase();
  const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  const raw = await fetchRaw(param, direction, { live });
  const own = raw.filter(f => (direction === 'departures' ? f.dep_iata : f.arr_iata) === code);
  return own.map(f => mapFlight(f, direction, locale));
}

export async function getRoute(from: string, to: string, locale: string, live = false): Promise<FlightRow[]> {
  const F = from.toUpperCase(), T = to.toUpperCase();
  const raw = await fetchRaw(`dep_iata=${F}&arr_iata=${T}`, 'departures', { live });
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

/** Refresh the top hubs into the store (bounded, budget-checked). Called on a timer. */
export async function warmHubs(): Promise<void> {
  if (!AIRLABS_KEY) return;
  const n = Number(process.env.WARM_AIRPORTS) || WARM_HUBS.length;
  for (const iata of WARM_HUBS.slice(0, n)) {
    if (!canSpend()) break;
    try { await fetchRaw(`dep_iata=${iata}`, 'departures', { live: true }); } catch { /* ignore */ }
    try { await fetchRaw(`arr_iata=${iata}`, 'arrivals', { live: true }); } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 250)); // gentle stagger
  }
}
