import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAirport, getStaticIataCodes } from '@/lib/airports';
import { getAirportContent } from '@/lib/airport-content';
import { FlightBoard } from '@/components/FlightBoard';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';

// Pre-render only major hubs; rest render on-demand and cache via ISR.
export const dynamicParams = true;
export const revalidate = 300;

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getStaticIataCodes().map(iata => ({ iata }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });

  const title = t('main_title', { airport: airport.name, city: airport.city, iata: airport.iata });
  const description = t('main_description', { airport: airport.name, iata: airport.iata, city: airport.city, country: airport.country });
  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}`;
  }

  return {
    title,
    description,
    keywords: [
      `${airport.name} departures`, `${airport.name} arrivals`,
      `${airport.iata} flight status`, `${airport.iata} live board`,
      `${airport.city} airport flights`, `${airport.name} real time`,
    ].join(', '),
    alternates: { canonical, languages },
    openGraph: {
      title, description, type: 'website', url: canonical,
      siteName: 'AirportsBoard.live',
    },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function AirportPage({ params }: Props) {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;
  const about = getAirportContent(airport.iata, locale);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Airport',
      iataCode: airport.iata,
      icaoCode: airport.icao,
      name: airport.name,
      url: canonical,
      address: {
        '@type': 'PostalAddress',
        addressLocality: airport.city,
        addressCountry: airport.iso2 || airport.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: airport.lat,
        longitude: airport.lon,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: `${airport.name} (${airport.iata})`, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${airport.name} Live Flight Board`,
      description: `Live arrivals and departures at ${airport.name} (${airport.iata}), ${airport.city}`,
      url: canonical,
      inLanguage: locale,
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <FlightBoard airport={airport} locale={locale} />
      {about && (
        <section style={{ background: '#050505', padding: '8px 16px 56px' }}>
          <article style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{
              fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)', fontWeight: 700,
              letterSpacing: '-0.02em', color: '#FFFFFF', marginBottom: '0.75rem',
            }}>
              {airport.name} ({airport.iata})
            </h2>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#9A9A9A' }}>
              {about}
            </p>
          </article>
        </section>
      )}
    </>
  );
}
