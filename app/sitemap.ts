import type { MetadataRoute } from 'next';
import { getAllIataCodes } from '@/lib/airports';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';

export default function sitemap(): MetadataRoute.Sitemap {
  const iataCodes = getAllIataCodes();
  const entries: MetadataRoute.Sitemap = [];

  // Home pages per locale
  for (const locale of locales) {
    entries.push({ url: `${BASE}/${locale}`, changeFrequency: 'monthly', priority: 0.8 });
  }

  // Airport pages: main + arrivals + departures per locale
  for (const iata of iataCodes) {
    for (const locale of locales) {
      entries.push({ url: `${BASE}/${locale}/airport/${iata}`, changeFrequency: 'hourly', priority: 1.0 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/arrivals`, changeFrequency: 'hourly', priority: 0.9 });
      entries.push({ url: `${BASE}/${locale}/airport/${iata}/departures`, changeFrequency: 'hourly', priority: 0.9 });
    }
  }

  return entries;
}
