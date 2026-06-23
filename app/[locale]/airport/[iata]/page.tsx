import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAirport, getAllIataCodes } from '@/lib/airports';
import { FlightBoard } from '@/components/FlightBoard';
import { locales } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getAllIataCodes().map(iata => ({ iata }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });

  const title = t('main_title', { airport: airport.name, city: airport.city, iata: airport.iata });
  const description = t('description', { airport: airport.name, iata: airport.iata, city: airport.city, country: airport.country });

  const alternates: Record<string, string> = {};
  for (const loc of locales) {
    alternates[loc] = `https://airportboards.live/${loc}/airport/${iata.toUpperCase()}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: `https://airportboards.live/${locale}/airport/${iata.toUpperCase()}`,
      languages: alternates,
    },
    openGraph: { title, description, type: 'website' },
  };
}

export default async function AirportPage({ params }: Props) {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();
  const t = await getTranslations({ locale, namespace: 'meta' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    'iataCode': airport.iata,
    'icaoCode': airport.icao,
    'name': airport.name,
    'address': { '@type': 'PostalAddress', 'addressLocality': airport.city, 'addressCountry': airport.iso2 || airport.country },
    'geo': { '@type': 'GeoCoordinates', 'latitude': airport.lat, 'longitude': airport.lon },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FlightBoard airport={airport} locale={locale} />
    </>
  );
}
