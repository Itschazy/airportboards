import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName } from '@/lib/places';
import { getBoard } from '@/lib/flights';
import { FlightBoard } from '@/components/FlightBoard';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';

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

  const title = t('departures_title', { airport: getAirportName(airport.iata, locale, airport.name), iata: airport.iata, city: getCityName(airport.city, locale) });
  const description = t('departures_description', { airport: getAirportName(airport.iata, locale, airport.name), iata: airport.iata, city: getCityName(airport.city, locale) });
  const canonical = `${BASE}/${locale}/airport/${airport.iata}/departures`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}/departures`;
  }
  languages['x-default'] = `${BASE}/en/airport/${airport.iata}/departures`;

  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: { title, description, type: 'website', url: canonical, siteName: 'AirportsBoard.live' },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function DeparturesPage({ params }: Props) {
  const { locale, iata } = await params;
  setRequestLocale(locale);
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}/departures`);
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}/departures`;
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'departures', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const h1 = t('departures_title', { airport: name, iata: airport.iata, city });
  const desc = t('departures_description', { airport: name, iata: airport.iata, city });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: `${name} (${airport.iata})`, item: `${BASE}/${locale}/airport/${airport.iata}` },
        { '@type': 'ListItem', position: 3, name: tNav('departures'), item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: h1,
      description: desc,
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
      <FlightBoard airport={airport} locale={locale} defaultMode="departures" displayName={getAirportName(airport.iata, locale, airport.name)} initialFlights={initialFlights} />
    </>
  );
}
