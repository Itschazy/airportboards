// Fill the airport pages the flight provider cannot fill, using the airline/destination data
// Wikipedia already holds.
//
// 1,060 airports return no schedule from airlabs under any code (re-probed 2026-07-26, all
// 1,102 candidates). Their boards can never populate, so the page says "live board data is not
// available right now" forever — 12,720 URLs whose main feature is absent. Hiding them from the
// index was the cheap fix. This is the real one: the question a traveller actually has about a
// small airport is "who flies here, and where to", and that is exactly what an airport's
// Wikipedia article carries, in a machine-readable template, kept current by people who care.
//
// Measured coverage on a 20-airport sample: 17 have an article with a destinations section.
//
// Two extraction paths, in order:
//   1. the {{airport-dest-list}} / {{Airport destination list}} templates — parsed
//      deterministically, no model involved;
//   2. prose, where no template exists ("the only airline with scheduled passenger service is
//      Island Air Service … on the Karluk-KYK to Kodiak-ADQ route") — handed to gpt-5.5 with a
//      strict schema, and rejected unless every destination it returns appears verbatim in the
//      source section. A hallucinated route on 12 localised pages is worse than no section.
//
// FACTS, not prose: we store which airline flies where and cite the article and revision that
// said so. No sentence is copied. Attribution ships with the rendered section anyway — it is
// both the courteous thing and a provenance signal answer engines reward.
//
//   node scripts/gen-wiki-routes.mjs            # all unfillable airports, resumable
//   LIMIT=20 node scripts/gen-wiki-routes.mjs   # pilot
//   DRY=1 node scripts/gen-wiki-routes.mjs      # list the work, call nothing
//   ALL=1 node scripts/gen-wiki-routes.mjs      # every airport, not just the unfillable ones
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'airport-wiki-routes.json');
const UA = 'airportsboard.live/1.0 (https://airportsboard.live; chudovzheka@gmail.com)';
const DRY = !!process.env.DRY;

let KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  try {
    KEY = fs.readFileSync(path.join(os.homedir(), '.env.openai'), 'utf8').match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch { /* prose path will be skipped */ }
}

const airports = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airports.json'), 'utf8'));
const byIata = new Map(airports.map((a) => [a.iata, a]));
const unverified = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airport-service-unverified.json'), 'utf8')).codes);
const service = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/airport-service.json'), 'utf8')).airports;

/**
 * Which airports to look up.
 *
 * Default: the ones whose board can never fill — measured zero, but OurAirports contradicts,
 * so serviceLevel() calls them unknown.
 *
 * ZERO=1: the airports our probe measured at zero AND OurAirports agrees about. Those pages
 * currently state "no scheduled flights" as fact. If Wikipedia lists current airlines for one,
 * that statement is FALSE on a live page — our figure is a single probe from one provider,
 * theirs is maintained by people who follow the airport. Worth knowing either way: a match
 * confirms the claim, a mismatch corrects it.
 */
const targets = process.env.ALL
  ? airports.filter((a) => !a.closed).map((a) => a.iata)
  : process.env.ZERO
    ? airports.filter((a) => !a.closed && service[a.iata] === 0 && !unverified.has(a.iata)).map((a) => a.iata)
    : airports.filter((a) => !a.closed && service[a.iata] === 0 && unverified.has(a.iata)).map((a) => a.iata);

