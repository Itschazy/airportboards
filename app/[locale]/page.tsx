import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { POPULAR_AIRPORTS, getAirport } from '@/lib/airports';
import { AirportSearch } from '@/components/AirportSearch';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: `AirportsBoard — ${t('headline')}`,
    description: t('subline'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  const popularAirports = POPULAR_AIRPORTS
    .map(iata => ({ iata, ...getAirport(iata) }))
    .filter(a => a.name);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem 3rem' }}>

      {/* Hero */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
          marginBottom: '0.5rem',
        }}>
          {t('headline')}
        </h1>
        <p style={{ fontSize: '0.9375rem', color: '#8A8A8A' }}>
          {t('subline')}
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '2.5rem' }}>
        <AirportSearch locale={locale} placeholder={tNav('search_placeholder')} />
      </div>

      {/* Popular airports */}
      <div>
        <p style={{
          fontSize: '0.6875rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: '#3A3A3C', marginBottom: '0.75rem',
        }}>
          {t('popular')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {popularAirports.map(a => (
            <Link
              key={a.iata}
              href={`/${locale}/airport/${a.iata}`}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                padding: '0.5rem 0.875rem',
                border: '1px solid #1A1A1A',
                borderRadius: 12,
                textDecoration: 'none',
                color: 'inherit',
                background: '#0B0B0B',
                minWidth: 70,
              }}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                {a.iata}
              </span>
              <span style={{ fontSize: '0.6875rem', color: '#8A8A8A', marginTop: '0.1rem' }}>
                {a.city}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
