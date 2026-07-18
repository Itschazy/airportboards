// Submit URLs to IndexNow (Yandex + Bing) for near-instant crawling.
// Usage: node scripts/indexnow.mjs            → submits a curated priority set
//        node scripts/indexnow.mjs --all-hubs → also all country pages (12 locales)
// The key file must already be live at https://airportsboard.live/<key>.txt
import fs from 'fs';

const HOST = 'airportsboard.live';
const BASE = `https://${HOST}`;
const KEY = fs.readFileSync('.indexnow-key', 'utf8').trim();
const KEY_LOCATION = `${BASE}/${KEY}.txt`;

const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
// Flagship airports most worth seeding into the index first.
const FLAGSHIPS = ['SVO','DME','VKO','LED','LHR','CDG','FRA','AMS','IST','DXB','JFK','LAX','HND','PEK','PVG','SIN','ICN','BCN','MAD','FCO'];

const urls = new Set();
for (const loc of LOCALES) {
  urls.add(`${BASE}/${loc}`);
  urls.add(`${BASE}/${loc}/airports`);
  for (const iata of FLAGSHIPS) {
    urls.add(`${BASE}/${loc}/airport/${iata}`);
    urls.add(`${BASE}/${loc}/airport/${iata}/arrivals`);
    urls.add(`${BASE}/${loc}/airport/${iata}/departures`);
  }
}

// Event guides: the hub, every event page, and the airports each event serves. These are
// time-critical (an event page is worthless after the date) so they always go in the push.
try {
  const files = fs.readdirSync('data/events').filter(f => f.endsWith('.json'));
  const eventAirports = new Set();
  for (const loc of LOCALES) urls.add(`${BASE}/${loc}/events`);
  for (const f of files) {
    const ev = JSON.parse(fs.readFileSync(`data/events/${f}`, 'utf8'));
    const slug = ev?.meta?.slug;
    if (!slug) continue;
    const ended = Date.parse(ev.meta.endDate || ev.meta.startDate) + 3 * 86400000 < Date.now();
    for (const loc of LOCALES) urls.add(`${BASE}/${loc}/event/${slug}`);
    if (!ended) for (const a of ev.meta.airports || []) eventAirports.add(a.iata);
  }
  for (const loc of LOCALES) for (const iata of eventAirports) {
    urls.add(`${BASE}/${loc}/airport/${iata}`);
    urls.add(`${BASE}/${loc}/airport/${iata}/arrivals`);
    urls.add(`${BASE}/${loc}/airport/${iata}/departures`);
  }
  console.log(`+ events: ${files.length} guide(s), ${eventAirports.size} active event airport(s)`);
} catch { /* no events dir */ }

if (process.argv.includes('--all-hubs')) {
  const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const countries = [...new Set(airports.map(a => a.country).filter(Boolean))];
  for (const loc of LOCALES) for (const c of countries) urls.add(`${BASE}/${loc}/airports/${slugify(c)}`);
}

const urlList = [...urls];
console.log(`Submitting ${urlList.length} URLs to IndexNow…`);

const ENDPOINTS = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];
const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList });

for (const ep of ENDPOINTS) {
  // IndexNow allows up to 10000 URLs per request.
  try {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    const txt = await r.text();
    console.log(`${ep} → ${r.status} ${r.statusText} ${txt ? '| ' + txt.slice(0, 120) : ''}`);
  } catch (e) {
    console.log(`${ep} → ERROR ${e.message}`);
  }
}
console.log('Done.');
