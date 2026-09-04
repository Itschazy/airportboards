// Cross-check our measured "no scheduled service" verdicts against OurAirports.
//
// Why this exists: scripts/discover-schedules.mjs probes each IATA code ONCE and freezes the
// answer. A single `schedules?dep_iata=X` call that comes back empty is not proof that no
// airline flies there — it is one sample of a provider feed whose coverage varies wildly by
// region. The result was that we published "No airline operates scheduled passenger flights
// from X" for whole networks: Widerøe across northern Norway, Loganair across the Scottish
// isles. That claim shipped as page copy, as the meta description, and as a FAQPage answer —
// i.e. straight into the answer engines as a verified fact.
//
// OurAirports is public domain, costs nothing, needs no API key, and carries a stable
// `scheduled_service` flag maintained by people who care about exactly this question. Where it
// says yes and our single probe said zero, we do not get to publish the negative. Those airports
// become UNKNOWN — we simply do not have a board for them — which is both true and safe.
//
// Deliberately one-directional: we never use OurAirports to claim service exists, only to veto
// our own negative claim. Sanity check printed on every run — our positives should agree with
// OurAirports at a high rate, and if that ever collapses the join has broken, not the world.
//
// Usage:  node scripts/crosscheck-service.mjs
// Writes: data/airport-service-unverified.json

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUT = path.join('data', 'airport-service-unverified.json');

/** Minimal RFC-4180 line splitter — names contain commas and escaped quotes. */
function splitCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const service = JSON.parse(fs.readFileSync(path.join('data', 'airport-service.json'), 'utf8'));
const svc = service.airports ?? {};

process.stdout.write('fetching OurAirports… ');
const csv = await (await fetch(SRC)).text();
const lines = csv.split('\n').filter(Boolean);
const head = splitCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
const iIcao = head.indexOf('ident');
const iIata = head.indexOf('iata_code');
const iSched = head.indexOf('scheduled_service');
const iName = head.indexOf('name');
const iCountry = head.indexOf('iso_country');
if (iIata < 0 || iSched < 0) throw new Error('OurAirports schema changed: no iata_code/scheduled_service column');

const oa = new Map();
/** Второй индекс — по ICAO. См. длинный комментарий ниже: без него вето слепо к смене кода. */
const byIcao = new Map();
for (const line of lines.slice(1)) {
  const f = splitCsvLine(line);
  const rec = { sched: f[iSched] === 'yes', name: f[iName] || '', country: f[iCountry] || '',
                iata: (f[iIata] || '').trim().toUpperCase() };
  const icao = (f[iIcao] || '').trim().toUpperCase();
  if (icao) byIcao.set(icao, rec);
  if (rec.iata.length === 3) oa.set(rec.iata, rec);
}
console.log(`${oa.size} airports with an IATA code, ${byIcao.size} with an ICAO ident`);

/**
 * ВТОРОЙ КЛЮЧ СОЕДИНЕНИЯ — ICAO. Соединение только по IATA имеет слепое пятно ровно там, где
 * вето нужнее всего: КОД АЭРОПОРТА МЕНЯЕТСЯ, OurAirports переносит его на новую строку, а наш
 * каталог держит старый. По старому коду в OurAirports строки нет вовсе — значит нет и вето, —
 * и мы публикуем «регулярных рейсов нет» про работающий аэропорт.
 *
 * Найдено 04.09.2026: 168 наших кодов не находятся в OurAirports по IATA. Среди них Берлин-
 * Шёнефельд (SXF → BER, 435 вылетов в сутки), Палм-Бич (PBI → DJT, 59) и Манас (FRU → BSZ, 21).
 * Все три отдавали читателю прямое отрицание.
 *
 * ICAO не меняется при переименовании и ребрендинге, поэтому соединение по нему устойчиво.
 * Направление то же, одностороннее: чужой источник может ОТМЕНИТЬ наше отрицание, но никогда
 * не утверждает за нас наличие рейсов.
 */
const AIRPORTS = JSON.parse(fs.readFileSync(path.join('data', 'airports.json'), 'utf8'));
const icaoOf = new Map((Array.isArray(AIRPORTS) ? AIRPORTS : Object.values(AIRPORTS))
  .filter((a) => a.iata && a.icao).map((a) => [a.iata, a.icao.toUpperCase()]));
/** Запись OurAirports про НАШ код: сперва по IATA, затем по ICAO из нашего же каталога. */
const oaFor = (code) => oa.get(code) ?? byIcao.get(icaoOf.get(code) ?? '');
const viaIcao = Object.keys(svc).filter((c) => !oa.has(c) && byIcao.has(icaoOf.get(c) ?? '')).length;
console.log(`joined by ICAO where IATA missed: ${viaIcao}`);

const zero = Object.keys(svc).filter(a => svc[a] === 0);
const positive = Object.keys(svc).filter(a => svc[a] > 0);
const unverified = zero.filter(a => oaFor(a)?.sched).sort();

// If our own positives stop agreeing with OurAirports, the join is broken and the veto list
// cannot be trusted either. Fail loudly rather than shipping a bad data file.
const agree = positive.filter(a => oaFor(a)?.sched).length;
const rate = Math.round((agree / Math.max(1, positive.length)) * 100);
console.log(`sanity: ${agree}/${positive.length} (${rate}%) of our measured-positive airports also flagged by OurAirports`);
if (rate < 85) throw new Error(`join looks broken (${rate}% agreement) — refusing to write ${OUT}`);

const byCountry = {};
for (const a of unverified) {
  const c = oaFor(a).country || '??';
  byCountry[c] = (byCountry[c] ?? 0) + 1;
}
const worst = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 8);

fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  source: SRC,
  note: 'IATA codes our single probe recorded as zero but OurAirports flags as having scheduled '
      + 'service. Treated as UNKNOWN: we must not publish a no-service claim for them.',
  sanityAgreementPct: rate,
  count: unverified.length,
  codes: unverified,
}, null, 0) + '\n');

console.log(`\n${unverified.length} of ${zero.length} zero-service verdicts are contradicted → UNKNOWN`);
console.log('worst-hit countries:', worst.map(([c, n]) => `${c}:${n}`).join(' '));
console.log(`wrote ${OUT}`);
