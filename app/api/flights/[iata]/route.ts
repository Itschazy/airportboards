import { NextRequest, NextResponse } from 'next/server';
import { getBoard, getBoardFetchedAt, CACHE_SECONDS } from '@/lib/flights';

// Bots never spend airlabs quota — they get whatever is already in the store (or empty).
// Only human requests may trigger a live fetch (and only under the monthly budget).
const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|google|baidu|duckduck|facebook|embed|preview|fetch|monitor|lighthouse|headless|wget|curl|python|java|go-http|axios|node-fetch/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iata: string }> }
) {
  const { iata } = await params;
  const code = iata.toUpperCase();
  const direction = (req.nextUrl.searchParams.get('direction') || 'departures') as 'departures' | 'arrivals';
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  const live = !BOT_RE.test(req.headers.get('user-agent') || '');

  let flights: Awaited<ReturnType<typeof getBoard>> = [];
  try { flights = await getBoard(code, direction, locale, live); } catch { /* honest empty */ }

  // Local-dev convenience only: with no key at all, show sample data so the board isn't
  // blank while developing. NEVER in production — prod serves real data or an empty board.
  if (!flights.length && !process.env.AIRLABS_API_KEY && process.env.NODE_ENV !== 'production') {
    return NextResponse.json(mockData(code, direction), {
      headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
    });
  }

  return NextResponse.json(
    // fetchedAt = when airlabs actually produced this data, so the client can label its
    // real age instead of assuming the response time is the data time.
    { iata: code, direction, flights, fetchedAt: getBoardFetchedAt(code, direction) },
    { headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` } }
  );
}

function mockData(iata: string, direction: string) {
  const now = new Date();
  const add = (m: number) => {
    const d = new Date(now.getTime() + m * 60000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const flights = direction === 'departures' ? [
    { flight: 'SU 1404', airline: 'Aeroflot', destination: 'Moscow (SVO)', scheduled: add(-20), status: 'departed' },
    { flight: 'DP 203', airline: 'Pobeda', destination: 'St. Petersburg (LED)', scheduled: add(10), gate: 'B1', status: 'boarding' },
    { flight: 'S7 103', airline: 'S7 Airlines', destination: 'Novosibirsk (OVB)', scheduled: add(30), actual: add(75), gate: 'A5', status: 'delayed' },
    { flight: 'U6 108', airline: 'Ural Airlines', destination: 'Sochi (AER)', scheduled: add(60), gate: 'B2', status: 'ontime' },
  ] : [
    { flight: 'SU 1401', airline: 'Aeroflot', origin: 'Moscow (SVO)', scheduled: add(-40), status: 'baggage' },
    { flight: 'S7 104', airline: 'S7 Airlines', origin: 'Novosibirsk (OVB)', scheduled: add(-10), status: 'arrived' },
    { flight: 'DP 204', airline: 'Pobeda', origin: 'St. Petersburg (LED)', scheduled: add(20), status: 'ontime' },
  ];
  return { iata, direction, mock: true, flights };
}
