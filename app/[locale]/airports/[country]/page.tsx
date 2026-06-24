import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCountryBySlug, getAirportsByCountry, getCountries } from '@/lib/airports';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; country: string }> };

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  // Pre-render the busiest 40 countries; the rest render on-demand.
  return getCountries().slice(0, 40).map(c => ({ country: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, country } = await params;
  setRequestLocale(locale);
  const c = getCountryBySlug(country);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const title = t('country_title', { country: c.country });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/airports/${c.slug}`;
  languages['x-default'] = `${BASE}/en/airports/${c.slug}`;
  return {
    title: `${title} — AirportsBoard`,
    description: t('country_desc', { country: c.country, count: c.count }),
    alternates: { canonical: `${BASE}/${locale}/airports/${c.slug}`, languages },
  };
}

export default async function CountryPage({ params }: Props) {
  const { locale, country } = await params;
  setRequestLocale(locale);
  const c = getCountryBySlug(country);
  if (!c) notFound();
  const t = await getTranslations({ locale, namespace: 'home' });
  const airports = getAirportsByCountry(country);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 18px 64px' }}>
      <div style={{ fontSize: 13, color: '#5A5A5A', marginBottom: 8 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1.05, margin: 0 }}>
        <span style={{ marginRight: 12 }}>{flag(c.iso2)}</span>{t('country_title', { country: c.country })}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', marginTop: 12 }}>{t('airports_count', { count: c.count })}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28 }}>
        {airports.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '11px 16px',
          }}>
            <span style={{ width: 50, flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#0A84FF', letterSpacing: '-0.02em' }}>{a.iata}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: '#E4E4E7', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</span>
              <span style={{ fontSize: 12, color: '#5A5A5A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
            </span>
            <svg width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
