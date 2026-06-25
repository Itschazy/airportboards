import { NextResponse } from 'next/server';
import { usage } from '@/lib/flightStore';

export const dynamic = 'force-dynamic';

// Monitor airlabs spend for the current month vs the configured cap.
// GET /api/airlabs-usage -> { month, count, cap, remaining }
export function GET() {
  return NextResponse.json(usage(), { headers: { 'Cache-Control': 'no-store' } });
}
