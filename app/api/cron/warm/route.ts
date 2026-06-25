import { NextRequest, NextResponse } from 'next/server';
import { warmHubs } from '@/lib/flights';
import { usage } from '@/lib/flightStore';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Background hub warmer, triggered by a system cron (see deploy notes). Token-gated so it
// can't be hammered to spend quota. Idempotent within the store TTL (warm hubs are no-ops).
// Example cron (every 2h):  curl -s "https://airportsboard.live/api/cron/warm?token=XXX"
export async function GET(req: NextRequest) {
  // Allowed if (a) the request is local — the VDS cron curls 127.0.0.1:3000 directly, so
  // nginx hasn't added x-forwarded-for — or (b) a matching CRON_TOKEN is supplied. Either
  // way it's idempotent within the store TTL and hard-capped by the monthly budget.
  const local = !req.headers.get('x-forwarded-for') && !req.headers.get('x-real-ip');
  const token = process.env.CRON_TOKEN || '';
  const authed = local || (!!token && req.nextUrl.searchParams.get('token') === token);
  if (!authed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  await warmHubs();
  return NextResponse.json({ ok: true, ...usage() }, { headers: { 'Cache-Control': 'no-store' } });
}
