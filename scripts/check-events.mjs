#!/usr/bin/env node
// Validator for the event guides. Catches the failure modes that actually hurt:
// stale dates, airports that don't exist, half-generated locales, and — in prod —
// pages that regressed to top-level Event markup (a spammy-structured-data risk).
//
// Usage:
//   node scripts/check-events.mjs            # data checks only
//   node scripts/check-events.mjs --prod     # also fetch every event page in prod
import fs from 'fs';

const BASE = process.env.BASE || 'https://airportsboard.live';
const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
const REQUIRED = ['title', 'description', 'h1', 'banner', 'intro', 'getting', 'leaving', 'tips'];
const PROD = process.argv.includes('--prod');

const airports = new Set(
  JSON.parse(fs.readFileSync('data/airports.json', 'utf8')).map(a => a.iata).filter(Boolean),
);

const fails = [];
const warns = [];
const fail = m => { fails.push(m); console.log(`FAIL  ${m}`); };
const warn = m => { warns.push(m); console.log(`warn  ${m}`); };

const files = fs.readdirSync('data/events').filter(f => f.endsWith('.json'));
console.log(`\nChecking ${files.length} event(s)${PROD ? ` against ${BASE}` : ''}\n`);

const now = Date.now();
const slugs = [];

for (const f of files) {
  let ev;
  try { ev = JSON.parse(fs.readFileSync(`data/events/${f}`, 'utf8')); }
  catch (e) { fail(`${f}: unparseable JSON (${e.message})`); continue; }

  const m = ev.meta || {};
  const id = m.slug || f;
  slugs.push(m.slug);

  // (a) identity + dates
  if (!m.slug) fail(`${f}: meta.slug missing`);
  else if (`${m.slug}.json` !== f) fail(`${f}: filename must match slug (${m.slug}.json)`);
  for (const k of ['name', 'venue', 'venueCity', 'country', 'type']) {
    if (!m[k]) fail(`${id}: meta.${k} missing`);
  }
  if (m.country && !/^[A-Z]{2}$/.test(m.country)) fail(`${id}: country "${m.country}" is not ISO-3166-1 alpha-2`);
  if (m.type && !['concert', 'sports', 'festival'].includes(m.type)) fail(`${id}: unknown type "${m.type}"`);

  const start = Date.parse(m.startDate);
  if (Number.isNaN(start)) fail(`${id}: startDate "${m.startDate}" is not a parseable ISO date`);
  if (m.endDate) {
    const end = Date.parse(m.endDate);
    if (Number.isNaN(end)) fail(`${id}: endDate "${m.endDate}" is not a parseable ISO date`);
    else if (end < start) fail(`${id}: endDate is before startDate`);
  }
  if (!/[+-]\d{2}:\d{2}$|Z$/.test(m.startDate || '')) {
    warn(`${id}: startDate has no UTC offset — local time is ambiguous`);
  }

  // An event whose fly-home window has passed must be marked 'past' (or updated),
  // otherwise it keeps claiming to be upcoming and rots into a thin-content signal.
  const endsAt = (m.endDate ? Date.parse(m.endDate) + 2 * 86400000 : start + 3 * 86400000);
  if (endsAt < now && m.status !== 'past') {
    fail(`${id}: event ended ${new Date(endsAt).toISOString().slice(0, 10)} but status is "${m.status || 'scheduled'}" — set status:"past"`);
  }
  if (m.status && !['scheduled', 'postponed', 'cancelled', 'past'].includes(m.status)) {
    fail(`${id}: unknown status "${m.status}"`);
  }
  if (!m.sources?.length) warn(`${id}: no meta.sources — facts have no verification trail`);

  // (b) airports must exist and be sane
  if (!m.airports?.length) fail(`${id}: no airports listed`);
  for (const a of m.airports || []) {
    if (!airports.has(a.iata)) fail(`${id}: airport ${a.iata} not in data/airports.json`);
    if (typeof a.km !== 'number' || a.km < 0) fail(`${id}: airport ${a.iata} has invalid km`);
    else if (a.km > 150) warn(`${id}: ${a.iata} is ${a.km} km away — make sure the copy calls it a fallback, not a nearby airport`);
  }

  // (c) locale completeness
  for (const loc of LOCALES) {
    const c = ev.locales?.[loc];
    if (!c) { fail(`${id}: locale ${loc} missing (would render EN and be noindexed)`); continue; }
    for (const k of REQUIRED) if (!c[k]) fail(`${id}/${loc}: "${k}" missing`);
    if (c.title && c.title.length > 70) warn(`${id}/${loc}: title ${c.title.length} chars (SERP truncates ~60-65)`);
    if (c.description && (c.description.length < 80 || c.description.length > 170)) {
      warn(`${id}/${loc}: description ${c.description.length} chars (aim 120-155)`);
    }
  }
}

// (d) production checks
if (PROD) {
  const UA = 'Mozilla/5.0 (compatible; check-events/1.0)';
  for (const slug of slugs.filter(Boolean)) {
    for (const loc of ['en', 'ru']) {
      const url = `${BASE}/${loc}/event/${slug}`;
      try {
        const res = await fetch(url, { headers: { 'user-agent': UA } });
        if (res.status !== 200) { fail(`${url} → HTTP ${res.status}`); continue; }
        const html = await res.text();
        if (/"@type"\s*:\s*"(SportsEvent|MusicEvent|Event)"\s*,?\s*(?="name")/.test(html.replace(/\s+/g, ''))) {
          // crude, but the real guard is below
        }
        // top-level Event markup = each JSON-LD block whose root @type is an Event flavour
        const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => m[1]);
        for (const b of blocks) {
          try {
            const j = JSON.parse(b);
            if (/^(Event|SportsEvent|MusicEvent|Festival)$/.test(j['@type'])) {
              fail(`${url}: top-level ${j['@type']} JSON-LD (must be WebPage{about:Event})`);
            }
          } catch { fail(`${url}: unparseable JSON-LD block`); }
        }
        if (!html.includes(`<link rel="canonical" href="${url}"`)) fail(`${url}: canonical missing or not self-referencing`);
      } catch (e) { fail(`${url}: fetch failed (${e.message})`); }
    }
    const hub = `${BASE}/ru/events`;
    try {
      const r = await fetch(hub, { headers: { 'user-agent': UA } });
      if (r.status !== 200) fail(`${hub} → HTTP ${r.status}`);
      else if (!(await r.text()).includes(`/ru/event/${slug}`)) warn(`${hub}: does not link ${slug} (past events are dimmed but should still be listed)`);
    } catch (e) { fail(`${hub}: fetch failed (${e.message})`); }
  }
}

console.log(`\n${fails.length ? `FAILED — ${fails.length} error(s), ${warns.length} warning(s)` : `PASS — 0 errors, ${warns.length} warning(s)`}\n`);
process.exit(fails.length ? 1 : 0);
