#!/usr/bin/env node
// scripts/check-hreflang.mjs
// Canonical + hreflang correctness matrix for airportsboard.live.
// Fetches RAW server HTML (no JS), extracts canonical + every alternate hreflang,
// and asserts self-canonical, reciprocity, x-default, valid codes, alternates 200,
// and that noindex pages don't advertise an indexable hreflang cluster.
//
// Usage:
//   IP=95.81.103.82 node scripts/check-hreflang.mjs     # DNS-pinned (local workaround)
//   node scripts/check-hreflang.mjs                     # normal DNS
// Exit 0 = pass, 1 = failures.

import { request } from 'node:https';
import { URL } from 'node:url';

const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
const HOST = process.env.HOST || 'airportsboard.live';
const IP = process.env.IP || ''; // set to 95.81.103.82 when DNS doesn't resolve
const BASE = (process.env.BASE || `https://${HOST}`).replace(/\/$/, '');

const INDEXABLE_PATHS = ['', '/airport/SVO', '/airport/SVO/arrivals', '/airport/SVO/departures',
  '/city/moscow', '/airports/russia', '/airports', '/airline/SU', '/az/a'];
const NOINDEX_PATHS = ['/city/aalborg']; // single-airport city

function fetchRaw(rawUrl, maxRedirects = 1) {
  return new Promise((resolve, reject) => {
    const u = new URL(rawUrl);
    const req = request({ method: 'GET', host: IP || u.hostname, servername: u.hostname,
      path: u.pathname + u.search, port: 443,
      headers: { Host: u.hostname, 'User-Agent': 'hreflang-audit/1.0', 'Accept-Encoding': 'identity' } }, (res) => {
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc && maxRedirects > 0) {
        res.resume();
        return resolve(fetchRaw(loc.startsWith('http') ? loc : `${BASE}${loc}`, maxRedirects - 1));
      }
      let body = ''; res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error(`timeout ${rawUrl}`)));
    req.end();
  });
}
async function status(url) { try { return (await fetchRaw(url, 0)).status; } catch { return 0; } }

function extractHead(html) {
  const head = html.slice(0, (html.search(/<\/head>/i) + 1) || html.length);
  const canonical = (head.match(/<link[^>]*rel=["']canonical["'][^>]*>/i) || [])[0] || '';
  const canonicalHref = (canonical.match(/href=["']([^"']+)["']/i) || [])[1] || null;
  const alternates = [];
  const re = /<link[^>]*rel=["']alternate["'][^>]*>/gi; let m;
  while ((m = re.exec(head))) {
    const lang = (m[0].match(/hreflang=["']([^"']+)["']/i) || [])[1];
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1];
    if (lang && href) alternates.push({ lang: lang.toLowerCase(), href });
  }
  const robots = (head.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["']/i) || [])[1] || null;
  return { canonicalHref, alternates, robots };
}

const VALID = new Set([...LOCALES, 'x-default']);
const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

async function auditIndexable(path) {
  for (const loc of LOCALES) {
    const url = `${BASE}/${loc}${path}`;
    const res = await fetchRaw(url);
    const label = `[${loc}${path || '/'}]`;
    if (res.status !== 200) { failures.push(`${label} status ${res.status}`); continue; }
    const { canonicalHref, alternates, robots } = extractHead(res.body);
    check(canonicalHref === url, `${label} canonical "${canonicalHref}" != self`);
    check(!/noindex/i.test(robots || ''), `${label} unexpectedly noindex`);
    const byLang = new Map();
    for (const a of alternates) {
      check(VALID.has(a.lang), `${label} invalid hreflang "${a.lang}"`);
      byLang.set(a.lang, a.href);
    }
    for (const l of LOCALES) check(byLang.get(l) === `${BASE}/${l}${path}`, `${label} hreflang[${l}] missing/non-reciprocal`);
    check(byLang.get('x-default') === `${BASE}/en${path}`, `${label} x-default missing/wrong`);
    if (loc === 'en') for (const [l, href] of byLang) { const st = await status(href); check(st === 200, `${label} alternate ${l} -> ${st}`); }
  }
}
async function auditNoindex(path) {
  const url = `${BASE}/en${path}`;
  const res = await fetchRaw(url);
  const label = `[noindex en${path}]`;
  if (res.status !== 200) { failures.push(`${label} status ${res.status}`); return; }
  const { canonicalHref, alternates, robots } = extractHead(res.body);
  check(/noindex/i.test(robots || ''), `${label} expected noindex (robots="${robots}")`);
  check(canonicalHref === url, `${label} canonical != self`);
  check(alternates.length === 0, `${label} noindex page must have NO hreflang cluster, found ${alternates.length}`);
}

console.log(`Auditing ${BASE}${IP ? ` (pinned ${HOST} -> ${IP})` : ''}\n`);
for (const p of INDEXABLE_PATHS) { process.stdout.write(`indexable ${p || '/'} ... `); await auditIndexable(p); console.log('done'); }
for (const p of NOINDEX_PATHS) { process.stdout.write(`noindex ${p} ... `); await auditNoindex(p); console.log('done'); }
console.log('');
if (!failures.length) { console.log('PASS — all canonical/hreflang assertions held.'); process.exit(0); }
console.log(`FAIL — ${failures.length} issue(s):`);
for (const f of failures) console.log('  x ' + f);
process.exit(1);
