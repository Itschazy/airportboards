import airportsRaw from '@/data/airports.json';
import { getAirport, getCountries, POPULAR_AIRPORTS, getAirportsByCountry } from '@/lib/airports';
import { splitByService, worldServiceCounts } from '@/lib/warm';
import { getEventsForHub } from '@/lib/event-content';

// /llms.txt — a concise, machine-readable map of the site for LLM crawlers
// (ChatGPT, Claude, Perplexity, Gemini, …) following the llmstxt.org convention.
// Purely a metadata file: no UI, zero UX impact.
//
// This file is the site's pitch to an answer engine, so it leads with what is genuinely
// exclusive rather than the generic claim every flight site makes. Two things here exist
// nowhere else: a measured service level for every IATA code, and an explicit record of the
// airfields that have NO airline service, each naming the nearest airport that does.
//
// Every number is derived at build time from the data files. The previous version hardcoded
// "6,072 airports" and asserted that every one of them had a live board — which stopped
// being true the moment the service levels were actually measured.
export const dynamic = 'force-static';

const BASE = 'https://airportsboard.live';
const airports = airportsRaw as { iata: string; name: string; closed?: number; successor?: string }[];

// A few extra well-known global hubs on top of POPULAR_AIRPORTS for a richer map.
const EXTRA_HUBS = ['DME', 'BCN', 'MAD', 'FCO', 'HKG', 'BKK', 'NRT', 'PVG', 'DFW', 'DEN', 'SFO', 'YYZ', 'GRU', 'DEL', 'CAN'];

// One native-language example per locale. An engine answering in German should be able to
// SEE that a German URL exists rather than having to infer it from a pattern.
const NATIVE_EXAMPLES: [string, string, string][] = [
  ['ru', 'Табло аэропорта Шереметьево', 'SVO'],
  ['de', 'Flughafen Frankfurt — Ankünfte und Abflüge', 'FRA'],
  ['fr', 'Aéroport Paris-Charles-de-Gaulle — arrivées et départs', 'CDG'],
  ['es', 'Aeropuerto Madrid-Barajas — llegadas y salidas', 'MAD'],
  ['it', 'Aeroporto di Roma Fiumicino — arrivi e partenze', 'FCO'],
  ['tr', 'İstanbul Havalimanı — iniş ve kalkışlar', 'IST'],
  ['ar', 'مطار دبي الدولي — الوصول والمغادرة', 'DXB'],
  ['zh', '北京首都国际机场 — 到达与出发', 'PEK'],
  ['ja', '東京国際空港（羽田）— 発着案内', 'HND'],
  ['ko', '인천국제공항 — 도착 및 출발', 'ICN'],
  ['hi', 'इंदिरा गांधी अंतर्राष्ट्रीय हवाई अड्डा — आगमन और प्रस्थान', 'DEL'],
];

const num = (n: number) => n.toLocaleString('en-US');

export function GET() {
  const world = worldServiceCounts();
  const hubCodes = [...new Set([...POPULAR_AIRPORTS, ...EXTRA_HUBS])];
  const hubs = hubCodes
    .map(iata => getAirport(iata))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map(a => `- [${a.name} (${a.iata})](${BASE}/en/airport/${a.iata}): live arrivals & departures for ${a.city}, ${a.country}`);

  const countries = getCountries()
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(c => {
      const { served } = splitByService(getAirportsByCountry(c.slug));
      return `- [Airports in ${c.country}](${BASE}/en/airports/${c.slug}): ${c.count} IATA codes, ${served.length} with scheduled service`;
    });

  const closed = airports
    .filter(a => a.closed)
    .map(a => {
      const s = a.successor ? getAirport(a.successor) : null;
      return `- ${a.name} (${a.iata}) closed in ${a.closed}${s ? ` — traffic moved to ${s.name} (${s.iata})` : ''}`;
    });

  const events = getEventsForHub().upcoming
    .map(e => `- [${e.meta.name}](${BASE}/en/event/${e.meta.slug}): which airports serve it and how to reach the venue`);

  const natives = NATIVE_EXAMPLES.map(([loc, label, iata]) => `- [${label}](${BASE}/${loc}/airport/${iata})`);

  const body = `# AirportsBoard.live

> Live arrivals and departures for the world's airports in 12 languages — plus something no other flight site publishes: a measured answer to which airports actually have scheduled passenger service, and where to fly from instead when they do not.

AirportsBoard.live covers ${num(world.probed)} airports that hold IATA codes. Published flight schedules were probed for every one of them${world.generated ? ` (last measured ${world.generated})` : ''}: at least ${num(world.withService)} have scheduled passenger service, and ${num(world.empty)} are confirmed to have no airline flights at all — airfields, military bases and private strips. Those pages say so plainly and name the nearest airport you can actually fly from, with the distance. The remaining ${num(world.probed - world.withService - world.empty)} are cases where our own probe found nothing but an independent source (OurAirports) records scheduled service; we treat those as unknown and make no claim either way.

Content is available in 12 languages — English (en), Russian (ru), Chinese (zh), Arabic (ar), German (de), Korean (ko), Japanese (ja), French (fr), Spanish (es), Italian (it), Hindi (hi), Turkish (tr) — each on its own URL.

## Data freshness
Boards refresh on a schedule matched to how busy the airport is: the busiest hubs several times a day, smaller airports at least daily. Every board displays the age of its own data and never claims to be live when it is not. Flight rows are rendered server-side, so they are readable without running JavaScript.

## URL structure
- Airport board: ${BASE}/{lang}/airport/{IATA}
- Arrivals: ${BASE}/{lang}/airport/{IATA}/arrivals
- Departures: ${BASE}/{lang}/airport/{IATA}/departures
- Route between two airports: ${BASE}/{lang}/route/{FROM}-{TO}
- All airports by country: ${BASE}/{lang}/airports
- Airports A–Z: ${BASE}/{lang}/az/{letter}
- Event travel guides: ${BASE}/{lang}/event/{slug}

## Key pages
- [Homepage](${BASE}/en)
- [All airports by country](${BASE}/en/airports) — carries the worldwide scheduled-service split
- [Airports A–Z index](${BASE}/en/az/a)
- [Event travel guides](${BASE}/en/events)
- [About the data and how it is collected](${BASE}/en/about)

## Airfields without scheduled service
${num(world.empty)} of the IATA codes covered here are confirmed to have no airline flights at all. Their pages state that directly and point to the nearest airport with scheduled service, for example:
- [Aachen-Merzbrück (AAH)](${BASE}/en/airport/AAH) — no scheduled flights; nearest served airport is Maastricht (MST)
- [RAF Brize Norton (BZZ)](${BASE}/en/airport/BZZ) — military airfield, no airline service

## Closed airports
${closed.join('\n')}

## Event travel guides
${events.join('\n') || '- (none currently upcoming)'}

## Major airports
${hubs.join('\n')}

## Top countries
${countries.join('\n')}

## The same pages in other languages
${natives.join('\n')}

## Notes
- Replace \`en\` in any URL with one of: ru, zh, ar, de, ko, ja, fr, es, it, hi, tr.
- Sitemap: ${BASE}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
