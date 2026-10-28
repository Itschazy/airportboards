import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getCountries } from '@/lib/airports';
import { getCountryName } from '@/lib/places';
import { numLocale, locales } from '@/lib/i18n';
import { localizedMeasuredOn } from '@/lib/measured-date';
import { worldServiceCounts } from '@/lib/warm';
import { assertLocale } from '@/lib/locale-guard';

// Counts are passed to ICU pre-formatted for the locale: a bare placeholder renders 6069,
// while German expects 6.069 and French 6 069.
const fmt = (n: number, locale: string) => n.toLocaleString(numLocale(locale));

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string }> };

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations({ locale, namespace: 'home' });
  const title = t('sec_countries');
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/airports`;
  languages['x-default'] = `${BASE}/en/airports`;
  return {
    title: withBrand(title),
    description: (() => {
      const w = worldServiceCounts();
      if (!w.generated || !w.withService) return t('footer_tagline', { served: w.withService });
      // Same rule as the country pages: only claim the full breakdown when nothing is unknown.
      return w.probed > w.withService + w.empty
        ? t('world_split_partial', { total: w.probed, date: localizedMeasuredOn(w.generated, locale), served: w.withService })
        : t('world_split', { total: w.probed, date: localizedMeasuredOn(w.generated, locale), served: w.withService, rest: w.empty });
    })(),
    alternates: { canonical: `${BASE}/${locale}/airports`, languages },
    robots: { index: true, follow: true },
  };
}

export default async function AirportsIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
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
    // Ширина и отступы как у страницы страны и страницы аэропорта: 760 выбивались
    // из общей колонки, и при переходе с главной страница заметно сужалась.
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {dataset && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />}
      {/* Крошки той же стеклянной капсулой, что на странице страны. Здесь была
          одинокая серая ссылка «airportsboard» без указания текущей страницы —
          то есть след навигации, который ничего не сообщал о том, где человек. */}
      <nav aria-label={t('sec_countries')} className="crumbs-wrap" style={{ padding: '20px 0 0' }}>
        <ol className="crumbs glass">
          <li>
            <Link href={`/${locale}`}>airportsboard</Link>
            <svg data-flip width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 5.5 16 12l-6.5 6.5" />
            </svg>
          </li>
          <li aria-current="page" className="crumbs-current">{t('sec_countries')}</li>
        </ol>
      </nav>
      {/* Заголовок, счётчик и вводная фраза — одна стеклянная панель, как шапка
          страницы аэропорта и страны. Прежде они лежали прямо на обоях. */}
      <div className="ap-head glass" style={{ marginTop: 10 }}>
        <h1 style={{ fontSize: 'clamp(26px, 7vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', lineHeight: 1.1, margin: 0 }}>
          {t('sec_countries')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ab-8a8a8a)', marginTop: 8 }}>
          {countries.length.toLocaleString(numLocale(locale))} {t('m_countries')}
        </p>
        {world.generated && world.withService > 0 && (
          <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ab-c7c7cc)', marginTop: 12, maxWidth: 640 }}>
            {world.probed > world.withService + world.empty
              ? t('world_split_partial', { total: world.probed, date: localizedMeasuredOn(world.generated!, locale), served: world.withService })
              : t('world_split', { total: world.probed, date: localizedMeasuredOn(world.generated!, locale), served: world.withService, rest: world.empty })}
          </p>
        )}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginTop: 28 }}>
        {countries.map(c => (
          <li key={c.slug}>
            <Link href={`/${locale}/airports/${c.slug}`} style={{
              display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
              background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 16, padding: '12px 16px',
            }}>
              <span className="locale-flag" style={{ fontSize: 20, flexShrink: 0, width: 26, textAlign: 'center', lineHeight: 1 }}>{flag(c.iso2)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: 'var(--ab-e4e4e7)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: 13, color: 'var(--ab-8a8a8a)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{c.count.toLocaleString(numLocale(locale))}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
