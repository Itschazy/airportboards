import { NextRequest, NextResponse } from 'next/server';

const AIRLABS_KEY = process.env.AIRLABS_API_KEY || '';
const CACHE = 60;

async function count(code: string, dir: 'departures' | 'arrivals'): Promise<number | null> {
  if (!AIRLABS_KEY) return null;
  const param = dir === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  try {
    const res = await fetch(`https://airlabs.co/api/v9/schedules?${param}&api_key=${AIRLABS_KEY}`, {
      next: { revalidate: CACHE },
    });
    const json = await res.json();
    if (json.error) return null;
    return (json.response as { cs_flight_iata?: string | null }[]).filter(f => !f.cs_flight_iata).length;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get('codes') || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 12);
  const out: Record<string, { dep: number | null; arr: number | null }> = {};
  await Promise.all(codes.map(async c => {
    const [dep, arr] = await Promise.all([count(c, 'departures'), count(c, 'arrivals')]);
    out[c] = { dep, arr };
  }));
  return NextResponse.json(out, {
    headers: { 'Cache-Control': `s-maxage=${CACHE}, stale-while-revalidate` },
  });
}
