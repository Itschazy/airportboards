// Verify every Wikidata sameAs mapping actually points at the airport we think it does.
//
// lib/airport-sameas.ts states the rule itself: "A wrong sameAs merges two different airports
// in the graph, which is worse than having none." IATA codes get reassigned between airports
// over the decades, so a join on P238 alone can resolve to whoever holds the code TODAY while
// our own record describes the historical holder — or an entirely different continent.
//
// The check is geographic and needs no judgement: ask Wikidata for each entity's coordinates
// (P625) and its IATA code (P238), then compare against our own lat/lon. A mapping whose
// entity sits hundreds of kilometres from our airport is wrong, whatever its label says.
//
// One SPARQL request per chunk of QIDs rather than one per airport — the query service is
// free but rate-limited, and 5,800 individual lookups is how you get banned rather than
// answered.
//
// Usage:  node scripts/verify-sameas.mjs [--chunk 250]
// Writes: nothing. Prints a report; fixing is a separate, deliberate step.

import fs from 'node:fs';
import path from 'node:path';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'airportsboard.live sameAs verifier (contact: eschudov@gmail.com)';
const CHUNK = Number(process.argv[process.argv.indexOf('--chunk') + 1]) || 250;
/** Beyond this, the entity is not the airport we mean. Generous: some airports are large. */
const MAX_KM = 25;

const sameAs = JSON.parse(fs.readFileSync(path.join('data', 'airport-sameas.json'), 'utf8'));
const airports = JSON.parse(fs.readFileSync(path.join('data', 'airports.json'), 'utf8'));
const ours = new Map(airports.map(a => [a.iata, a]));

const qidOf = urls => {
  const u = (urls || []).find(x => x.includes('wikidata.org/entity/'));
  return u ? u.split('/').pop() : null;
};

const entries = Object.entries(sameAs)
  .map(([iata, urls]) => ({ iata, qid: qidOf(urls) }))
  .filter(e => e.qid && ours.has(e.iata));
console.log(`checking ${entries.length} mappings in chunks of ${CHUNK}`);

function haversine(a, b, c, d) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (c - a) * r, dLon = (d - b) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function query(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `SELECT ?item ?coord ?iata WHERE {
    VALUES ?item { ${values} }
    OPTIONAL { ?item wdt:P625 ?coord. }
    OPTIONAL { ?item wdt:P238 ?iata. }
  }`;
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(sparql)}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`SPARQL ${res.status}`);
  return (await res.json()).results.bindings;
}

const wd = new Map();   // qid -> { lat, lon, iatas:Set }
const chunks = [];
for (let i = 0; i < entries.length; i += CHUNK) chunks.push(entries.slice(i, i + CHUNK));

for (const [i, chunk] of chunks.entries()) {
  let rows;
  for (let attempt = 1; ; attempt++) {
    try { rows = await query(chunk.map(e => e.qid)); break; }
    catch (err) {
      if (attempt >= 4) throw err;
      const wait = attempt * 5000;
      console.log(`  chunk ${i + 1}: ${err.message}, retrying in ${wait / 1000}s`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  for (const r of rows) {
    const qid = r.item.value.split('/').pop();
    const rec = wd.get(qid) || { lat: null, lon: null, iatas: new Set() };
    if (r.coord?.value) {
      const m = r.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
      if (m) { rec.lon = Number(m[1]); rec.lat = Number(m[2]); }
    }
    if (r.iata?.value) rec.iatas.add(r.iata.value.toUpperCase());
    wd.set(qid, rec);
  }
  process.stdout.write(`\r  ${i + 1}/${chunks.length} chunks`);
  await new Promise(r => setTimeout(r, 400));   // be a good citizen
}
console.log('');

const farAway = [], codeMismatch = [], noCoords = [];
for (const { iata, qid } of entries) {
  const rec = wd.get(qid);
  const a = ours.get(iata);
  if (!rec || rec.lat === null) { noCoords.push({ iata, qid }); continue; }
  const km = Math.round(haversine(a.lat, a.lon, rec.lat, rec.lon));
  if (km > MAX_KM) farAway.push({ iata, qid, km, name: a.name, wdIata: [...rec.iatas].join('/') || '—' });
  else if (rec.iatas.size && !rec.iatas.has(iata)) codeMismatch.push({ iata, qid, wdIata: [...rec.iatas].join('/'), km });
}

farAway.sort((a, b) => b.km - a.km);
console.log(`\n=== WRONG: entity more than ${MAX_KM} km from our airport (${farAway.length}) ===`);
for (const f of farAway) console.log(`  ${f.iata}  ${String(f.km).padStart(6)} km  ${f.qid.padEnd(11)} wd:P238=${f.wdIata.padEnd(7)} ${f.name.slice(0, 40)}`);

console.log(`\n=== SUSPECT: coordinates fine but Wikidata's IATA differs (${codeMismatch.length}) ===`);
for (const f of codeMismatch.slice(0, 25)) console.log(`  ${f.iata} -> wd:${f.wdIata}  ${f.qid}  (${f.km} km)`);
if (codeMismatch.length > 25) console.log(`  … and ${codeMismatch.length - 25} more`);

console.log(`\n=== no coordinates on the entity (${noCoords.length}) — cannot verify either way ===`);
console.log('  ' + noCoords.slice(0, 20).map(x => x.iata).join(' ') + (noCoords.length > 20 ? ' …' : ''));

console.log(`\nverdict: ${farAway.length} mappings must be removed, ${codeMismatch.length} need a look.`);
fs.writeFileSync('/tmp/claude-501/sameas-bad.json', JSON.stringify({ farAway, codeMismatch }, null, 1));
console.log('detail written to /tmp/claude-501/sameas-bad.json');
