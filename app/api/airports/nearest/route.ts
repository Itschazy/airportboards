import { NextRequest, NextResponse } from 'next/server';
import { nearestAirports } from '@/lib/airports';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lon = parseFloat(req.nextUrl.searchParams.get('lon') || '');
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ airports: [] });
  }
  return NextResponse.json({ airports: nearestAirports(lat, lon, 8) });
}
