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
import { hasNoService, nearestServiced } from '@/lib/warm';
import { nearestAirports } from '@/lib/airports';
import { Breadcrumb } from '@/components/Breadcrumb';
import { airportNodeId } from '@/lib/airport-sameas';
import { EventBanner } from '@/components/EventBanner';
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

  const title = t('departures_title', { airport: name, iata: airport.iata, city: cityName, showCity });
  const description = t('departures_description', { airport: name, iata: airport.iata, city: cityName });

  /**
   * Canonical points at the PARENT airport page, not at this URL.
   *
   * The parent renders the departures board by default — no `defaultMode`, and FlightBoard
   * opens on departures — so /airport/FRA and /airport/FRA/departures show the same board.
   * Once the About paragraph, the guides and the FAQ were added here too (they were withheld
   * before, which left this page at 208 visible words), the two pages became the same
   * document: measured on production, the only differences are the breadcrumb line and one
   * introductory sentence. Similarity of visible text, 5-word shingles, Jaccard:
   *
   *     FRA 96.0%   AMS 96.0%   HAJ 96.0%   TRD 94.4%   BER 92.5%   LHR 64.0%
   *
   * (LHR is lower only because its 80-row board is a larger share of the page.)
   *
   * Two indexable URLs for one document is not a thin-content problem, it is a duplicate
   * problem: Google picks one and reports the other as "Duplicate, Google chose different
   * canonical", and whatever authority the pair earned is split until it does. Declaring the
   * parent canonical hands it all to the page that also answers "arrivals AND departures",
   * which is what its title already says.
   *
   * /arrivals is deliberately NOT treated this way — it self-canonicalises. Its board holds
   * different flights, its routes section aggregates origins rather than destinations, and it
   * measures 60.5% against the parent, most of that being the About/FAQ every page in a
   * section legitimately shares. It is also, per Search Console, the subpage that actually
   * earns impressions.
   */
  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;

  return {
    title,
    description,
    // No hreflang cluster here: the alternates of a non-canonical URL are ignored anyway, and
    // advertising a 12-language cluster for a page that defers to another one is a
    // contradiction engines check for. The parent carries the cluster.
    alternates: { canonical },
    // Deliberately NOT noindex. Google's own guidance is to avoid combining noindex with
    // rel=canonical: the pair is contradictory (one says "don't index me", the other says
    // "credit that page instead"), and the documented failure mode is the noindex being
    // carried over to the canonical target — which here is the airport page itself, the most
    // valuable page on the site. The canonical alone is the correct and sufficient signal for
    // a duplicate view; the previous `index: hasFlights` gate is no longer needed because the
    // parent now decides indexability for this content.
    robots: { index: true, follow: true },
  };
}

export default async function DeparturesPage({ params }: Props) {
  const { locale, iata } = await params;
  setRequestLocale(locale);
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}/departures`);
  const airport = getAirport(iata.toUpperCase());
  // A retired code (TSE → NQZ) redirects to the live one rather than 404ing or, worse,
  // rendering a stale record. See lib/iata-aliases.ts.
  const renamed = currentIata(iata);
  if (renamed) permanentRedirect(`/${locale}/airport/${renamed}/departures`);
  if (!airport) notFound();

  // The page's <link rel=canonical> (see generateMetadata above) points at the PARENT — this
  // view is the same document. The structured data must state the same thing: a WebPage node
  // that says url=/departures directly under a canonical that says "I am the parent" is a
  // signal contradiction, and contradictions are what an engine checks before trusting
  // either. The breadcrumb keeps its last element for orientation but drops `item` — schema
  // allows the final crumb without a URL, which avoids asserting this URL as an entity.
  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'departures', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  const showCity = showCityFlag(getAirportNameBare(airport.iata, locale, airport.name), city, airport.city);
  const h1 = t('departures_title', { airport: name, iata: airport.iata, city, showCity });
  const desc = t('departures_description', { airport: name, iata: airport.iata, city });

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
  trail.push({ name: tNav('departures'), item: `${BASE}/${locale}/airport/${airport.iata}/departures` });

  const boardFetchedAt = getBoardFetchedAt(airport.iata, 'departures');
  const about = getAirportContent(airport.iata, locale);
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
      // Home → Country → City (if it has an indexed page) → Airport → Departures.
      // The visible breadcrumb keeps every href (an empty <Link> would break the nav); the
      // STRUCTURED last element drops `item`, which schema.org permits — the final crumb
      // orients without asserting this URL as a canonical entity alongside a <link canonical>
      // that points at the parent.
      itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(i < trail.length - 1 ? { item: c.item } : {}) })),
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
      <Breadcrumb trail={trail} extra={{ href: `/${locale}/airport/${airport.iata}/arrivals`, label: tNav('arrivals') }} />
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      <FlightBoard airport={airport} locale={locale} defaultMode="departures" displayName={getAirportName(airport.iata, locale, airport.name)} initialFlights={initialFlights.slice(0, 40)} initialFetchedAt={getBoardFetchedAt(airport.iata, 'departures')} boardTotal={initialFlights.length} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 8px' }}>
        <EventBanner iata={airport.iata} locale={locale} />
      </div>
      {/* See the twin comment in arrivals/page.tsx: this subpage carried 208 visible words
          against 903 on the parent, and Google indexed none of them. */}
      <AirportBottom airport={airport} locale={locale} about={about} displayName={getAirportName(airport.iata, locale, airport.name)} flights={initialFlights} noService={noService} nearestServed={nearestWithFlights} direction="departures" />
    </>
  );
}
