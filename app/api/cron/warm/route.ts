import { NextRequest, NextResponse } from 'next/server';
import { warmHubs } from '@/lib/flights';
import { usage } from '@/lib/flightStore';
import { harvestFromStore } from '@/lib/top-routes';
import { isOperatorRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Background hub warmer, triggered by a system cron (see deploy notes). Token-gated so it
// can't be hammered to spend quota. Idempotent within the store TTL (warm hubs are no-ops).
// Example cron (every 2h):  curl -s "https://airportsboard.live/api/cron/warm?token=XXX"
export async function GET(req: NextRequest) {
  // Operator-only (see lib/api-auth.ts). Idempotent within the store TTL and hard-capped by
  // the monthly budget either way, so this gate is defence in depth rather than the guarantee.
  if (!isOperatorRequest(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const result = await warmHubs();
  // Right after a warm cycle the boards are as fresh as they ever get, so this is the best
  // moment to take a route snapshot. It reads the in-process store — no HTTP, no airlabs
  // call, no quota — and self-throttles to roughly once a day, which is why it can ride the
  // existing 2-hourly cron instead of needing its own entry in the VDS crontab.
  const routes = harvestFromStore();
  // Report what the tiered warmer actually did, so a look at the cron log answers "is the
  // long tail being covered, or is the budget all going to hubs?" without a deploy.
  return NextResponse.json({ ok: true, ...result, routes, ...usage() }, { headers: { 'Cache-Control': 'no-store' } });
}