let store = {};
if (fs.existsSync(OUT)) {
  try { store = JSON.parse(fs.readFileSync(OUT, 'utf8')).airports ?? {}; } catch { /* start fresh */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wiki(params) {
  const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      return await r.json();
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

/** Strip wiki markup down to plain text. */
const clean = (s) => s
  .replace(/<ref[^>]*\/>/g, '')
  .replace(/<ref[\s\S]*?<\/ref>/g, '')
  .replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
  .replace(/'''?/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Parse the destination-list templates. Both spellings are in use — {{airport-dest-list}} and
 * {{Airport destination list}} — and an article using the second was silently skipped until
 * both were handled.
 */
function parseTemplate(wt) {
  const open = wt.search(/\{\{\s*airport[- ]dest(?:ination)?(?:[- ]list)?\s*\n?/i);
  if (open < 0) return null;
  let depth = 0, end = open;
  for (; end < wt.length - 1; end++) {
    if (wt[end] === '{' && wt[end + 1] === '{') { depth++; end++; }
    else if (wt[end] === '}' && wt[end + 1] === '}') { depth--; end++; if (depth === 0) { end++; break; } }
  }
  const inner = wt.slice(open, end)
    .replace(/^\{\{[^\n|]*/, '')
    .replace(/\}\}\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  // Split on top-level pipes only: destinations carry [[Target|Label]] and {{cite}} braces.
  const parts = [];
  let buf = '', d = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if ((c === '[' && inner[i + 1] === '[') || (c === '{' && inner[i + 1] === '{')) d++;
    if ((c === ']' && inner[i + 1] === ']') || (c === '}' && inner[i + 1] === '}')) d--;
    if (c === '|' && d <= 0) { parts.push(buf); buf = ''; continue; }
    buf += c;
  }
  parts.push(buf);
  // The template opens with a pipe, so the first part is empty; leaving it in shifts every
  // airline/destination pair by one and the whole parse silently yields nothing.
  while (parts.length && parts[0].trim() === '') parts.shift();

  const out = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    const airline = clean(parts[i]);
    if (!airline || airline.length > 60 || /^seasonal|^charter$/i.test(airline)) continue;
    // "Tehran–Mehrabad<br>Seasonal: Jeddah, Medina" collapses to
    // "Tehran–MehrabadSeasonal: Jeddah" once the markup goes, so break on those labels first.
    const dests = clean(parts[i + 1])
      .replace(/(Seasonal|Charter|Seasonal charter|Terminated|Suspended)\s*:/gi, ', ')
      .split(/,(?![^(]*\))/)
      .map((x) => x.trim().replace(/\s*\((?:suspended|ends [^)]*|begins [^)]*)\)\s*$/i, '').trim())
      .filter((x) => x && x.length < 60);
    if (dests.length) out.push({ airline, destinations: [...new Set(dests)] });
  }
  return out.length ? out : null;
}

/** The "Airlines and destinations" section as plain wikitext, for the prose path. */
function destSection(wt) {
  const m = wt.match(/==+\s*Airlines?\s+and\s+destinations?\s*==+([\s\S]*?)(?=\n==[^=])/i);
  return m ? m[1] : null;
}

const SCHEMA = {
  type: 'object',
  properties: {
    // Why a section can name no scheduled airline. Adana Şakirpaşa is the case that made this
    // necessary: "As of 12 August 2024, there are no commercial airline passenger flights" —
    // the provider's empty answer is CORRECT there and our source data is stale. A page that
    // can say so is honest; one that says "live board data is not available right now" is not.
    status: { type: 'string', enum: ['served', 'no_commercial_service', 'unclear'] },
    since: { type: 'string', description: 'Year service ended, if the source states one. Else empty.' },
    airlines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          airline: { type: 'string' },
          destinations: { type: 'array', items: { type: 'string' } },
        },
        required: ['airline', 'destinations'],
      },
    },
  },
  required: ['status', 'airlines'],
};

async function askModel(section, a) {
  if (!KEY) return null;
  const body = {
    model: 'gpt-5.5',
    messages: [
      {
        role: 'system',
        content: 'You extract structured facts from an encyclopedia section. Return ONLY airlines that operate SCHEDULED PASSENGER service from this airport, each with the destinations named for it. Use the plain city or airport name as written in the source — do not expand, translate or infer. Omit cargo-only and military operators, and omit anything the source marks as suspended, ended or seasonal-charter. If the section names no scheduled passenger airline, return an empty array and set status accordingly: no_commercial_service when the source states the airport has no commercial passenger flights (give the year in `since` if stated), otherwise unclear. Never invent an airline or a destination.',
      },
      {
        role: 'user',
        content: `Airport: ${a.name} (${a.iata}), ${a.city}, ${a.country}.\n\nSection "Airlines and destinations":\n${section.slice(0, 6000)}`,
      },
    ],
    tools: [{ type: 'function', function: { name: 'StructuredOutput', parameters: SCHEMA } }],
    tool_choice: { type: 'function', function: { name: 'StructuredOutput' } },
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.status === 429 || r.status >= 500) { await sleep(2500 * (attempt + 1)); continue; }
      const j = await r.json();
      if (j.error) return null;
      const call = j.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) return null;
      const parsed = JSON.parse(call.function.arguments);
      // Every destination must occur verbatim in the source section. This is the whole
      // safeguard against a plausible-sounding invented route being published on 12 pages.
      const plain = clean(section).toLowerCase();
      const kept = [];
      for (const row of parsed.airlines || []) {
        if (!row.airline || !plain.includes(row.airline.toLowerCase().slice(0, 12))) continue;
        const dests = (row.destinations || []).filter((d) => d && plain.includes(d.toLowerCase()));
        if (dests.length) kept.push({ airline: row.airline, destinations: [...new Set(dests)] });
      }
      return { airlines: kept, status: parsed.status || 'unclear', since: parsed.since || '' };
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

/** Find the article for this airport and pull its destination data. */
async function resolve(iata) {
  const a = byIata.get(iata);
  if (!a) return null;
  const queries = [`${a.name} ${iata}`, `${a.name}`, `${a.city} airport ${iata}`];
  for (const q of queries) {
    const s = await wiki({ action: 'query', list: 'search', srsearch: q, srlimit: '3' });
    for (const hit of s?.query?.search ?? []) {
      // Skip list/index articles: they match on name and carry other airports' tables.
      if (/^List of |^Transport in |^Category:/i.test(hit.title)) continue;
      const p = await wiki({ action: 'parse', page: hit.title, prop: 'wikitext|revid' });
      const wt = p?.parse?.wikitext?.['*'];
      if (!wt || !wt.includes(iata)) continue;          // must actually be about this airport
      const source = {
        title: hit.title,
        revid: p.parse.revid,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
      };
      const fromTemplate = parseTemplate(wt);
      if (fromTemplate) return { airlines: fromTemplate, status: 'served', source, via: 'template' };
      const section = destSection(wt);
      if (section) {
        const fromProse = await askModel(section, a);
        if (fromProse) {
          return {
            airlines: fromProse.airlines,
            status: fromProse.status,
            since: fromProse.since,
            source,
            via: fromProse.airlines.length ? 'prose' : 'prose-status',
          };
        }
      }
      return { airlines: [], status: 'unclear', source, via: 'none' };
    }
  }
  return null;
}

const todo = targets.filter((c) => !store[c]);
console.log(`airports in scope: ${targets.length}, already done: ${targets.length - todo.length}, to fetch: ${todo.length}`);
if (DRY) { console.log('DRY — nothing called, nothing written'); process.exit(0); }

const LIMIT = process.env.LIMIT ? +process.env.LIMIT : todo.length;
const work = todo.slice(0, LIMIT);
const CONCURRENCY = +(process.env.CONCURRENCY || 4);   // be a polite Wikipedia client
let done = 0, withData = 0, viaProse = 0, noArticle = 0;
let i = 0;

async function worker() {
  while (i < work.length) {
    const iata = work[i++];
    let res = null;
    try { res = await resolve(iata); } catch { /* recorded as a miss below */ }
    if (!res) { store[iata] = { airlines: [], source: null, via: 'no-article' }; noArticle++; }
    else {
      store[iata] = { ...res, fetched: '2026-07-26' };
      if (res.airlines.length) withData++;
      if (res.via === 'prose') viaProse++;
    }
    if (++done % 25 === 0) {
      console.log(`  ${done}/${work.length} — with data ${withData}, via prose ${viaProse}, no article ${noArticle}`);
      flush();
    }
  }
}

function flush() {
  const counts = { airports: Object.keys(store).length, withData: Object.values(store).filter((v) => v.airlines?.length).length };
  fs.writeFileSync(OUT, JSON.stringify({
    generated: '2026-07-26',
    source: 'English Wikipedia, per-article revision recorded with each entry',
    licence: 'Text CC BY-SA 4.0. Only facts (airline → destinations) are stored; no prose is copied. Attribution is rendered with the section.',
    counts,
    airports: store,
  }, null, 2) + '\n');
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
flush();
console.log(`\ndone: ${done}   with data: ${withData}   via prose: ${viaProse}   no article: ${noArticle}`);
console.log(`written to ${path.relative(ROOT, OUT)}`);
