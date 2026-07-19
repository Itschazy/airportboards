import { NextRequest, NextResponse } from 'next/server';
import { usage } from '@/lib/flightStore';
import { isOperatorRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Monitor airlabs spend for the current month vs the effective cap.
//
// Operator-only: the full figures name the size of the paid plan and how much of it is left,
// which is exactly the reconnaissance an attempt to drain the quota would want. Crawlers cannot
// spend quota structurally, but a flood of non-bot requests across distinct airports can, and
// this endpoint would have handed that attacker a progress bar. Public callers get liveness only.
//
//   GET /api/airlabs-usage                  -> { ok: true }
//   GET /api/airlabs-usage?token=CRON_TOKEN -> full usage figures
//   (on-box, from the VDS itself, no token is needed)
export function GET(req: NextRequest) {
  if (!isOperatorRequest(req)) {
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(usage(), { headers: { 'Cache-Control': 'no-store' } });
}
