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

const query = `
SELECT ?iata ?item ?article WHERE {
  ?item wdt:P238 ?iata .
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
}`;

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
  const cur = byIata.get(iata);
  if (!cur) byIata.set(iata, { entity, article, entities: new Set([entity]) });
  else { cur.entities.add(entity); if (article && !cur.article) cur.article = article; }
}

const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const ours = new Set(airports.map(a => a.iata).filter(Boolean));

const out = {};
let ambiguous = 0, unknown = 0, withArticle = 0;
for (const iata of ours) {
  const hit = byIata.get(iata);
  if (!hit) { unknown++; continue; }
  if (hit.entities.size > 1) { ambiguous++; continue; }
  const links = [hit.entity];
  if (hit.article) { links.push(hit.article); withArticle++; }
  out[iata] = links;
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
