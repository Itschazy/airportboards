import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAirport, getStaticIataCodes } from '@/lib/airports';
import { getAirportContent } from '@/lib/airport-content';
import { FlightBoard } from '@/components/FlightBoard';
import { AirportBottom } from '@/components/AirportBottom';
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
  const t = await getTranslations({ locale, namespace: 'meta' });
  const h1 = t('main_title', { airport: airport.name, iata: airport.iata, city: airport.city, country: airport.country });

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
      <h1 style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
      }}>
        {h1}
      </h1>
      <FlightBoard airport={airport} locale={locale} />
      <AirportBottom airport={airport} locale={locale} about={about} />
    </>
  );
}
