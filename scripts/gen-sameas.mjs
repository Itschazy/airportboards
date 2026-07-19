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
SELECT ?iata ?item ?article ?coord ?type WHERE {
  ?item wdt:P238 ?iata .
  OPTIONAL { ?item wdt:P625 ?coord. }
  OPTIONAL { ?item wdt:P31 ?type. }
  OPTIONAL {
    ?article schema:about ?item ;
             schema:isPartOf <https://en.wikipedia.org/> .
  }
}`;

// Entity classes that can legitimately BE the airport we mean. A whitelist on purpose: an
// unfamiliar P31 must fall through to "do not map", never to "accept".
//
// Wikidata routinely hangs an IATA code on several entities — 258 codes here — and the old
// code dropped every one of them as ambiguous. But the other entities are usually not rival
// airports at all: EWR was vetoed by a monorail station, ABQ by Kirtland Air Force Base
// sharing its coordinates exactly, DUS by an S-Bahn station. Classifying instead of vetoing
// recovers the real airport in each case.
//
// Airbases, military bases, heliports, rail stations of every kind and — importantly —
// "former aerodrome" stay out. That last one is the closed-predecessor trap that produced
// the 27 wrong mappings removed earlier today.
const AIRPORT_CLASSES = new Set([
  'Q1248784',    // airport
  'Q644371',     // international airport
  'Q62447',      // aerodrome
  'Q94993988',   // commercial traffic aerodrome
  'Q2516330',    // commercial airfield
  'Q21836433',   // commercial airport
  'Q55612991',   // greenfield airport
  'Q106643740',  // federal aeroport
  'Q3143713',    // seaplane base
]);
// Aviation facilities that are not civil passenger airports. Our dataset contains plenty of
// them — air bases, naval air stations, airstrips, heliports — and when one of these is the
// only thing at our coordinates it IS the entity we mean, so mapping it is correct.
//
// They are a SECOND tier rather than part of the list above, and the distinction is what makes
// ABQ resolve properly: Kirtland Air Force Base sits at Albuquerque's exact coordinates, so a
// flat list would let it beat the civil airport. Civil first, this only if nothing civil is
// near. Verified against the 215 mappings a whitelist-only pass dropped: 213 were legitimate
// aviation facilities, and the ~20 that were not are the settlements and rail stations below,
// deliberately absent from both tiers.
const AVIATION_CLASSES = new Set([
  'Q695850',     // airbase
  'Q6981985',    // naval air station
  'Q1324633',    // naval base
  'Q129004351',  // Royal Naval Air Station
  'Q7373622',    // Royal Air Force station
  'Q594346',     // Royal Air Force Germany
  'Q654842',     // British Army of the Rhine
  'Q2886620',    // Canadian Forces base
  'Q245016',     // military base
  'Q18691599',   // military installation
  'Q6269493',    // joint base
  'Q2604714',    // forward operating base
  'Q85881832',   // United States military base in Okinawa
  'Q3631092',    // airstrip
  'Q2840449',    // altiport
  'Q502074',     // heliport
  'Q62782337',   // general aviation airport
  'Q837800',     // domestic airport
  'Q20977786',   // commercial airport (variant)
  'Q2560442',    // company airport
  'Q2301048',    // German special airfield
  'Q1593547',    // Heeresflugplatz
  'Q2265915',    // glider airfield
  'Q1479818',    // special airport
  'Q104905692',  // airport straddling borders
]);
// Deliberately in NEITHER list, though they appear on IATA codes: census-designated place,
// unincorporated community, human settlement, historic district, railway/S-Bahn/through/
// harbour/central station, station building, pier, passenger ship terminal, spaceport,
// abandoned airport, former aerodrome. The last two are the closed-predecessor trap that
// produced the 27 wrong mappings removed earlier today.

/** Two surviving candidates this close together cannot be told apart safely. */
const TIE_KM = 5;

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

// One IATA code can carry several entities. Keep them all as candidates and decide below;
// collapsing them here is what made the ambiguity veto fire before anything could be judged.
const byIata = new Map();
for (const r of rows) {
  const iata = (r.iata?.value || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(iata)) continue;
  const entity = r.item?.value;
  if (!entity) continue;
  if (!byIata.has(iata)) byIata.set(iata, new Map());
  const cands = byIata.get(iata);
  if (!cands.has(entity)) cands.set(entity, { entity, article: null, coord: null, types: new Set() });
  const c = cands.get(entity);
  if (r.article?.value && !c.article) c.article = r.article.value;
  if (r.type?.value) c.types.add(r.type.value.split('/').pop());
  const m = r.coord?.value?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  if (m && !c.coord) c.coord = { lon: Number(m[1]), lat: Number(m[2]) };
}

const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
const ours = new Map(airports.filter(a => a.iata).map(a => [a.iata, a]));

const out = {};
let ambiguous = 0, unknown = 0, withArticle = 0, tooFar = 0;
const farList = [];
for (const [iata, a] of ours) {
  const cands = byIata.get(iata);
  if (!cands) { unknown++; continue; }
  // Keep only candidates that are (a) near our airport and (b) an airport-ish thing. Either
  // test alone is insufficient: Kirtland AFB sits at ABQ's exact coordinates, and a genuine
  // airport 200 km away is a different airport.
  const near = [...cands.values()]
    .filter(c => c.coord)
    .map(c => ({ ...c, km: kmApart(a.lat, a.lon, c.coord.lat, c.coord.lon) }))
    .filter(c => c.km <= MAX_KM)
    .sort((x, y) => x.km - y.km);
  // Civil airports win outright; other aviation facilities are considered only when no civil
  // one is nearby. Anything in neither tier — a town, a railway station — never qualifies.
  const civil = near.filter(c => [...c.types].some(t => AIRPORT_CLASSES.has(t)));
  const viable = civil.length ? civil : near.filter(c => [...c.types].some(t => AVIATION_CLASSES.has(t)));

  if (!viable.length) {
    if (cands.size > 1) ambiguous++;
    else { tooFar++; farList.push(`${iata}(${[...cands.values()][0]?.coord ? 'far' : 'no P625'})`); }
    continue;
  }
  // Two airports within a few km of each other are usually the live one and its closed
  // predecessor, and picking wrong merges them in the graph. Only commit when the runner-up
  // is clearly further away.
  if (viable.length > 1 && viable[1].km - viable[0].km < TIE_KM) { ambiguous++; continue; }

  const best = viable[0];
  const links = [best.entity];
  if (best.article) { links.push(best.article); withArticle++; }
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
