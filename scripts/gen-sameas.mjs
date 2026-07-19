#!/usr/bin/env node
// Build data/airport-sameas.json — a map from IATA code to the airport's Wikidata entity and
// English Wikipedia article, for use as schema.org `sameAs`.
//
// Why: an Airport node with an iataCode is a string. An Airport node that also says
// "this is the same thing as wikidata.org/entity/Q8691" is a resolved ENTITY, which is what
// a knowledge graph and an answer engine actually key on when deciding whether two mentions
// of "Heathrow" are the same place and which source to attribute.
//
// This is a one-time join against the Wikidata Query Service (P238 = IATA code), not a
// generation step — no model, no invention. Codes that Wikidata does not know, or that map
// to more than one entity, are skipped rather than guessed: a wrong sameAs is worse than a
// missing one, because it merges two different airports in the graph.
//
// Usage:
//   node scripts/gen-sameas.mjs            # fetch + report
//   node scripts/gen-sameas.mjs --write
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const OUT = 'data/airport-sameas.json';

// P625 (coordinates) is pulled so the mapping can be checked geographically, not just by
// code. IATA codes get reassigned when an airport is replaced: HFE moved from Hefei Luogang
// to Hefei Xinqiao 39 km away, AAP from Houston's Andrau Airpark to Samarinda 15,248 km away.
// Joining on the code alone happily returns the CURRENT holder while our own record describes
// the previous one — which is precisely the "merges two different airports" failure this file
// warns about. A full sweep on 2026-07-19 found 27 such mappings already shipped.
const query = `
SELECT ?iata ?item ?article ?coord WHERE {
  ?item wdt:P238 ?iata .
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
}`;

/** Beyond this the entity is not the airport we mean, whatever its IATA code says. */
const MAX_KM = 25;
function kmApart(lat1, lon1, lat2, lon2) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const url = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query);
console.log('querying Wikidata …');
const res = await fetch(url, {
  headers: {
    // WDQS requires a descriptive UA with contact info; anonymous requests get throttled.
    'User-Agent': 'airportsboard.live sameAs builder (https://airportsboard.live)',
    Accept: 'application/sparql-results+json',
  },
});
if (!res.ok) { console.error(`WDQS ${res.status} ${res.statusText}`); process.exit(1); }
const json = await res.json();
const rows = json.results.bindings;
console.log(`rows: ${rows.length}`);

// An IATA code appearing on more than one entity means the code is ambiguous in Wikidata
// (reassigned, or a data error). Drop those entirely.
const byIata = new Map();
for (const r of rows) {
  const iata = (r.iata?.value || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  const entity = r.item?.value;
  const article = r.article?.value || null;
  let coord = null;
  const m = r.coord?.value?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (m) coord = { lon: Number(m[1]), lat: Number(m[2]) };
  const cur = byIata.get(iata);
  if (!cur) byIata.set(iata, { entity, article, coord, entities: new Set([entity]) });
  else { cur.entities.add(entity); if (article && !cur.article) cur.article = article; if (coord && !cur.coord) cur.coord = coord; }
}

const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const ours = new Map(airports.filter(a => a.iata).map(a => [a.iata, a]));

const out = {};
let ambiguous = 0, unknown = 0, withArticle = 0, tooFar = 0;
const farList = [];
for (const [iata, a] of ours) {
  const hit = byIata.get(iata);
  if (!hit) { unknown++; continue; }
  if (hit.entities.size > 1) { ambiguous++; continue; }
  // Geographic veto. The code matching is not enough — see the note on the query above.
  // No coordinates on the entity means we cannot verify, and an unverifiable identity claim
  // is exactly the thing this file refuses to publish, so those are dropped too.
  if (!hit.coord) { tooFar++; farList.push(`${iata}(no P625)`); continue; }
  const km = kmApart(a.lat, a.lon, hit.coord.lat, hit.coord.lon);
  if (km > MAX_KM) { tooFar++; farList.push(`${iata}(${Math.round(km)}km)`); continue; }
  const links = [hit.entity];
  if (hit.article) { links.push(hit.article); withArticle++; }
  out[iata] = links;
}
if (tooFar) {
  console.log(`geo-rejected       : ${tooFar}`);
  console.log(`  ${farList.slice(0, 30).join(' ')}${farList.length > 30 ? ' …' : ''}`);
}

console.log(`matched            : ${Object.keys(out).length} / ${ours.size}`);
console.log(`  with a Wikipedia article: ${withArticle}`);
console.log(`skipped (ambiguous): ${ambiguous}`);
console.log(`skipped (unknown)  : ${unknown}`);
console.log('\nsamples:');
for (const k of ['LHR', 'JFK', 'BER', 'AAH', 'SVO']) if (out[k]) console.log(`  ${k}: ${out[k].join(' , ')}`);

if (WRITE) {
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');
  console.log(`\nwritten ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
} else {
  console.log('\nDry run — nothing written. Re-run with --write.');
}
