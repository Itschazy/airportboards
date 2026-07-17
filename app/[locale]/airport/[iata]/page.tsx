import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes, getCountries, getCities } from '@/lib/airports';
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
    // openGraph/twitter (incl. the default OG image) are inherited from the locale layout;
    // Next auto-fills og/twitter title+description from the title/description above. Defining
    // a custom openGraph here would suppress the inherited file-based og:image.
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
      // Deep trail Home → Country → City (only if the city has >1 airport, i.e. an
      // indexed city page exists) → Airport. Richer breadcrumbs earn the trail in the
      // SERP snippet and spread internal link context.
      itemListElement: (() => {
        const countryInfo = getCountries().find(c => c.country === airport.country);
        const cityInfo = getCities().find(c => c.city === airport.city && c.country === airport.country);
        const trail: { name: string; item: string }[] = [{ name: tNav('home'), item: `${BASE}/${locale}` }];
        if (countryInfo) trail.push({ name: country, item: `${BASE}/${locale}/airports/${countryInfo.slug}` });
        if (cityInfo && cityInfo.count > 1) trail.push({ name: city, item: `${BASE}/${locale}/city/${cityInfo.slug}` });
        trail.push({ name: `${name} (${airport.iata})`, item: canonical });
        return trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }));
      })(),
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
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      {/* SSR only the first 40 rows to keep the HTML light (the client refetches the full
          board on mount); AirportBottom still gets the full set to aggregate routes/airlines. */}
      <FlightBoard airport={airport} locale={locale} displayName={name} initialFlights={initialFlights.slice(0, 40)} />
      <AirportBottom airport={airport} locale={locale} about={about} displayName={name} flights={initialFlights} />
    </>
  );
}
