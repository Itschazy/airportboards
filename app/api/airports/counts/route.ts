import { NextRequest, NextResponse } from 'next/server';
import { getBoard, CACHE_SECONDS } from '@/lib/flights';

// "Popular now" counters. Routed through the same gated store as the boards (no separate
// airlabs calls), and bots never trigger a live fetch — so this can't re-introduce quota burn.
const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|google|baidu|duckduck|facebook|embed|preview|fetch|monitor|lighthouse|headless|wget|curl|python|java|go-http|axios|node-fetch/i;

export async function GET(req: NextRequest) {
  const live = !BOT_RE.test(req.headers.get('user-agent') || '');
  const codes = (req.nextUrl.searchParams.get('codes') || '')
    .split(',').map(c => c.trim().toUpperCase()).filter(Boolean).slice(0, 12);

  const out: Record<string, { dep: number | null; arr: number | null }> = {};
  await Promise.all(codes.map(async c => {
    const [dep, arr] = await Promise.all([
      getBoard(c, 'departures', 'en', live).then(f => f.length || null).catch(() => null),
      getBoard(c, 'arrivals', 'en', live).then(f => f.length || null).catch(() => null),
    ]);
    out[c] = { dep, arr };
  }));

  return NextResponse.json(out, {
    headers: { 'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate` },
  });
}
