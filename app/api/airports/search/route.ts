import { NextRequest, NextResponse } from 'next/server';
import { searchAirports } from '@/lib/airports';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ airports: [] });
  const airports = searchAirports(q, 8);
  return NextResponse.json({ airports });
}
