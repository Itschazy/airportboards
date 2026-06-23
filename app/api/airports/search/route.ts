import { NextRequest, NextResponse } from 'next/server';
import { searchAirports } from '@/lib/airports';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const airports = searchAirports(q, 10);
  return NextResponse.json({ airports });
}
