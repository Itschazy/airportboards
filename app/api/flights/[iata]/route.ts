import { NextRequest, NextResponse } from 'next/server';
import airports from '@/data/airports.json';
import airlines from '@/data/airlines.json';

const AIRLABS_KEY = process.env.AIRLABS_API_KEY || '';
const CACHE_SECONDS = 60;
const MAX_FLIGHTS = 80;

// Quick IATA → city lookup from our airports dataset
const CITY_BY_IATA: Record<string, string> = {};
for (const a of airports as { iata: string; city: string }[]) {
  if (a.iata) CITY_BY_IATA[a.iata] = a.city;
}

// IATA → airline display name (1175 carriers from airlabs reference)
const AIRLINE = airlines as Record<string, string>;

type AirlabsFlight = {
  airline_iata: string;
  flight_iata: string;
  flight_number: string;
  aircraft_icao?: string | null;
  // codeshare markers — present on marketing duplicates of an operating flight
  cs_flight_iata?: string | null;
  dep_iata: string;
  dep_terminal?: string;
  dep_gate?: string;
  dep_time: string;          // local airport time "2024-06-23 14:35"
  dep_time_ts?: number;      // absolute epoch seconds
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
  status: string;            // scheduled | active | landed | cancelled | diverted
};

function timePart(datetime: string | null | undefined): string {
  if (!datetime) return '';
  return (datetime.split(' ')[1] ?? '').slice(0, 5);
}

function airportLabel(iata: string): string {
  const city = CITY_BY_IATA[iata];
  return city ? `${city} (${iata})` : iata;
}

// Status from airlabs' own state, refined for the boarding window using
// absolute timestamps (no timezone math — ts is epoch seconds).
function mapStatus(f: AirlabsFlight, direction: 'departures' | 'arrivals'): string {
  if (f.status === 'cancelled' || f.status === 'diverted') return 'cancelled';

  if (direction === 'arrivals') {
    if (f.status === 'landed') return 'baggage';
    if ((f.arr_delayed ?? 0) > 15) return 'delayed';
    return 'ontime';
  }

  // departures — airlabs 'active'/'landed' means it already left
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

function mapFlight(f: AirlabsFlight, direction: 'departures' | 'arrivals') {
  const flightNum = f.flight_iata?.replace('-', ' ') ?? `${f.airline_iata} ${f.flight_number}`;
  const airline   = AIRLINE[f.airline_iata] || f.airline_iata;
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
    ...(direction === 'departures'
      ? { destination: airportLabel(f.arr_iata) }
      : { origin:      airportLabel(f.dep_iata) }),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iata: string }> }
) {
  const { iata } = await params;
  const code = iata.toUpperCase();
  const direction = (req.nextUrl.searchParams.get('direction') || 'departures') as 'departures' | 'arrivals';

  if (!AIRLABS_KEY) {
    return NextResponse.json(mockData(code, direction), {
      headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
    });
  }

  try {
    const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
    const url   = `https://airlabs.co/api/v9/schedules?${param}&api_key=${AIRLABS_KEY}`;

    const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
    if (!res.ok) throw new Error(`airlabs ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'airlabs error');

    // Drop codeshare duplicates — keep only the operating flight, so the
    // board shows each physical flight once instead of 4× per marketing carrier.
    const raw = (json.response as AirlabsFlight[]).filter(f => !f.cs_flight_iata);

    // Order like a real airport board: next-to-depart first (soonest upcoming),
    // then already-departed flights most-recent first.
    const now = Date.now() / 1000;
    const tsOf = (f: AirlabsFlight) =>
      (direction === 'departures'
        ? (f.dep_estimated_ts || f.dep_time_ts)
        : (f.arr_estimated_ts || f.arr_time_ts)) || 0;
    raw.sort((a, b) => {
      const ta = tsOf(a), tb = tsOf(b);
      const aUp = ta >= now, bUp = tb >= now;
      if (aUp !== bUp) return aUp ? -1 : 1;
      return aUp ? ta - tb : tb - ta;
    });

    // Busy hubs now return 500+ rows; cap to the most relevant window
    // (soonest upcoming + recently departed) to keep the board light.
    const flights = raw.slice(0, MAX_FLIGHTS).map(f => mapFlight(f, direction));

    return NextResponse.json(
      { iata: code, direction, flights },
      { headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` } }
    );
  } catch (err) {
    console.error('[flights]', err);
    return NextResponse.json(
      { iata: code, direction, mock: true, flights: mockData(code, direction).flights },
      { status: 200 }
    );
  }
}

function mockData(iata: string, direction: string) {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const t   = `${hh}:${mm}`;
  const add = (m: number) => {
    const d = new Date(now.getTime() + m * 60000);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const flights = direction === 'departures' ? [
    { flight: 'SU 1404', airline: 'Aeroflot',      destination: 'Moscow (SVO)',         scheduled: add(-20),  status: 'departed' },
    { flight: 'DP 203',  airline: 'Pobeda',         destination: 'St. Petersburg (LED)', scheduled: add(10),   gate: 'B1', status: 'boarding' },
    { flight: 'S7 103',  airline: 'S7 Airlines',    destination: 'Novosibirsk (OVB)',    scheduled: add(30),   actual: add(75), gate: 'A5', status: 'delayed' },
    { flight: 'U6 108',  airline: 'Ural Airlines',  destination: 'Sochi (AER)',          scheduled: add(60),   gate: 'B2', status: 'ontime' },
    { flight: 'SU 6',    airline: 'Aeroflot',       destination: 'London (LHR)',         scheduled: add(105),  gate: 'A1', status: 'ontime' },
    { flight: 'PC 901',  airline: 'Pegasus',        destination: 'Antalya (AYT)',        scheduled: add(150),  gate: 'B4', status: 'ontime' },
  ] : [
    { flight: 'SU 1401', airline: 'Aeroflot',       origin: 'Moscow (SVO)',              scheduled: add(-40),  status: 'baggage' },
    { flight: 'S7 104',  airline: 'S7 Airlines',    origin: 'Novosibirsk (OVB)',         scheduled: add(-10),  status: 'arrived' },
    { flight: 'DP 204',  airline: 'Pobeda',         origin: 'St. Petersburg (LED)',      scheduled: add(20),   status: 'ontime' },
    { flight: 'SU 2',    airline: 'Aeroflot',       origin: 'New York (JFK)',            scheduled: add(60),   actual: add(115), status: 'delayed' },
    { flight: 'TK 412',  airline: 'Turkish Airlines', origin: 'Istanbul (IST)',          scheduled: add(160),  status: 'ontime' },
  ];
  return { iata, direction, mock: true, flights };
}
