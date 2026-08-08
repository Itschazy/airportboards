import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes, getCountries, getCities } from '@/lib/airports';
import { getAirportName, getAirportNameBare } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { getBoard, getBoardFetchedAt } from '@/lib/flights';
import { FlightBoard } from '@/components/FlightBoard';
import { AirportBottom } from '@/components/AirportBottom';
import { getAirportContent } from '@/lib/airport-content';
import { hasWikiAirlines } from '@/lib/wiki-routes';
import { hasNoService, nearestServiced, sourcedNoCommercialService, serviceLevel } from '@/lib/warm';
import { nearestAirports } from '@/lib/airports';
import { Breadcrumb } from '@/components/Breadcrumb';
import { airportNodeId } from '@/lib/airport-sameas';
import { EventBanner } from '@/components/EventBanner';
import { locales } from '@/lib/i18n';
import { currentIata } from '@/lib/iata-aliases';
import { showCityFlag } from '@/lib/show-city';

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
  const showCity = showCityFlag(getAirportNameBare(airport.iata, locale, airport.name), cityName, airport.city);

  // The parent decides whether this airport has a board at all, and until now these two
  // subpages ignored that decision entirely: LWO's parent read "No scheduled flights" while
  // /airport/LWO/departures read "Live Departures", both indexed, 23,772 URLs across the pair.
  // Same predicate as the parent (page.tsx) so the three pages cannot disagree again.
  const boardless = hasNoService(airport.iata);
  // The parent has a THIRD state between "has a board" and "has no service": never measured,
  // no published routes — nothing the warmer can ever fill. It offers airport information
  // there. Mirroring only the no-service branch left 308 airports with a parent reading
  // "— airport information" above a subpage reading "Live Departures".
  const lvl = serviceLevel(airport.iata);
  // Never measured, no published routes — or measured at one or two flights a day, where the
  // board is empty 71% of the time (sampled on production). Both are airports whose page is
  // information rather than a live board; the parent makes the same call on the same numbers.
  const infoOnly = !boardless
    && ((lvl === null && !hasWikiAirlines(airport.iata)) || (lvl !== null && lvl <= 2));
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const country = getCountryName(airport.country, locale);
  const title = boardless
    ? `${name} (${airport.iata}) — ${tHome('ns_title')}`
    : infoOnly
      ? t('info_title', { airport: name, iata: airport.iata })
      : t('arrivals_title', { airport: name, iata: airport.iata, city: cityName, showCity });
  const description = boardless
    ? tHome('ns_meta', { airport: name, iata: airport.iata, city: cityName, country })
    : infoOnly
      ? t('info_description', { airport: name, iata: airport.iata, city: cityName, country })
      : t('arrivals_description', { airport: name, iata: airport.iata, city: cityName });
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
  // A retired code (TSE → NQZ) redirects to the live one rather than 404ing or, worse,
  // rendering a stale record. See lib/iata-aliases.ts.
  const renamed = currentIata(iata);
  if (renamed) permanentRedirect(`/${locale}/airport/${renamed}/arrivals`);
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}/arrivals`;
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'arrivals', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  const showCity = showCityFlag(getAirportNameBare(airport.iata, locale, airport.name), city, airport.city);
  const h1 = t('arrivals_title', { airport: name, iata: airport.iata, city, showCity });
  const desc = t('arrivals_description', { airport: name, iata: airport.iata, city });

  // Computed once and used twice: as the BreadcrumbList below and as the visible nav that
  // makes that list true. These pages previously had no link to the parent airport, the city,
  // the country or the sibling board, so the schema described a hierarchy present nowhere in
  // the HTML and the page was a dead end for anything following links.
  const countryInfo = getCountries().find(c => c.country === airport.country);
  const cityInfo = getCities().find(c => c.city === airport.city && c.country === airport.country);
  const trail: { name: string; item: string }[] = [{ name: tNav('home'), item: `${BASE}/${locale}` }];
  if (countryInfo) trail.push({ name: country, item: `${BASE}/${locale}/airports/${countryInfo.slug}` });
  if (cityInfo && cityInfo.count > 1) trail.push({ name: city, item: `${BASE}/${locale}/city/${cityInfo.slug}` });
  trail.push({ name: `${name} (${airport.iata})`, item: `${BASE}/${locale}/airport/${airport.iata}` });
  trail.push({ name: tNav('arrivals'), item: canonical });

  const boardFetchedAt = getBoardFetchedAt(airport.iata, 'arrivals');
  // Mirror of the parent: an airport whose own source says it has no commercial service must
  // not carry an operations description here either. Without this the paragraph removed from
  // /airport/ODS went on being published at /airport/ODS/departures — 231 x 12 x 2 = 5,544 URLs
  // still saying "Several Ukrainian and international carriers operate scheduled services here".
  const about = hasNoService(airport.iata) ? '' : getAirportContent(airport.iata, locale);
  const noService = hasNoService(airport.iata);
  const nearestWithFlights = noService
    ? (() => {
        const n = nearestServiced(airport.iata, nearestAirports(airport.lat, airport.lon, 12));
        return n ? { ...getAirport(n.iata)!, km: n.km } : null;
      })()
    : null;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      // Home → Country → City (if it has an indexed page) → Airport → Arrivals.
      itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: h1,
      description: desc,
      url: canonical,
      inLanguage: locale,
      // Freshness signal, taken from the age of the DATA the page is showing (the store
      // entry's timestamp), not from render time: an ISR regeneration that re-serves the
      // same six-hour-old board must not claim it was just modified. Omitted entirely when
      // the board is empty — that page is static facts and has no freshness to assert.
      // Presence of a timestamp is NOT presence of a board: the warmer stamps the store even
      // when the provider answered with an empty list, so this emitted dateModified on pages
      // whose visible content is "no flights" — asserting freshness about nothing, which is
      // precisely what the comment above forbids. Require rows as well as a timestamp.
      ...(boardFetchedAt && initialFlights.length ? { dateModified: new Date(boardFetchedAt).toISOString() } : {}),
      // Tie the subpage to the airport's stable node instead of floating free in the graph.
      mainEntity: { '@id': airportNodeId(BASE, airport.iata) },
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <Breadcrumb trail={trail} extra={{ href: `/${locale}/airport/${airport.iata}/departures`, label: tNav('departures') }} />
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      {/* boardTotal is the full board, not the SSR slice: passing nothing here made the page
          publish "40 arrivals" on airports whose board holds 80 — the same slice-vs-total
          defect already fixed on the parent page. */}
      <FlightBoard airport={airport} locale={locale} defaultMode="arrivals" displayName={getAirportName(airport.iata, locale, airport.name)} initialFlights={initialFlights.slice(0, 40)} initialFetchedAt={getBoardFetchedAt(airport.iata, 'arrivals')} boardTotal={initialFlights.length} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 8px' }}>
        <EventBanner iata={airport.iata} locale={locale} />
      </div>
      {/* This subpage used to be board + footer and nothing else: 221 visible words against
          903 on the parent. Google crawled 487 of these and indexed none — they are half of
          everything sitting in "Crawled — currently not indexed". The About paragraph, the
          travel guides and the FAQ already exist per airport; withholding them here bought
          nothing. direction="arrivals" makes the routes section aggregate ORIGINS, so the
          section genuinely differs from the parent rather than duplicating it. */}
      <AirportBottom airport={airport} locale={locale} about={about} displayName={getAirportName(airport.iata, locale, airport.name)} flights={initialFlights} noService={noService} nearestServed={nearestWithFlights} direction="arrivals" />
    </>
  );
}
