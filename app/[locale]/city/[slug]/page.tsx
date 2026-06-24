import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCities, getCityBySlug, getAirportsByCity } from '@/lib/airports';
import { getCityName, getCountryName } from '@/lib/places';
import { getAirportName } from '@/lib/airport-names';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; slug: string }> };

// Pre-render multi-airport cities (highest value); the rest render on-demand via ISR.
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  // Prerender only the top multi-airport cities; the rest render on-demand via ISR.
  // (A small VDS can't prerender thousands of extra pages without OOM during build.)
  return getCities().filter(c => c.count > 1).slice(0, 20).map(c => ({ slug: c.slug }));
}

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = getCityBySlug(slug);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const city = getCityName(c.city, locale);
  const title = t('city_title', { city });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/city/${c.slug}`;
  languages['x-default'] = `${BASE}/en/city/${c.slug}`;
  return {
    title: `${title} — AirportsBoard`,
    description: t('city_desc', { city, count: c.count }),
    alternates: { canonical: `${BASE}/${locale}/city/${c.slug}`, languages },
    // A single-airport "city" page is near-duplicate of that airport — don't index it.
    robots: { index: c.count > 1, follow: true },
  };
}

export default async function CityPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const c = getCityBySlug(slug);
  if (!c) notFound();
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const airports = getAirportsByCity(slug);
  const city = getCityName(c.city, locale);
  const country = getCountryName(c.country, locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('city_title', { city }), item: `${BASE}/${locale}/city/${c.slug}` },
    ],
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: '#5A5A5A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
        {' · '}
        <Link href={`/${locale}/airports`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>{t('sec_countries')}</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px' }}>
        {flag(c.iso2)} {t('city_title', { city })}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', margin: '0 0 28px' }}>
        {t('city_desc', { city, count: c.count })}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {airports.map(a => (
          <li key={a.iata}>
            <Link href={`/${locale}/airport/${a.iata}`} style={{
              display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '14px 18px',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0A84FF', width: 48, flexShrink: 0, letterSpacing: '-0.02em' }}>{a.iata}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, color: '#E4E4E7', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6A6A6A', marginTop: 2 }}>{country}</span>
              </span>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}><path d="M1 1L7 7L1 13" stroke="#3A3A3C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
