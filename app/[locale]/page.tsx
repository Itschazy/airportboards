import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  POPULAR_AIRPORTS, POPULAR_CITIES, getAirport, getCountries, getAllIataCodes,
} from '@/lib/airports';
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
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: `AirportsBoard — ${t('hero1')} ${t('hero2')}`,
    description: t('subline'),
    alternates: { canonical: `${BASE}/${locale}` },
  };
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#5A5A5A', marginBottom: 14 }}>
      {children}
    </div>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
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

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 18px 64px' }}>

      {/* HERO */}
      <h1 style={{
        fontSize: 'clamp(40px, 11vw, 56px)', fontWeight: 800, letterSpacing: '-0.04em',
        lineHeight: 1.02, color: '#FFFFFF', margin: 0,
      }}>
        {t('hero1')}<br />{t('hero2')}
      </h1>
      <p style={{ fontSize: 16, color: '#8A8A8A', marginTop: 16, lineHeight: 1.5, maxWidth: 460 }}>
        {t('subline')}
      </p>

      {/* SEARCH */}
      <div style={{ marginTop: 28 }}>
        <AirportSearch locale={locale} placeholder={tNav('search_placeholder')} nearestLabel={t('nearest')} />
      </div>

      {/* TRUST METRICS */}
      <div style={{ display: 'flex', gap: 22, marginTop: 24, flexWrap: 'wrap' }}>
        {[
          { icon: '✈', value: `${(Math.floor(totalAirports / 1000) * 1000).toLocaleString()}+`, label: t('m_airports') },
          { icon: '🌍', value: `${totalCountries}+`, label: t('m_countries') },
          { icon: '↻', value: t('m_updates_v'), label: t('m_updates_l') },
        ].map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 15, opacity: 0.7 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.1 }}>{m.value}</div>
              <div style={{ fontSize: 12, color: '#6A6A6A', lineHeight: 1.2 }}>{m.label}</div>
            </div>
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
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {countries.map(c => (
            <Link key={c.slug} href={`/${locale}/airports/${c.slug}`} style={{
              flexShrink: 0, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '12px 16px', minWidth: 130,
            }}>
              <div style={{ fontSize: 15, color: '#E4E4E7', whiteSpace: 'nowrap' }}>
                <span style={{ marginRight: 7 }}>{flag(c.iso2)}</span>{c.country}
              </div>
              <div style={{ fontSize: 12, color: '#6A6A6A', marginTop: 4 }}>{t('airports_count', { count: c.count })}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3 — POPULAR CITIES */}
      <section style={{ marginTop: 44 }}>
        <Title>{t('sec_cities')}</Title>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {POPULAR_CITIES.map(c => (
            <Link key={c.code} href={`/${locale}/airport/${c.iata}`} style={{
              flexShrink: 0, textDecoration: 'none', color: 'inherit',
              background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '12px 18px', textAlign: 'center', minWidth: 92,
            }}>
              <div style={{ fontSize: 15, color: '#E4E4E7', whiteSpace: 'nowrap' }}>{c.name}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6A6A6A', marginTop: 4, letterSpacing: '0.04em' }}>{c.code}</div>
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
