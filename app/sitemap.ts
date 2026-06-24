import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes } from '@/lib/airports';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher sitemap priority than obscure airfields — priority is
// relative, so flagging everything 1.0 tells crawlers nothing.
const HUBS = new Set(getStaticIataCodes());

export async function generateSitemaps() {
  return Array.from({ length: getSitemapCount() }, (_, id) => ({ id }));
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const iataCodes = getAllIataCodes();
  const slice = iataCodes.slice(id * AIRPORTS_PER_SITEMAP, (id + 1) * AIRPORTS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  // Home + country + A-Z index pages live only in the first child sitemap
  if (id === 0) {
    for (const locale of locales) {
      entries.push({ url: `${BASE}/${locale}`, changeFrequency: 'monthly', priority: 0.8 });
      entries.push({ url: `${BASE}/${locale}/airports`, changeFrequency: 'weekly', priority: 0.7 });
      for (const L of LETTERS) {
        entries.push({ url: `${BASE}/${locale}/az/${L}`, changeFrequency: 'weekly', priority: 0.5 });
      }
      for (const c of getCountries()) {
        entries.push({ url: `${BASE}/${locale}/airports/${c.slug}`, changeFrequency: 'weekly', priority: 0.7 });
      }
    }
  }

  for (const iata of slice) {
    const hub = HUBS.has(iata);
    const cf = hub ? 'hourly' as const : 'daily' as const;
    for (const locale of locales) {
      entries.push({ url: `${BASE}/${locale}/airport/${iata}`, changeFrequency: cf, priority: hub ? 1.0 : 0.6 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/arrivals`, changeFrequency: cf, priority: hub ? 0.9 : 0.5 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/departures`, changeFrequency: cf, priority: hub ? 0.9 : 0.5 });
    }
  }

  return entries;
}
