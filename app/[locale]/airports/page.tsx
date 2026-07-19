import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getCountries } from '@/lib/airports';
import { getCountryName } from '@/lib/places';
import { locales } from '@/lib/i18n';
import { localizedMeasuredOn } from '@/lib/measured-date';
import { worldServiceCounts } from '@/lib/warm';

// Counts are passed to ICU pre-formatted for the locale: a bare placeholder renders 6069,
// while German expects 6.069 and French 6 069.
const fmt = (n: number, locale: string) => n.toLocaleString(locale);

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string }> };

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const title = t('sec_countries');
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/airports`;
  languages['x-default'] = `${BASE}/en/airports`;
  return {
    title: withBrand(title),
    description: (() => {
      const w = worldServiceCounts();
      if (!w.generated || !w.withService) return t('footer_tagline');
      // Same rule as the country pages: only claim the full breakdown when nothing is unknown.
      return w.probed > w.withService + w.empty
        ? t('world_split_partial', { total: fmt(w.probed, locale), date: localizedMeasuredOn(w.generated, locale), served: fmt(w.withService, locale) })
        : t('world_split', { total: fmt(w.probed, locale), date: localizedMeasuredOn(w.generated, locale), served: fmt(w.withService, locale), rest: fmt(w.empty, locale) });
    })(),
    alternates: { canonical: `${BASE}/${locale}/airports`, languages },
    robots: { index: true, follow: true },
  };
}

export default async function AirportsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  // Sort by airport count (busiest countries first).
  const countries = getCountries()
    .map(c => ({ ...c, name: getCountryName(c.country, locale) }))
    .sort((a, b) => b.count - a.count);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('sec_countries'), item: `${BASE}/${locale}/airports` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('sec_countries'),
    numberOfItems: countries.length,
    itemListElement: countries.map((c, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: c.name,
      item: `${BASE}/${locale}/airports/${c.slug}`,
    })),
  };

  const world = worldServiceCounts();
  // We probed every IATA code in the dataset, so how many airports on earth actually have
  // scheduled passenger service is a measurement we own. Declaring it as a Dataset gives an
  // answer engine something to cite by name instead of an anonymous number in a paragraph.
  // Deliberately no `license` and no raw download: the underlying per-airport values come
  // from airlabs, and asserting redistribution rights over them is a decision for the owner.
  const dataset = world.generated && world.probed ? {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Worldwide airport scheduled-service levels',
    description: `Which of the world's ${world.probed} IATA-coded airports have scheduled passenger service. Measured by probing published flight schedules for every code: ${world.withService} had scheduled departures, ${world.empty} had none.`,
    url: `${BASE}/${locale}/airports`,
    inLanguage: locale,
    dateModified: world.generated,
    temporalCoverage: world.generated,
    measurementTechnique: 'Scheduled departures observed per airport at probe time',
    variableMeasured: 'Presence of scheduled commercial passenger service',
    creator: { '@type': 'Organization', name: 'AirportsBoard', url: BASE },
  } : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {dataset && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />}
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px' }}>
        {t('sec_countries')}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', margin: '0 0 14px' }}>
        {countries.length} {t('m_countries')}
      </p>
      {world.generated && world.withService > 0 && (
        <p style={{ fontSize: 15, lineHeight: 1.55, color: '#C7C7CC', margin: '0 0 28px', maxWidth: 660 }}>
          {world.probed > world.withService + world.empty
            ? t('world_split_partial', { total: fmt(world.probed, locale), date: localizedMeasuredOn(world.generated!, locale), served: fmt(world.withService, locale) })
            : t('world_split', { total: fmt(world.probed, locale), date: localizedMeasuredOn(world.generated!, locale), served: fmt(world.withService, locale), rest: fmt(world.empty, locale) })}
        </p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {countries.map(c => (
          <li key={c.slug}>
            <Link href={`/${locale}/airports/${c.slug}`} style={{
              display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '12px 16px',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, width: 26, textAlign: 'center', lineHeight: 1 }}>{flag(c.iso2)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: '#E4E4E7', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: 13, color: '#8A8A8A', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
