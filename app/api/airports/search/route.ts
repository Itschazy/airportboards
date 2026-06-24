import { NextRequest, NextResponse } from 'next/server';
import { searchAirports } from '@/lib/airports';
import { localizeResults } from '@/lib/localize-results';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  const airports = localizeResults(searchAirports(q, 10), locale);
  return NextResponse.json({ airports });
}
