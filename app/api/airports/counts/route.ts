import { NextRequest, NextResponse } from 'next/server';
import { getBoard, CACHE_SECONDS } from '@/lib/flights';

// "Popular now" counters on the homepage.
//
// These are read-only from the store and NEVER spend airlabs quota. They used to: the handler
// set live=true for anything that did not look like a bot, and it accepts up to 12 codes,
// each fetched in both directions — so a single request from an ordinary browser
// User-Agent could cost 24 paid calls, and a loop over distinct codes could drain the
// month's visitor reserve in about an hour. Nothing in a decorative counter row justifies
// that: the tiered warmer already keeps these airports current, the homepage shows the
// busiest airports in the world, and a count that is minutes stale is indistinguishable from
// a count that is not. The board the visitor actually opens still fetches live, via
// /api/flights — that is the request worth paying for.
export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get('codes') || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 12);

  const out: Record<string, { dep: number | null; arr: number | null }> = {};
  await Promise.all(codes.map(async c => {
    const [dep, arr] = await Promise.all([
      getBoard(c, 'departures', 'en', false).then(f => f.length || null).catch(() => null),
      getBoard(c, 'arrivals', 'en', false).then(f => f.length || null).catch(() => null),
    ]);
    out[c] = { dep, arr };
  }));

  return NextResponse.json(out, {
    headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
  });
}
