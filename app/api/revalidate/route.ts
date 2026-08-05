import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isOperatorRequest } from '@/lib/api-auth';
import { locales } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Purge the ISR cache for a path, in every locale, on demand.
//
// Why this exists: a deploy does not reach already-cached pages. City and country pages hold
// `revalidate = 86400`, and the rendered HTML lives in `.next/cache`, which survives both
// `git clean -fd` (the directory is gitignored, and clean without -x leaves ignored files) and
// `next build` (which preserves its cache deliberately). So on 2026-08-05 the city fix went out,
// the sitemap on production immediately dropped the 28 boardless city pages — sitemap.xml is
// generated per request — while /en/city/alamogordo kept serving the previous day's HTML,
// `x-nextjs-cache: HIT`, still promising "arrivals and departures" and still asking to be
// indexed. Content and index instructions disagreeing for a day is exactly the state an AdSense
// re-review should not catch the site in.
//
// Airport pages revalidate every 300s and heal on their own; this is for the 86400s pages.
//
//   GET /api/revalidate?token=…&path=/city/alamogordo   → purges /en/city/alamogordo, /ru/…, ×12
//   GET /api/revalidate?token=…&path=/city/a&path=/city/b   → several at once
//
// Locale-agnostic by design: `path` is given WITHOUT the locale segment, because a content fix
// is never for one language only, and remembering to pass twelve paths is how eleven of them
// stay stale. A path that already starts with a known locale is taken literally instead.
//
// Guarded by isOperatorRequest, NOT isCronRequest. The looser check returns true for any
// loopback Host, and lib/api-auth.ts records why that is not the same as "from the box": nginx
// hands this app a loopback Host for internet traffic too, so isCronRequest is effectively open
// to the world. That was accepted for the warmer, which is idempotent and capped by the airlabs
// budget. It is not acceptable here — forcing a re-render of every page on demand is a CPU
// amplifier on a box that already cannot finish a build inside the deploy's ten-minute window.
// Verified rather than assumed: the first version of this route used isCronRequest and answered
// 200 to a token-less request.
export async function GET(req: NextRequest) {
  if (!isOperatorRequest(req)) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const requested = req.nextUrl.searchParams.getAll('path').filter(Boolean);
  if (!requested.length) {
    return NextResponse.json({ ok: false, error: 'path is required' }, { status: 400 });
  }

  const purged: string[] = [];
  for (const raw of requested) {
    const p = raw.startsWith('/') ? raw : `/${raw}`;
    const first = p.split('/')[1];
    const targets = (locales as readonly string[]).includes(first)
      ? [p]
      : (locales as readonly string[]).map(l => `/${l}${p}`);
    for (const t of targets) {
      try { revalidatePath(t); purged.push(t); } catch { /* one bad path must not abort the rest */ }
    }
  }

  return NextResponse.json({ ok: true, purged: purged.length, paths: purged });
}
