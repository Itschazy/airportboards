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

  const title = t('arrivals_title', { airport: getAirportName(airport.iata, locale, airport.name), iata: airport.iata, city: getCityName(airport.city, locale) });
  const description = t('arrivals_description', { airport: getAirportName(airport.iata, locale, airport.name), iata: airport.iata, city: getCityName(airport.city, locale) });
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
  const h1 = t('arrivals_title', { airport: name, iata: airport.iata, city });
  const desc = t('arrivals_description', { airport: name, iata: airport.iata, city });

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: `${name} (${airport.iata})`, item: `${BASE}/${locale}/airport/${airport.iata}` },
        { '@type': 'ListItem', position: 3, name: tNav('arrivals'), item: canonical },
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
      <FlightBoard airport={airport} locale={locale} defaultMode="arrivals" displayName={getAirportName(airport.iata, locale, airport.name)} initialFlights={initialFlights} />
    </>
  );
}
