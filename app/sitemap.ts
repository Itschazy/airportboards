import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes, getCities } from '@/lib/airports';
import { getEventSlugs } from '@/lib/event-content';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher priority than obscure airfields (priority is relative).
const HUBS = new Set(getStaticIataCodes());

type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

// One entry per PAGE, carrying every language version as an hreflang alternate
// (incl. x-default). Search engines learn the full 12-language cluster at discovery
// time — far better for multilingual indexing than 12 unrelated URLs, and far
// smaller files, so we can list every page type.
//
// No `lastModified`: it was `new Date()` (build time) on every URL, so each deploy
// claimed the entire site changed "just now" — a signal engines learn to ignore.
// Omitting it is better than a lie.
function entry(path: string, changeFrequency: Freq, priority: number): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}${path}`;
  languages['x-default'] = `${BASE}/en${path}`;
  return { url: `${BASE}/en${path}`, changeFrequency, priority, alternates: { languages } };
}

export async function generateSitemaps() {
  return Array.from({ length: getSitemapCount() }, (_, id) => ({ id }));
}

export default function sitemap({ id }: { id: number | string }): MetadataRoute.Sitemap {
  // Next passes `id` as a STRING — coerce, or `id === 0` fails (statics dropped) and
  // `(id + 1)` string-concats ("1"+1 = "11" → slice(1000,11000), overlapping children).
  const sid = Number(id);
  const iataCodes = getAllIataCodes();
  const slice = iataCodes.slice(sid * AIRPORTS_PER_SITEMAP, (sid + 1) * AIRPORTS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  // Hubs / index / country / city / airline pages live only in the first child.
  if (sid === 0) {
    entries.push(entry('', 'daily', 0.8));               // home
    entries.push(entry('/airports', 'weekly', 0.7));     // countries index
    // Legal / info pages — low priority but crawlable (AdSense reviewers & Googlebot
    // must be able to reach the Privacy Policy et al.).
    for (const p of ['/privacy', '/terms', '/about', '/contact']) entries.push(entry(p, 'yearly', 0.3));
    for (const L of LETTERS) entries.push(entry(`/az/${L}`, 'weekly', 0.4));
    for (const c of getCountries()) entries.push(entry(`/airports/${c.slug}`, 'weekly', 0.6));
    for (const c of getCities()) if (c.count > 1) entries.push(entry(`/city/${c.slug}`, 'weekly', 0.6));
    // Event guides (World Cup final etc.) — small, high-intent, freshness matters.
    for (const s of getEventSlugs()) entries.push(entry(`/event/${s}`, 'daily', 0.8));
    // Airline pages are noindex (thin across ~976 codes) — intentionally not listed.
  }

  for (const iata of slice) {
    const hub = HUBS.has(iata);
    const cf: Freq = hub ? 'hourly' : 'daily';
    entries.push(entry(`/airport/${iata}`, cf, hub ? 1.0 : 0.6));
    // Only hubs advertise arrivals/departures subpages. For the long tail these are
    // usually empty "No flights" near-dupes; listing them wasted crawl budget and fed
    // the mass-exclusion wave. They stay reachable (footer/board links) and indexable
    // when they DO have flights (robots gate in each subpage) — just not in the sitemap.
    if (hub) {
      entries.push(entry(`/airport/${iata}/arrivals`, cf, 0.9));
      entries.push(entry(`/airport/${iata}/departures`, cf, 0.9));
    }
  }

  return entries;
}
