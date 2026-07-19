import type { NextRequest } from 'next/server';

/**
 * Is this request from the operator rather than the open internet?
 *
 * True when it arrives on the loopback interface — the VDS cron curls 127.0.0.1:3000 directly,
 * and nginx rewrites Host to the public domain for anything coming from outside — or when it
 * carries the CRON_TOKEN.
 *
 * `req.nextUrl.hostname` is the parsed request host, which is reliable inside route handlers in
 * a way the raw `host` header is not.
 *
 * Shared by every operational endpoint so the rule is stated once. It used to live only in
 * /api/cron/warm, which meant /api/airlabs-usage was published to the world: it reported the
 * size of the paid plan and a live "how much is left" counter. Crawlers structurally cannot
 * spend quota, but a flood of non-bot requests across distinct airports can, and that endpoint
 * would have handed the attacker a progress bar.
 */
export function isOperatorRequest(req: NextRequest): boolean {
  const host = req.nextUrl.hostname.toLowerCase();
  if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return true;
  const token = process.env.CRON_TOKEN || '';
  return !!token && req.nextUrl.searchParams.get('token') === token;
}
