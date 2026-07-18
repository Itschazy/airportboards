import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes, getCountries, getCities } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { getBoard, getBoardFetchedAt } from '@/lib/flights';
import { FlightBoard } from '@/components/FlightBoard';
import { EventBanner } from '@/components/EventBanner';
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
  const name = getAirportName(airport.iata, locale, airport.name);
  const cityName = getCityName(airport.city, locale);
  // Append the city only when the airport's localized name doesn't already contain it.
  const showCity = name.toLowerCase().includes(cityName.toLowerCase()) ? 'no' : 'yes';

  const title = t('arrivals_title', { airport: name, iata: airport.iata, city: cityName, showCity });
  const description = t('arrivals_description', { airport: name, iata: airport.iata, city: cityName });
  const canonical = `${BASE}/${locale}/airport/${airport.iata}/arrivals`;

  // Only index an arrivals board that actually has flights. Thousands of small airfields
  // otherwise ship near-identical "No flights" subpages (×12 locales) that dilute crawl
  // budget and get mass-excluded, dragging host trust down. getBoard reads the in-memory
  // store (live=false → never spends airlabs) — same read the page body does.
  let hasFlights = false;
  try { hasFlights = (await getBoard(airport.iata, 'arrivals', locale)).length > 0; } catch {}

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}/arrivals`;
  }
  languages['x-default'] = `${BASE}/en/airport/${airport.iata}/arrivals`;

  return {
    title,
    description,
    // Advertise the 12-language hreflang cluster only when the page is indexable.
    alternates: hasFlights ? { canonical, languages } : { canonical },
    // og/twitter (incl. default OG image) inherited from layout; custom openGraph would drop it.
    robots: { index: hasFlights, follow: true },
  };
}

export default async function ArrivalsPage({ params }: Props) {
  const { locale, iata } = await params;
  setRequestLocale(locale);
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}/arrivals`);
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}/arrivals`;
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'arrivals', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  const showCity = name.toLowerCase().includes(city.toLowerCase()) ? 'no' : 'yes';
  const h1 = t('arrivals_title', { airport: name, iata: airport.iata, city, showCity });
  const desc = t('arrivals_description', { airport: name, iata: airport.iata, city });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      // Home → Country → City (if it has an indexed page) → Airport → Arrivals.
      itemListElement: (() => {
        const countryInfo = getCountries().find(c => c.country === airport.country);
        const cityInfo = getCities().find(c => c.city === airport.city && c.country === airport.country);
        const trail: { name: string; item: string }[] = [{ name: tNav('home'), item: `${BASE}/${locale}` }];
        if (countryInfo) trail.push({ name: country, item: `${BASE}/${locale}/airports/${countryInfo.slug}` });
        if (cityInfo && cityInfo.count > 1) trail.push({ name: city, item: `${BASE}/${locale}/city/${cityInfo.slug}` });
        trail.push({ name: `${name} (${airport.iata})`, item: `${BASE}/${locale}/airport/${airport.iata}` });
        trail.push({ name: tNav('arrivals'), item: canonical });
        return trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }));
      })(),
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
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      <FlightBoard airport={airport} locale={locale} defaultMode="arrivals" displayName={getAirportName(airport.iata, locale, airport.name)} initialFlights={initialFlights.slice(0, 40)} initialFetchedAt={getBoardFetchedAt(airport.iata, 'arrivals')} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 8px' }}>
        <EventBanner iata={airport.iata} locale={locale} />
      </div>
    </>
  );
}
