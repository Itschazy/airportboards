import { NextRequest, NextResponse } from 'next/server';
import { nearestAirports } from '@/lib/airports';
import { localizeResults } from '@/lib/localize-results';

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get('lat') || '');
  const lon = parseFloat(req.nextUrl.searchParams.get('lon') || '');
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ airports: [] });
  }
  return NextResponse.json({ airports: localizeResults(nearestAirports(lat, lon, 8), locale) });
}
