import { getTranslations , setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  POPULAR_AIRPORTS, POPULAR_CITIES, getAirport, getCountries, getAllIataCodes, slugify,
} from '@/lib/airports';
import { locales } from '@/lib/i18n';
import { AirportSearch } from '@/components/AirportSearch';
import { PopularNow } from '@/components/PopularNow';
import { PopularList } from '@/components/PopularList';
import { RecentlyViewed } from '@/components/RecentlyViewed';

type Props = { params: Promise<{ locale: string }> };

const BASE = 'https://airportsboard.live';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}`;
  languages['x-default'] = `${BASE}/en`;
  return {
    title: `AirportsBoard — ${t('hero1')} ${t('hero2')}`,
    description: t('subline'),
    alternates: { canonical: `${BASE}/${locale}`, languages },
  };
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#5A5A5A', marginBottom: 14 }}>
      {children}
    </div>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tUi = await getTranslations({ locale, namespace: 'ui' });

  const popularNow = POPULAR_AIRPORTS.slice(0, 8).map(iata => {
    const a = getAirport(iata);
    return a ? { iata, city: a.city } : null;
  }).filter(Boolean) as { iata: string; city: string }[];

  const popularList = POPULAR_AIRPORTS.map(iata => {
    const a = getAirport(iata);
    return a ? { iata, city: a.city, name: a.name } : null;
  }).filter(Boolean) as { iata: string; city: string; name: string }[];

  const countries = getCountries().slice(0, 16);
  const totalAirports = getAllIataCodes().length;
  const totalCountries = getCountries().length;

  const depShort = t('departures_short');
  const arrShort = t('arrivals_short');

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: 'AirportsBoard', url: `${BASE}/${locale}`, inLanguage: locale,
      description: t('subline'),
    },
    {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'AirportsBoard', url: BASE, logo: `${BASE}/apple-icon`,
    },
  ];

  return (
    <main style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '40px 24px 64px', overflowX: 'clip' }}>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* HERO */}
      <h1 style={{
        fontSize: 'clamp(48px, 13vw, 76px)', fontWeight: 800, letterSpacing: '-0.05em',
        lineHeight: 0.95, color: '#FFFFFF', margin: 0, maxWidth: '100%',
      }}>
        {t('hero1')}<br />{t('hero2')}
      </h1>
      <p style={{ fontSize: 16, color: '#8A8A8A', marginTop: 18, lineHeight: 1.5, maxWidth: '100%', overflowWrap: 'break-word' }}>
        {t('subline')}
      </p>

      {/* SEARCH */}
      <div style={{ marginTop: 28, width: '100%' }}>
        <AirportSearch locale={locale} placeholder={tNav('search_placeholder')} nearestLabel={t('nearest')} />
      </div>

      {/* TRUST METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 26 }}>
        {[
          { icon: '✈', value: `${(Math.floor(totalAirports / 1000) * 1000).toLocaleString()}+`, label: t('m_airports') },
          { icon: '🌍', value: `${totalCountries}+`, label: t('m_countries') },
          { icon: '↻', value: t('m_updates_v'), label: t('m_updates_l') },
        ].map((m, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.15 }}>
              <span style={{ opacity: 0.7, marginRight: 5, fontWeight: 400 }}>{m.icon}</span>{m.value}
            </div>
            <div style={{ fontSize: 12, color: '#6A6A6A', lineHeight: 1.25, marginTop: 2, overflowWrap: 'break-word' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* SECTION 1 — POPULAR NOW */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_popular_now')}</Title>
        <PopularNow airports={popularNow} locale={locale} depLabel={depShort} arrLabel={arrShort} />
      </section>

      {/* SECTION 2 — BY COUNTRY */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_countries')}</Title>
        <div className="scroll-row">
          {countries.map(c => (
            <Link key={c.slug} href={`/${locale}/airports/${c.slug}`} style={{
              width: 190, height: 88, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 15, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ marginRight: 7 }}>{flag(c.iso2)}</span>{c.country}
              </div>
              <div style={{ fontSize: 12, color: '#6A6A6A', marginTop: 5 }}>{t('airports_count', { count: c.count })}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3 — POPULAR CITIES */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_cities')}</Title>
        <div className="scroll-row">
          {POPULAR_CITIES.map(c => (
            <Link key={c.code} href={`/${locale}/city/${slugify(getAirport(c.iata)?.city || c.name)}`} style={{
              width: 150, height: 92, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '12px 18px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{c.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6A6A6A', marginTop: 5, letterSpacing: '0.06em' }}>{c.code}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 4 — POPULAR AIRPORTS */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_airports')}</Title>
        <PopularList airports={popularList} locale={locale} depLabel={depShort} arrLabel={arrShort} />
      </section>

      {/* SECTION 5 — RECENTLY VIEWED */}
      <RecentlyViewed locale={locale} title={t('sec_recent')} />

      {/* SECTION 6 — A-Z */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_az')}</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LETTERS.map(L => (
            <Link key={L} href={`/${locale}/az/${L.toLowerCase()}`} style={{
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 12, border: '1px solid #1A1A1A', background: '#0B0B0B',
              textDecoration: 'none', color: '#E4E4E7', fontSize: 15, fontWeight: 600,
            }}>
              {L}
            </Link>
          ))}
        </div>
      </section>

    </main>
  );
}
