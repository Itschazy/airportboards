import type { NextRequest } from 'next/server';

/** Did this request reach us through nginx rather than from the box itself? */
function cameThroughProxy(req: NextRequest): boolean {
  return !!(req.headers.get('x-forwarded-for')
    || req.headers.get('x-forwarded-host')
    || req.headers.get('x-forwarded-proto')
    || req.headers.get('x-real-ip'));
}

function hasToken(req: NextRequest): boolean {
  const token = process.env.CRON_TOKEN || '';
  return !!token && req.nextUrl.searchParams.get('token') === token;
}

function isLoopbackHost(req: NextRequest): boolean {
  const host = req.nextUrl.hostname.toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * Strict operator check, for endpoints that only disclose information.
 *
 * Loopback alone is NOT sufficient, and this is measured rather than theoretical: on
 * production 2026-07-19, /api/airlabs-usage kept answering external callers in full after a
 * host-only check shipped. nginx hands this app a loopback Host for internet traffic too, so
 * every request in the world was passing as "the operator".
 *
 * A request that came through the proxy carries forwarding headers; a curl from the box itself
 * carries none. Requiring both fails closed.
 */
export function isOperatorRequest(req: NextRequest): boolean {
  if (hasToken(req)) return true;
  if (cameThroughProxy(req)) return false;
  return isLoopbackHost(req);
}

/**
 * Looser check, used only by /api/cron/warm.
 *
 * Deliberately NOT the strict rule above. The two comments in this repo disagree about how the
 * VDS actually invokes the warmer — the route says `curl https://airportsboard.live/...?token=`
 * while the auth note says it curls 127.0.0.1:3000 — and there is no VDS access here to settle
 * it. If the cron uses the public URL and CRON_TOKEN is unset on the box, tightening this would
 * silently stop all warming, which is the core of the site's indexing strategy. Breaking that is
 * far worse than the exposure: warmHubs() is idempotent within the store TTL, refuses to exceed
 * the monthly cap, and each call is bounded by tickBudget, so an attacker can at most pull the
 * day's warming earlier — not overspend the plan.
 *
 * OWNER ACTION to close this properly: confirm how the crontab line calls the endpoint, make
 * sure CRON_TOKEN is set in the pm2 environment, then switch this to isOperatorRequest.
 */
export function isCronRequest(req: NextRequest): boolean {
  return hasToken(req) || isLoopbackHost(req);
}
