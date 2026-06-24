import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getCountries } from '@/lib/airports';
import { getCountryName } from '@/lib/places';
import { locales } from '@/lib/i18n';

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
    title: `${title} — AirportsBoard`,
    description: t('footer_tagline'),
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

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: '#5A5A5A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px' }}>
        {t('sec_countries')}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', margin: '0 0 28px' }}>
        {countries.length} {t('m_countries')}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
        {countries.map(c => (
          <li key={c.slug}>
            <Link href={`/${locale}/airports/${c.slug}`} style={{
              display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '12px 16px',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, width: 26, textAlign: 'center', lineHeight: 1 }}>{flag(c.iso2)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: '#E4E4E7', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: 13, color: '#5A5A5A', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
