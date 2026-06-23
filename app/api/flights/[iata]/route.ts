import { NextRequest, NextResponse } from 'next/server';

const AERODATABOX_KEY = process.env.AERODATABOX_API_KEY || '';
const CACHE_SECONDS = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iata: string }> }
) {
  const { iata } = await params;
  const code = iata.toUpperCase();
  const { searchParams } = req.nextUrl;
  const direction = searchParams.get('direction') || 'departures'; // arrivals | departures

  if (!AERODATABOX_KEY) {
    // Return mock data when no API key configured
    return NextResponse.json(mockData(code, direction), {
      headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
    });
  }

  try {
    const now = new Date();
    const from = now.toISOString().slice(0, 16);
    const to = new Date(now.getTime() + 12 * 3600 * 1000).toISOString().slice(0, 16);

    const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${code}/${from}/${to}` +
      `?withLeg=false&direction=${direction}&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false`;

    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': AERODATABOX_KEY,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
      next: { revalidate: CACHE_SECONDS },
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    return NextResponse.json(data, {
      headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch flights', mock: true, flights: mockData(code, direction).flights }, { status: 200 });
  }
}

function mockData(iata: string, direction: string) {
  const flights = direction === 'departures' ? [
    { flight: 'SU 1404', airline: 'Aeroflot', destination: 'Moscow (SVO)', scheduled: '14:35', gate: 'A3', status: 'departed' },
    { flight: 'DP 203',  airline: 'Pobeda',   destination: 'St. Petersburg (LED)', scheduled: '14:20', gate: 'B1', status: 'boarding' },
    { flight: 'S7 103',  airline: 'S7 Airlines', destination: 'Novosibirsk (OVB)', scheduled: '15:10', gate: 'A5', status: 'delayed', actual: '15:55' },
    { flight: 'U6 108',  airline: 'Ural Airlines', destination: 'Sochi (AER)', scheduled: '16:00', gate: 'B2', status: 'ontime' },
    { flight: 'SU 6',    airline: 'Aeroflot', destination: 'London (LHR)', scheduled: '16:45', gate: 'A1', status: 'ontime' },
    { flight: 'PC 901',  airline: 'Pegasus',  destination: 'Antalya (AYT)', scheduled: '17:30', gate: 'B4', status: 'ontime' },
  ] : [
    { flight: 'SU 1401', airline: 'Aeroflot', origin: 'Moscow (SVO)', scheduled: '13:50', status: 'arrived' },
    { flight: 'S7 104',  airline: 'S7 Airlines', origin: 'Novosibirsk (OVB)', scheduled: '14:30', status: 'baggage' },
    { flight: 'DP 204',  airline: 'Pobeda',   origin: 'St. Petersburg (LED)', scheduled: '14:55', status: 'ontime' },
    { flight: 'SU 2',    airline: 'Aeroflot', origin: 'New York (JFK)', scheduled: '16:10', status: 'delayed', actual: '17:05' },
    { flight: 'TK 412',  airline: 'Turkish Airlines', origin: 'Istanbul (IST)', scheduled: '18:40', status: 'ontime' },
  ];
  return { iata, direction, mock: true, flights };
}
