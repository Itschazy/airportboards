import { getAirport, getCountries, POPULAR_AIRPORTS } from '@/lib/airports';

// /llms.txt — a concise, machine-readable map of the site for LLM crawlers
// (ChatGPT, Claude, Perplexity, Gemini, …) following the llmstxt.org convention.
// Purely a metadata file: no UI, zero UX impact. Helps the service be understood
// and cited in AI answers.
export const dynamic = 'force-static';

const BASE = 'https://airportsboard.live';

// A few extra well-known global hubs on top of POPULAR_AIRPORTS for a richer map.
const EXTRA_HUBS = ['DME', 'BCN', 'MAD', 'FCO', 'HKG', 'BKK', 'NRT', 'PVG', 'DFW', 'DEN', 'SFO', 'YYZ', 'GRU', 'DEL', 'CAN'];

export function GET() {
  const hubCodes = [...new Set([...POPULAR_AIRPORTS, ...EXTRA_HUBS])];
  const hubs = hubCodes
    .map(iata => getAirport(iata))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map(a => `- [${a.name} (${a.iata})](${BASE}/en/airport/${a.iata}): live arrivals & departures for ${a.city}, ${a.country}`);

  const countries = getCountries()
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(c => `- [Airports in ${c.country}](${BASE}/en/airports/${c.slug}): ${c.count} airports`);

  const body = `# AirportsBoard.live

> Live arrivals and departures boards for 6,000+ airports worldwide, in real time, in 12 languages. Every airport has a live flight board plus dedicated arrivals and departures pages with flight status, gates, terminals, delays and baggage belts.

AirportsBoard.live publishes real-time flight information for 6,072 airports. Content is available in 12 languages — English (en), Russian (ru), Chinese (zh), Arabic (ar), German (de), Korean (ko), Japanese (ja), French (fr), Spanish (es), Italian (it), Hindi (hi), Turkish (tr) — each on its own URL.

## URL structure
- Airport board: ${BASE}/{lang}/airport/{IATA}
- Arrivals: ${BASE}/{lang}/airport/{IATA}/arrivals
- Departures: ${BASE}/{lang}/airport/{IATA}/departures
- Route between two airports: ${BASE}/{lang}/route/{FROM}-{TO}
- Airline flights: ${BASE}/{lang}/airline/{CODE}
- All airports by country: ${BASE}/{lang}/airports
- Airports A–Z: ${BASE}/{lang}/az/{letter}

## Key pages
- [Homepage](${BASE}/en)
- [All airports by country](${BASE}/en/airports)
- [Airports A–Z index](${BASE}/en/az/a)

## Major airports
${hubs.join('\n')}

## Top countries
${countries.join('\n')}

## Notes
- Replace \`en\` in any URL with one of: ru, zh, ar, de, ko, ja, fr, es, it, hi, tr.
- Sitemap: ${BASE}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
