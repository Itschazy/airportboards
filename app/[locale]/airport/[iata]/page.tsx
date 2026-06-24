import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes } from '@/lib/airports';
import { getAirportContent } from '@/lib/airport-content';
import { getAirportName } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { getBoard } from '@/lib/flights';
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
  setRequestLocale(locale);
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);

  const title = t('main_title', { airport: name, city, iata: airport.iata });
  const description = t('main_description', { airport: name, iata: airport.iata, city, country });
  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}`;
  }
  languages['x-default'] = `${BASE}/en/airport/${airport.iata}`;

  return {
    title,
    description,
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
  setRequestLocale(locale);
  // Wrong-case IATA → single permanent (308) redirect to the canonical uppercase URL
  // (saves crawl budget; permanent so engines drop the lowercase variant from the index).
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}`);
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;
  const about = getAirportContent(airport.iata, locale);
  // SSR the first (departures) board so the page is useful without client JS.
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'departures', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  const h1 = t('main_title', { airport: name, iata: airport.iata, city, country });
  const webDesc = t('main_description', { airport: name, iata: airport.iata, city, country });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Airport',
      iataCode: airport.iata,
      icaoCode: airport.icao,
      name,
      alternateName: airport.name,
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
        { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: `${name} (${airport.iata})`, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${name} (${airport.iata})`,
      description: webDesc,
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
      <FlightBoard airport={airport} locale={locale} displayName={name} initialFlights={initialFlights} />
      <AirportBottom airport={airport} locale={locale} about={about} displayName={name} />
    </>
  );
}
