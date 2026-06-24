import { NextRequest, NextResponse } from 'next/server';
import { getBoard, CACHE_SECONDS } from '@/lib/flights';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iata: string }> }
) {
  const { iata } = await params;
  const code = iata.toUpperCase();
  const direction = (req.nextUrl.searchParams.get('direction') || 'departures') as 'departures' | 'arrivals';
  const locale = req.nextUrl.searchParams.get('locale') || 'en';

  if (!process.env.AIRLABS_API_KEY) {
    return NextResponse.json(mockData(code, direction), {
      headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
    });
  }

  try {
    const flights = await getBoard(code, direction, locale);
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
