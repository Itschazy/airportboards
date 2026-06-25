import { NextRequest, NextResponse } from 'next/server';
import { warmHubs } from '@/lib/flights';
import { usage } from '@/lib/flightStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Background hub warmer, triggered by a system cron (see deploy notes). Token-gated so it
// can't be hammered to spend quota. Idempotent within the store TTL (warm hubs are no-ops).
// Example cron (every 2h):  curl -s "https://airportsboard.live/api/cron/warm?token=XXX"
export async function GET(req: NextRequest) {
  const token = process.env.CRON_TOKEN || '';
  if (!token || req.nextUrl.searchParams.get('token') !== token) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  await warmHubs();
  return NextResponse.json({ ok: true, ...usage() }, { headers: { 'Cache-Control': 'no-store' } });
}
