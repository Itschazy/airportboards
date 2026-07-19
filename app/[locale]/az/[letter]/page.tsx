import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirportsByLetter } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
type Props = { params: Promise<{ locale: string; letter: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LETTERS.map(letter => ({ letter }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, letter } = await params;
  setRequestLocale(locale);
  const L = letter.toUpperCase();
  if (!LETTERS.includes(letter.toLowerCase())) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/az/${letter.toLowerCase()}`;
  languages['x-default'] = `${BASE}/en/az/${letter.toLowerCase()}`;
  return {
    title: withBrand(t('az_title', { letter: L })),
    description: t('az_desc', { letter: L }),
    alternates: { canonical: `${BASE}/${locale}/az/${letter.toLowerCase()}`, languages },
    robots: { index: true, follow: true },
  };
}

export default async function LetterPage({ params }: Props) {
  const { locale, letter } = await params;
  setRequestLocale(locale);
  if (!LETTERS.includes(letter.toLowerCase())) notFound();
  const L = letter.toUpperCase();
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const airports = getAirportsByLetter(letter);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('az_title', { letter: L }), item: `${BASE}/${locale}/az/${letter.toLowerCase()}` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('az_title', { letter: L }),
    numberOfItems: airports.length,
    itemListElement: airports.map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: getAirportName(a.iata, locale, a.name),
      item: `${BASE}/${locale}/airport/${a.iata}`,
    })),
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: 0 }}>
        {t('az_title', { letter: L })}
      </h1>

      {/* Letter nav */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 20 }}>
        {LETTERS.map(x => (
          <Link key={x} href={`/${locale}/az/${x}`} style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, border: '1px solid #1A1A1A', textDecoration: 'none',
            background: x === letter.toLowerCase() ? '#FFFFFF' : '#0B0B0B',
            color: x === letter.toLowerCase() ? '#000000' : '#8A8A8A', fontSize: 13, fontWeight: 600,
          }}>
            {x.toUpperCase()}
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 14, color: '#6A6A6A', marginTop: 22, marginBottom: 14 }}>{t('airports_count', { count: airports.length })}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {airports.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '11px 16px',
          }}>
            <span style={{ width: 50, flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#0A84FF', letterSpacing: '-0.02em' }}>{a.iata}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: '#E4E4E7', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
              <span style={{ fontSize: 12, color: '#8A8A8A', display: 'block' }}>{getCityName(a.city, locale)}, {getCountryName(a.country, locale)}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
