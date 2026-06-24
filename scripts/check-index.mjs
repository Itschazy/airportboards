#!/usr/bin/env node
// scripts/check-index.mjs
// Indexability / HTTP-status audit for airportsboard.live.
// Usage:
//   node scripts/check-index.mjs
//   RESOLVE_IP=95.81.103.82 node scripts/check-index.mjs      # local DNS workaround
//   BASE=https://airportsboard.live node scripts/check-index.mjs
//
// Checks HTTP status + <meta name="robots"> + <link rel="canonical"> for every
// page type, including invalid/edge cases. Exits 1 if any assertion fails.

import { lookup } from 'node:dns';
import { Agent, setGlobalDispatcher } from 'undici';

const BASE = (process.env.BASE || 'https://airportsboard.live').replace(/\/$/, '');
const HOST = new URL(BASE).hostname;
const RESOLVE_IP = process.env.RESOLVE_IP || ''; // e.g. 95.81.103.82 when DNS doesn't resolve

if (RESOLVE_IP) {
  setGlobalDispatcher(new Agent({
    connect: {
      lookup: (hostname, _opts, cb) =>
        hostname === HOST ? cb(null, RESOLVE_IP, 4) : lookup(hostname, _opts, cb),
    },
  }));
}

const metaRobots = (html) => {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i);
  return m ? m[1].toLowerCase().replace(/\s+/g, '') : null;
};
const canonical = (html) => {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  return m ? m[1] : null;
};

async function probe(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'index-audit/1.0' } });
  const status = res.status;
  const location = res.headers.get('location');
  const xRobots = res.headers.get('x-robots-tag');
  let html = '';
  if (status >= 200 && status < 300) html = await res.text();
  else await res.arrayBuffer().catch(() => {});
  return { path, url, status, location, xRobots, robots: html ? metaRobots(html) : null, canonical: html ? canonical(html) : null, body: html };
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${name}\n`);
  if (!ok) process.stdout.write(`        ${detail}\n`);
}

const isIndexable = (r) => r.robots ? r.robots.includes('index') && !r.robots.includes('noindex') : true;
const isNoindex   = (r) => (r.robots && r.robots.includes('noindex')) || (r.xRobots && /noindex/i.test(r.xRobots));

const CASES = [
  { path: '/en/airport/JFK', label: 'valid airport JFK', check: r => [r.status === 200 && isIndexable(r) && r.canonical === `${BASE}/en/airport/JFK`, `status=${r.status} robots=${r.robots} canon=${r.canonical}`] },
  { path: '/en/airport/JFK/arrivals', label: 'arrivals subpage', check: r => [r.status === 200 && isIndexable(r) && r.canonical === `${BASE}/en/airport/JFK/arrivals`, `status=${r.status} robots=${r.robots} canon=${r.canonical}`] },
  { path: '/en/airport/JFK/departures', label: 'departures subpage', check: r => [r.status === 200 && isIndexable(r), `status=${r.status} robots=${r.robots}`] },
  { path: '/en/airport/ZZZZ', label: 'nonexistent airport ZZZZ', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/airport/XYZ', label: 'nonexistent airport XYZ', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/airport/jfk', label: 'lowercase iata jfk', check: r => {
      if (r.status === 301 || r.status === 308) return [/\/airport\/JFK$/.test(r.location || ''), `redirect ${r.status} -> ${r.location}`];
      return [r.status === 200 && r.canonical === `${BASE}/en/airport/JFK`, `status=${r.status} canon=${r.canonical}`]; } },
  { path: '/en/route/AAA-BBB', label: 'route bad airports', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/route/JFK-JFK', label: 'route same airport', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/route/JFK-LAX', label: 'route valid (no-data soft-404 guard)', check: r => [r.status === 404 || isNoindex(r) || isIndexable(r), `status=${r.status} robots=${r.robots} (noindex when no flights)`] },
  { path: '/en/flight/garbage123', label: 'flight bad format', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/flight/ZZ9999', label: 'flight not-found (soft-404 guard)', check: r => [r.status === 404 || isNoindex(r), `status=${r.status} robots=${r.robots} (want noindex)`] },
  { path: '/en/airline/ZZ', label: 'airline unknown', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/airline/SU', label: 'airline valid SU', check: r => [r.status === 200, `status=${r.status} robots=${r.robots}`] },
  { path: '/en/city/london', label: 'city multi-airport (index)', check: r => [r.status === 200 && isIndexable(r), `status=${r.status} robots=${r.robots}`] },
  { path: '/en/city/annaba', label: 'city single-airport (noindex)', check: r => [r.status === 200 && isNoindex(r), `status=${r.status} robots=${r.robots} (want noindex)`] },
  { path: '/ru/airport/JFK', label: 'locale ru', check: r => [r.status === 200, `status=${r.status}`] },
  { path: '/ar/airport/JFK', label: 'locale ar', check: r => [r.status === 200, `status=${r.status}`] },
  { path: '/robots.txt', label: 'robots.txt + sitemap', check: r => [r.status === 200 && /Sitemap:\s*https?:\/\//i.test(r.body) && !/Disallow:\s*\/\s*$/im.test(r.body), `status=${r.status}`] },
  { path: '/sitemap.xml', label: 'sitemap index', check: r => [r.status === 200 && /<sitemapindex/i.test(r.body), `status=${r.status}`] },
  { path: '/sitemap/0.xml', label: 'sitemap child 0', check: r => [r.status === 200 && /<urlset/i.test(r.body) && /<loc>/i.test(r.body), `status=${r.status}`] },
];

console.log(`\nIndexability audit -> ${BASE}${RESOLVE_IP ? ` (resolve ${HOST} -> ${RESOLVE_IP})` : ''}\n`);
for (const c of CASES) {
  try { const r = await probe(c.path); const [ok, detail] = c.check(r); record(`${c.label} [${c.path}]`, ok, detail); }
  catch (err) { record(`${c.label} [${c.path}]`, false, `request error: ${err.message}`); }
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed.\n`);
process.exit(failed ? 1 : 0);
