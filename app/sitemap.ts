import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes, getCities } from '@/lib/airports';
import airlines from '@/data/airlines.json';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher priority than obscure airfields (priority is relative).
const HUBS = new Set(getStaticIataCodes());
const AIRLINE_CODES = Object.keys(airlines as Record<string, string>).filter(k => /^[A-Z0-9]{2}$/.test(k));
const NOW = new Date();

type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

// One entry per PAGE, carrying every language version as an hreflang alternate
// (incl. x-default). Search engines learn the full 12-language cluster at discovery
// time — far better for multilingual indexing than 12 unrelated URLs, and far
// smaller files, so we can list every page type.
function entry(path: string, changeFrequency: Freq, priority: number): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}${path}`;
  languages['x-default'] = `${BASE}/en${path}`;
  return { url: `${BASE}/en${path}`, lastModified: NOW, changeFrequency, priority, alternates: { languages } };
}

export async function generateSitemaps() {
  return Array.from({ length: getSitemapCount() }, (_, id) => ({ id }));
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const iataCodes = getAllIataCodes();
  const slice = iataCodes.slice(id * AIRPORTS_PER_SITEMAP, (id + 1) * AIRPORTS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  // Hubs / index / country / city / airline pages live only in the first child.
  if (id === 0) {
    entries.push(entry('', 'daily', 0.8));               // home
    entries.push(entry('/airports', 'weekly', 0.7));     // countries index
    for (const L of LETTERS) entries.push(entry(`/az/${L}`, 'weekly', 0.4));
    for (const c of getCountries()) entries.push(entry(`/airports/${c.slug}`, 'weekly', 0.6));
    for (const c of getCities()) if (c.count > 1) entries.push(entry(`/city/${c.slug}`, 'weekly', 0.6));
    for (const code of AIRLINE_CODES) entries.push(entry(`/airline/${code}`, 'daily', 0.5));
  }

  for (const iata of slice) {
    const hub = HUBS.has(iata);
    const cf: Freq = hub ? 'hourly' : 'daily';
    entries.push(entry(`/airport/${iata}`, cf, hub ? 1.0 : 0.6));
    entries.push(entry(`/airport/${iata}/arrivals`, cf, hub ? 0.9 : 0.5));
    entries.push(entry(`/airport/${iata}/departures`, cf, hub ? 0.9 : 0.5));
  }

  return entries;
}
