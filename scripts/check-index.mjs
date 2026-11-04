#!/usr/bin/env node
// scripts/check-index.mjs
// Indexability / HTTP-status audit for airportsboard.live.
// Usage:
//   node scripts/check-index.mjs
//   node scripts/check-index.mjs http://localhost:3156
//   RESOLVE_IP=95.81.103.82 node scripts/check-index.mjs      # local DNS workaround
//   BASE=https://airportsboard.live node scripts/check-index.mjs
//
// Checks HTTP status + <meta name="robots"> + <link rel="canonical"> for every
// page type, including invalid/edge cases. Exits 1 if any assertion fails.

import { lookup } from 'node:dns';


// Правила группы `User-Agent: *` из robots.txt: строки после её заголовка до следующего заголовка.
function starGroupBlocksAll(body) {
  let inStar = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) { inStar = ua[1].trim() === '*'; continue; }
    if (inStar && /^disallow:\s*\/\s*$/i.test(line)) return true;
  }
  return false;
}

// Другие локальные SEO-проверки принимают URL первым аргументом. Здесь он раньше
// молча игнорировался: запуск с localhost фактически проверял production и давал
// ложное доказательство для новой сборки. Явный аргумент теперь имеет приоритет
// над BASE; ошибочный ввод останавливает проверку ДО первого сетевого запроса.
const args = process.argv.slice(2);
if (args.length > 1) throw new Error('Usage: node scripts/check-index.mjs [http(s)://host[:port]]');
const BASE = (args[0] || process.env.BASE || 'https://airportsboard.live').replace(/\/$/, '');
const target = new URL(BASE);
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password ||
    target.search || target.hash || target.pathname !== '/') {
  throw new Error('BASE must be an HTTP(S) origin without credentials, path, query or fragment');
}
// Адрес тестового сервера и публичный canonical — разные вещи. На fixture localhost
// canonical намеренно ведёт на production, иначе локальная проверка даёт 4 ложных провала.
const CANONICAL_BASE = (process.env.CANONICAL_BASE || 'https://airportsboard.live').replace(/\/$/, '');
const HOST = new URL(BASE).hostname;
const RESOLVE_IP = process.env.RESOLVE_IP || ''; // e.g. 95.81.103.82 when DNS doesn't resolve

// undici is only needed for the optional DNS-pinning workaround; import it lazily so
// the audit runs on plain DNS (the normal case now) without undici installed.
if (RESOLVE_IP) {
  const { Agent, setGlobalDispatcher } = await import('undici');
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
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'audit-bot' } });
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
  { path: '/en/airport/JFK', label: 'valid airport JFK', check: r => [r.status === 200 && isIndexable(r) && r.canonical === `${CANONICAL_BASE}/en/airport/JFK`, `status=${r.status} robots=${r.robots} canon=${r.canonical}`] },
  { path: '/en/airport/JFK/arrivals', label: 'arrivals subpage', check: r => [r.status === 200 && isIndexable(r) && r.canonical === `${CANONICAL_BASE}/en/airport/JFK/arrivals`, `status=${r.status} robots=${r.robots} canon=${r.canonical}`] },
  // Canonical = the parent: it opens on the same departures board (departures/page.tsx).
  { path: '/en/airport/JFK/departures', label: 'departures subpage (canonical -> parent)', check: r => [r.status === 200 && isIndexable(r) && r.canonical === `${CANONICAL_BASE}/en/airport/JFK`, `status=${r.status} robots=${r.robots} canon=${r.canonical}`] },
  { path: '/en/airport/ZZZZ', label: 'nonexistent airport ZZZZ', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/airport/XYZ', label: 'nonexistent airport XYZ', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/airport/jfk', label: 'lowercase iata jfk', check: r => {
      if (r.status === 301 || r.status === 308) return [/\/airport\/JFK$/.test(r.location || ''), `redirect ${r.status} -> ${r.location}`];
      return [r.status === 200 && r.canonical === `${CANONICAL_BASE}/en/airport/JFK`, `status=${r.status} canon=${r.canonical}`]; } },
  { path: '/en/route/AAA-BBB', label: 'route bad airports', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/route/JFK-JFK', label: 'route same airport', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/route/JFK-LAX', label: 'route valid (no-data soft-404 guard)', check: r => [r.status === 404 || isNoindex(r) || isIndexable(r), `status=${r.status} robots=${r.robots} (noindex when no flights)`] },
  { path: '/en/flight/garbage123', label: 'flight bad format', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  { path: '/en/flight/ZZ9999', label: 'flight not-found (soft-404 guard)', check: r => [r.status === 404 || isNoindex(r), `status=${r.status} robots=${r.robots} (want noindex)`] },
  { path: '/en/airline/ZZ', label: 'airline unknown', check: r => [r.status === 404, `status=${r.status} (want 404)`] },
  // 404 while the airline has no flights (the warmer never writes its key — soft-404 fix of
  // 2026-07-19), noindex when it has some: either way never an indexable 200.
  { path: '/en/airline/SU', label: 'airline valid SU (404, or noindex)', check: r => [r.status === 404 || (r.status === 200 && isNoindex(r)), `status=${r.status} robots=${r.robots} (want 404, or 200 noindex)`] },
  { path: '/en/city/london', label: 'city multi-airport (index)', check: r => [r.status === 200 && isIndexable(r), `status=${r.status} robots=${r.robots}`] },
  { path: '/en/city/annaba', label: 'city single-airport (noindex)', check: r => [r.status === 200 && isNoindex(r), `status=${r.status} robots=${r.robots} (want noindex)`] },
  { path: '/ru/airport/JFK', label: 'locale ru', check: r => [r.status === 200, `status=${r.status}`] },
  { path: '/ar/airport/JFK', label: 'locale ar', check: r => [r.status === 200, `status=${r.status}`] },
  // «Disallow: /» запрещён только в группе `*` — той, по которой ходит индексирующий Googlebot.
  // С 16.10.2026 в файле есть законная группа AdsBot с полным запретом (app/robots.ts), и
  // прежняя проверка «нет такой строки нигде» стала бы ложной тревогой на каждом прогоне.
  { path: '/robots.txt', label: 'robots.txt + sitemap', check: r => [r.status === 200 && /Sitemap:\s*https?:\/\//i.test(r.body) && !starGroupBlocksAll(r.body), `status=${r.status}`] },
  { path: '/sitemap.xml', label: 'sitemap index', check: r => [r.status === 200 && /<sitemapindex/i.test(r.body), `status=${r.status}`] },
  { path: '/sitemap-0.xml', label: 'sitemap child 0', check: r => [r.status === 200 && /<urlset/i.test(r.body) && /<loc>/i.test(r.body), `status=${r.status}`] },
];

console.log(`\nIndexability audit -> ${BASE}${RESOLVE_IP ? ` (resolve ${HOST} -> ${RESOLVE_IP})` : ''}\n`);
for (const c of CASES) {
  try { const r = await probe(c.path); const [ok, detail] = c.check(r); record(`${c.label} [${c.path}]`, ok, detail); }
  catch (err) { record(`${c.label} [${c.path}]`, false, `request error: ${err.message}`); }
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed, ${failed} failed.\n`);
process.exit(failed ? 1 : 0);
