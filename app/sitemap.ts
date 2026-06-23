import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount } from '@/lib/airports';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';

export async function generateSitemaps() {
  return Array.from({ length: getSitemapCount() }, (_, id) => ({ id }));
}

export default function sitemap({ id }: { id: number }): MetadataRoute.Sitemap {
  const iataCodes = getAllIataCodes();
  const slice = iataCodes.slice(id * AIRPORTS_PER_SITEMAP, (id + 1) * AIRPORTS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  // Home pages live only in the first child sitemap
  if (id === 0) {
    for (const locale of locales) {
      entries.push({ url: `${BASE}/${locale}`, changeFrequency: 'monthly', priority: 0.8 });
    }
  }

  for (const iata of slice) {
    for (const locale of locales) {
      entries.push({ url: `${BASE}/${locale}/airport/${iata}`, changeFrequency: 'hourly', priority: 1.0 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/arrivals`, changeFrequency: 'hourly', priority: 0.9 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/departures`, changeFrequency: 'hourly', priority: 0.9 });
    }
  }

  return entries;
}
