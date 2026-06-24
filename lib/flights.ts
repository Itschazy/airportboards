import airports from '@/data/airports.json';
import airlines from '@/data/airlines.json';
import { getCityName } from '@/lib/places';

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

// In-memory dedup cache for raw airlabs payloads (PM2-persistent in prod).
const rawCache = new Map<string, { ts: number; data: AirlabsFlight[] }>();

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
  const flightNum = f.flight_iata?.replace('-', ' ') ?? `${f.airline_iata} ${f.flight_number}`;
  const airline   = airlineName(f.airline_iata);
  const status    = mapStatus(f, direction);
  const isDelay   = status === 'delayed';
  const scheduled = timePart(direction === 'departures' ? f.dep_time : f.arr_time);
  const actual    = isDelay
    ? timePart(direction === 'departures' ? (f.dep_estimated) : (f.arr_estimated))
    : undefined;
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
const RECENT_ARR_MAX = 20; // cap recently-landed shown, so upcoming arrivals still fit

// Fetch + cache raw airlabs schedules for an arbitrary query (board / route / flight).
// `direction` controls which timestamp drives the ordering (dep vs arr time).
export async function fetchRaw(query: string, direction: 'departures' | 'arrivals' = 'departures'): Promise<AirlabsFlight[]> {
  if (!AIRLABS_KEY) return [];
  const cacheKey = `${direction}:${query}`;
  const hit = rawCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_SECONDS * 1000) return hit.data;
  rawCache.delete(cacheKey);
  const url = `https://airlabs.co/api/v9/schedules?${query}&api_key=${AIRLABS_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`airlabs ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || 'airlabs error');
  let raw = (json.response as AirlabsFlight[] | undefined || []).filter(f => !f.cs_flight_iata);
  const now = Date.now() / 1000;
  const tsOf = (f: AirlabsFlight) => (direction === 'arrivals'
    ? (f.arr_estimated_ts || f.arr_time_ts)
    : (f.dep_estimated_ts || f.dep_time_ts)) || 0;

  if (direction === 'arrivals') {
    // Recently landed (last ~2h, most-recent first) above upcoming arrivals (soonest
    // first). Cap the recent block so a busy hub still shows plenty of upcoming.
    const recent = raw
      .filter(f => { const t = tsOf(f); return t >= now - RECENT_ARR_WINDOW && t < now; })
      .sort((a, b) => tsOf(b) - tsOf(a))
      .slice(0, RECENT_ARR_MAX);
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
  if (rawCache.size >= 3000) { const oldest = rawCache.keys().next().value; if (oldest) rawCache.delete(oldest); }
  rawCache.set(cacheKey, { ts: Date.now(), data: raw });
  return raw;
}

// High-level helpers
export async function getBoard(iata: string, direction: 'departures' | 'arrivals', locale: string): Promise<FlightRow[]> {
  const param = direction === 'departures' ? `dep_iata=${iata}` : `arr_iata=${iata}`;
  const raw = await fetchRaw(param, direction);
  return raw.map(f => mapFlight(f, direction, locale));
}

export async function getRoute(from: string, to: string, locale: string): Promise<FlightRow[]> {
  const raw = await fetchRaw(`dep_iata=${from}&arr_iata=${to}`);
  return raw.map(f => mapFlight(f, 'departures', locale));
}

export async function getFlightByNumber(flightIata: string, locale: string): Promise<FlightRow | null> {
  const raw = await fetchRaw(`flight_iata=${flightIata}`);
  if (!raw.length) return null;
  // pick the soonest upcoming (or most recent) instance
  return mapFlight(raw[0], 'departures', locale);
}

export async function getAirlineFlights(iata: string, locale: string): Promise<FlightRow[]> {
  const raw = await fetchRaw(`airline_iata=${iata}`);
  return raw.map(f => mapFlight(f, 'departures', locale));
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
