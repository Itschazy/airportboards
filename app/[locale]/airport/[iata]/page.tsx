import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import airportsAll from '@/data/airports.json';
import { getAirport, getStaticIataCodes, getCountries, getCities, nearestAirports } from '@/lib/airports';
import { hasNoService, nearestServiced, serviceLevel, serviceMeasuredOn, isUnfillable } from '@/lib/warm';
import { hasWikiAirlines } from '@/lib/wiki-routes';
import { localizedMeasuredOn } from '@/lib/measured-date';
import { sameAsFor, airportNodeId } from '@/lib/airport-sameas';
import { getAirportContent } from '@/lib/airport-content';
import { getAirportName, getAirportNameBare } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { getBoard, getBoardFetchedAt } from '@/lib/flights';
import { FlightBoard } from '@/components/FlightBoard';
import { AirportBottom } from '@/components/AirportBottom';
import { locales } from '@/lib/i18n';
import { currentIata } from '@/lib/iata-aliases';
import { showCityFlag, fold } from '@/lib/show-city';

const BASE = 'https://airportsboard.live';

// Pre-render only major hubs; rest render on-demand and cache via ISR.
export const dynamicParams = true;
export const revalidate = 300;

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getStaticIataCodes().map(iata => ({ iata }));
}

/**
 * The one true description for an airport page, used by BOTH the <meta> tags and the
 * WebPage JSON-LD.
 *
 * They used to be computed separately: generateMetadata branched on closed/no-service while
 * the JSON-LD always used main_description, so 3,789 airfields with no airline service and
 * every closed airport shipped structured data promising a live flight board. AI crawlers
 * read the JSON-LD, so that was the version they were being handed. One helper, one answer.
 *
 * Returns `title: null` for ordinary airports so the caller keeps its own title logic
 * (which needs `showCity`); closed and no-service pages get a title that matches the body.
 */
async function airportDescription(opts: {
  airport: NonNullable<ReturnType<typeof getAirport>>;
  locale: string; name: string; city: string; country: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}): Promise<{ title: string | null; description: string }> {
  const { airport, locale, name, city, country, t } = opts;
  if (airport.closed) {
    const tHome = await getTranslations({ locale, namespace: 'home' });
    const successor = airport.successor ? getAirport(airport.successor) : null;
    return {
      title: `${name} (${airport.iata}) — ${tHome('closed_title')}`,
      description: tHome('closed_body', { name, year: String(airport.closed) })
        + (successor
          // closed_successor contains <link> tags; plain t() cannot format tagged messages
          // (it falls back to the literal key path), so render via markup() with a
          // pass-through for the tag — we want the sentence, not the anchor, in <meta>.
          ? ' ' + tHome.markup('closed_successor', {
              successor: `${getAirportName(successor.iata, locale, successor.name)} (${successor.iata})`,
              link: (chunks) => chunks,
            })
          : ''),
    };
  }
  if (hasNoService(airport.iata)) {
    // Don't advertise a live board for an airfield no airline serves — the snippet would be
    // a promise the page cannot keep, and that is exactly what a policy reviewer clicks.
    const tHome = await getTranslations({ locale, namespace: 'home' });
    return {
      title: `${name} (${airport.iata}) — ${tHome('ns_title')}`,
      description: tHome('ns_meta', { airport: name, iata: airport.iata, city, country }),
    };
  }
  // Served, but nothing stored to show yet. generateMetadata already branches for closed and
  // for no-service airports; this third case was missing, so roughly a third of served
  // airports promised "real-time arrivals and departures with flight status, times, delays and
  // gates" in the SERP snippet above a page whose own body says the board is not available.
  // The snippet and the page now agree per-airport instead of the copy being watered down for
  // everyone — gates are genuinely delivered on 61% of rows where a board exists.
  // Costs nothing: getBoardFetchedAt is a store read, never an airlabs call.
  // The condition is "are there rows to show", the same question the body asks — not "was
  // this ever fetched". Those two can disagree: a warm cycle that returns an empty response
  // sets a timestamp with no rows, and the page would then say the board is unavailable while
  // the snippet above it promised real-time departures. Two conditions that can contradict
  // each other is the exact defect class this whole fix is about, so there is only one.
  // getBoard with live:false is a store read; it never contacts airlabs.
  let boardRows: Awaited<ReturnType<typeof getBoard>> = [];
  try { boardRows = await getBoard(airport.iata, 'departures', locale); } catch {}
  if (!boardRows.length) {
    // Empty board, but published airline/destination routes exist (Wikipedia-sourced): the
    // page's real content is those routes, so the SERP snippet must sell THAT, not a live
    // board. `title: null` below means "fall back to main_title", i.e. "… Live Arrivals &
    // Departures" — acceptable for a served airport the warmer merely has not reached yet,
    // and a permanent false promise for the 1,070 airports whose provider feed is empty by
    // construction. Those are exactly the pages that carry the routes section, so the branch
    // keys off the same predicate the body renders with.
    if (hasWikiAirlines(airport.iata)) {
      return {
        title: t('routes_title', { airport: name, iata: airport.iata }),
        description: t('routes_description', { airport: name, iata: airport.iata, city, country }),
      };
    }
    // No board and no routes. `title: null` used to fall through to main_title — "… Live
    // Arrivals & Departures" — over a description that says the board is not available. That
    // contradiction shipped on 178 airports, every one of them in the sitemap, and it is
    // exactly the shape of thing AdSense rejected the site for on 2026-08-03 ("low value
    // content"): a promise in the SERP that the page cannot keep.
    //
    // For an airport whose provider feed is empty by construction the honest offer is what
    // the page actually holds — codes, location, time zone, and the nearest airport you can
    // really fly from. serviceLevel() === null means we have no measurement either way, so
    // this must NOT say "no scheduled flights": that false negative was already fixed once
    // (Norway 38/40, Canada 175/292) and must not come back through a different door.
    const tHome = await getTranslations({ locale, namespace: 'home' });
    const tUi = await getTranslations({ locale, namespace: 'ui' });
    if (serviceLevel(airport.iata) === null) {
      return {
        title: t('info_title', { airport: name, iata: airport.iata }),
        description: t('info_description', { airport: name, iata: airport.iata, city, country }),
      };
    }
    // Measured service, board merely cold: the live promise is still true, just not right now.
    return {
      title: null,
      // "Sochi (AER) is an airport serving Sochi" reads as machine output the moment the
      // airport's name IS the city's name. The _same variant names the place once.
      description: `${tHome(fold(name) === fold(city) ? 'airport_lead_same' : 'airport_lead', { name, iata: airport.iata, city, country })} ${tUi('board_pending')}`,
    };
  }
  // Deliberately no freshness promise here. The snippet is read before the click, but it is
  // written by whatever the crawler last stored, and TIERS warms even the mega tier only every
  // 360 minutes (hub 720, everything else daily) — so "updated every minute" would describe
  // the live client poll while the indexed copy behind it can be hours old. The description
  // therefore claims only what the page always shows: which fields it carries.
  return { title: null, description: t('main_description', { airport: name, iata: airport.iata, city, country }) };
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
  // Titles append the city only when the airport's localized name doesn't already
  // contain it ("Внуково" + Москва — yes; "Сочи" + Сочи — no). People search by city.
  const showCity = showCityFlag(getAirportNameBare(airport.iata, locale, airport.name), city, airport.city);

  // A closed airport must not promise a live board in the SERP snippet either. Reuse the
  // on-page notice copy so the title and description say the same true thing.
  const { title: descTitle, description } = await airportDescription({ airport, locale, name, city, country, t });
  const title = descTitle ?? t('main_title', { airport: name, city, showCity, iata: airport.iata });
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
    // A permanently closed airport has no live board to offer, so it must not compete in
    // search for "live arrivals" queries. It stays 200 and `follow` so the indexed URL keeps
    // its value and passes equity on to the successor airport we link from the page body.
    // isUnfillable(): a small field whose board can never fill, because the provider has no
    // schedule for it under any code. 428 of them; see the note in lib/warm.ts. Still followed
    // — the nearest-airport and navigation links below are worth crawling.
    robots: { index: !airport.closed && !isUnfillable(airport.iata), follow: true },
  };
}

export default async function AirportPage({ params }: Props) {
  const { locale, iata } = await params;
  setRequestLocale(locale);
  // Wrong-case IATA → single permanent (308) redirect to the canonical uppercase URL
  // (saves crawl budget; permanent so engines drop the lowercase variant from the index).
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}`);
  const airport = getAirport(iata.toUpperCase());
  // A retired code (TSE → NQZ) redirects to the live one rather than 404ing or, worse,
  // rendering a stale record. See lib/iata-aliases.ts.
  const renamed = currentIata(iata);
  if (renamed) permanentRedirect(`/${locale}/airport/${renamed}`);
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}`;
  const about = getAirportContent(airport.iata, locale);
  // SSR the first (departures) board so the page is useful without client JS.
  let initialFlights: Awaited<ReturnType<typeof getBoard>> = [];
  try { initialFlights = await getBoard(airport.iata, 'departures', locale); } catch {}
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const tUi = await getTranslations({ locale, namespace: 'ui' });
  // A closed airport points at whatever took its traffic, so the page still sends the
  // visitor (and the crawler) somewhere useful instead of dead-ending on an empty board.
  const successorAirport = airport.successor ? getAirport(airport.successor) : null;
  // ~2/3 of the IATA codes in the dataset are military fields, bush strips or private
  // airfields with no airline service at all. An empty "live board" there reads as broken;
  // saying so plainly and pointing at the nearest served airport is true and more useful.
  // The other side of the closure record: BER should say it took over from Tegel and
  // Schönefeld. Both directions are in data/airports.json already; only one was rendered.
  const predecessors = (() => {
    const all = (airportsAll as { iata: string; name: string; closed?: number; successor?: string }[])
      .filter(a => a.successor === airport.iata && a.closed);
    if (!all.length) return [];
    // Only the airports that closed in the actual handover year. Tempelhof also points at
    // BER — correct going forward, since a Berlin traveller now flies from BER — but it shut
    // in 2008 and its traffic went to Tegel and Schönefeld, twelve years before BER opened.
    // Claiming BER took it over would be a causal statement that never happened.
    const handover = Math.max(...all.map(a => a.closed!));
    return all
      .filter(a => a.closed === handover)
      .map(a => `${getAirportName(a.iata, locale, a.name)} (${a.iata})`);
  })();
  // Honest delay summary for mega-tier boards — the "are there delays at X right now"
  // query family, answered from data we hold rather than prose. Gates (all mandatory):
  // count only status==='delayed' (=15+ min, see mapStatus), denominator = flights still
  // to depart (the 80-row board includes already-departed rows), suppress when the board
  // is cold, empty of upcoming flights, or the store data is older than two hours — a
  // "right now" claim on a six-hour-old snapshot would be the exact kind of lie the last
  // three waves removed.
  const delayLine = (() => {
    if ((serviceLevel(airport.iata) ?? 0) < 400) return null;
    const fetchedAt = getBoardFetchedAt(airport.iata, 'departures');
    if (!fetchedAt) return null;
    const ageMin = Math.round((Date.now() - fetchedAt) / 60000);
    if (ageMin > 120) return null;
    const pending = initialFlights.filter(f => f.status !== 'departed' && f.status !== 'cancelled');
    if (!pending.length) return null;
    const delayed = pending.filter(f => f.status === 'delayed').length;
    return tHome('delays_line', {
      m: String(Math.max(1, ageMin)),
      delayed: String(delayed),
      pending: String(pending.length),
    });
  })();
  const noService = hasNoService(airport.iata);
  // The body half of the honest-title branch in generateMetadata(). Same three conditions in
  // the same order, so a page can never advertise "airport information" in the SERP and then
  // render a live-board skeleton — the exact contradiction AdSense rejected the site over.
  // Self-healing: all three are read from data on every render, so the moment the warmer
  // measures real service the board and its chrome come back on their own.
  const infoOnly = initialFlights.length === 0
    && !hasWikiAirlines(airport.iata)
    && serviceLevel(airport.iata) === null;
  const nearestWithFlights = noService
    ? (() => {
        const n = nearestServiced(airport.iata, nearestAirports(airport.lat, airport.lon, 12));
        return n ? { ...getAirport(n.iata)!, km: n.km } : null;
      })()
    : null;
  const name = getAirportName(airport.iata, locale, airport.name);
  // What to put under an empty board when the airport is NOT known to be service-free — i.e.
  // the warmer simply has not reached it yet. Never "No flights found": that would assert
  // something false about a real airport, and 1,580 of these are airports whose zero verdict
  // OurAirports contradicts outright (see scripts/crosscheck-service.mjs). Where we do have a
  // measured schedule figure, say it — the page then answers "how busy is this airport" even
  // with no live rows, which is the whole point for a crawler that will never run our JS.
  const pendingNote = (!noService && initialFlights.length === 0)
    ? (() => {
        const measured = serviceLevel(airport.iata);
        const on = serviceMeasuredOn();
        const line = tUi('board_pending');
        return measured && measured > 0 && on
          ? `${line} ${tHome('faq_deps_a', { n: String(measured), name, iata: airport.iata, date: localizedMeasuredOn(on, locale) })}`
          : line;
      })()
    : null;
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  // Same source as the <meta> description — see airportDescription(). Structured data is
  // what AI crawlers actually parse, so it must not claim a live board the page cannot show.
  const { description: webDesc } = await airportDescription({ airport, locale, name, city, country, t });

  const boardFetchedAt = getBoardFetchedAt(airport.iata, 'departures');

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Airport',
      // A stable @id shared by every page about this airport, so the arrivals and departures
      // subpages reference the same node instead of declaring three lookalike airports.
      '@id': airportNodeId(BASE, airport.iata),
      iataCode: airport.iata,
      icaoCode: airport.icao,
      name,
      // Only worth stating when it differs — on /en it is the same string twice.
      ...(airport.name !== name ? { alternateName: airport.name } : {}),
      // Resolves this page to the Wikidata entity, turning a name into an identity an
      // answer engine can match against what it already knows. Absent for the ~4% of codes
      // Wikidata maps ambiguously; a wrong link would merge two airports in the graph.
      ...(sameAsFor(airport.iata).length ? { sameAs: sameAsFor(airport.iata) } : {}),
      url: canonical,
      address: {
        '@type': 'PostalAddress',
        // Both properties are omitted rather than emitted empty or wrong. addressCountry wants
        // an ISO 3166-1 alpha-2 code; falling back to the country NAME published invalid schema
        // on 238 airports, and among those names were states that no longer exist — SXM said
        // "Netherlands Antilles", dissolved in 2010. Backfilled from OurAirports per AIRPORT,
        // not per country name: those five Antillean airports resolve to three different codes
        // (BQ, CW, SX), so a name-based substitution would have merged three countries into one.
        ...(airport.city ? { addressLocality: airport.city } : {}),
        ...(airport.iso2 ? { addressCountry: airport.iso2 } : {}),
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: airport.lat,
        longitude: airport.lon,
      },
      // Machine-consumable map link; coordinates are present and validated for every
      // airport in the dataset. %2C-encoded to match Google's Maps URL API format.
      hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${airport.lat},${airport.lon}`)}`,
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
      publisher: { '@type': 'Organization', name: 'AirportsBoard', url: BASE },
      // Ties the page to the Airport entity declared above rather than leaving two
      // unrelated nodes for a consumer to correlate by name.
      mainEntity: { '@id': airportNodeId(BASE, airport.iata) },
      // Freshness signal, taken from the age of the DATA the page is showing (the store
      // entry's timestamp), not from render time: an ISR regeneration that re-serves the
      // same six-hour-old board must not claim it was just modified. Omitted entirely when
      // the board is empty — that page is static facts and has no freshness to assert.
      // Presence of a timestamp is NOT presence of a board: the warmer stamps the store even
      // when the provider answered with an empty list, so this emitted dateModified on pages
      // whose visible content is "no flights" — asserting freshness about nothing, which is
      // precisely what the comment above forbids. Require rows as well as a timestamp.
      ...(boardFetchedAt && initialFlights.length ? { dateModified: new Date(boardFetchedAt).toISOString() } : {}),
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      {predecessors.length > 0 && (
        <aside style={{
          margin: '12px 16px 0', padding: '12px 14px', borderRadius: 10,
          background: 'rgba(10,132,255,.10)', border: '1px solid rgba(10,132,255,.28)',
          fontSize: 14, lineHeight: 1.45,
        }}>
          {tHome('replaced_line', { name, iata: airport.iata, predecessors: predecessors.join(', ') })}
        </aside>
      )}
      {!airport.closed && noService && (
        <aside style={{
          margin: '12px 16px 0', padding: '12px 14px', borderRadius: 10,
          background: 'rgba(120,120,128,.16)', border: '1px solid rgba(120,120,128,.32)',
          fontSize: 14, lineHeight: 1.45,
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{tHome('ns_title')}</strong>
          {tHome('ns_body', { name })}
          {nearestWithFlights && (
            <>
              {' '}
              {tHome.rich('ns_nearest', {
                // The message also interpolates {name}/{iata} for THIS airport. Omitting them
                // made next-intl bail out and print the literal key path "home.ns_nearest" into
                // the page body on ~3,400 no-service airports across all 12 locales — silently,
                // because a missing ICU argument is not a build error.
                name,
                iata: airport.iata,
                airport: `${getAirportName(nearestWithFlights.iata, locale, nearestWithFlights.name)} (${nearestWithFlights.iata})`,
                km: String(nearestWithFlights.km),
                link: (chunks) => (
                  <Link href={`/${locale}/airport/${nearestWithFlights.iata}`} style={{ fontWeight: 600 }}>{chunks}</Link>
                ),
              })}
            </>
          )}
        </aside>
      )}
      {airport.closed && (
        <aside style={{
          margin: '12px 16px 0', padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,159,10,.12)', border: '1px solid rgba(255,159,10,.35)',
          fontSize: 14, lineHeight: 1.45,
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>{tHome('closed_title')}</strong>
          {/* year as a string: ICU would otherwise group it as "2,020" */}
          {tHome('closed_body', { name, year: String(airport.closed) })}
          {successorAirport && (
            <>
              {' '}
              {tHome.rich('closed_successor', {
                successor: `${getAirportName(successorAirport.iata, locale, successorAirport.name)} (${successorAirport.iata})`,
                link: (chunks) => (
                  <Link href={`/${locale}/airport/${successorAirport.iata}`} style={{ fontWeight: 600 }}>{chunks}</Link>
                ),
              })}
            </>
          )}
        </aside>
      )}
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      {/* SSR only the first 40 rows to keep the HTML light (the client refetches the full
          board on mount); AirportBottom still gets the full set to aggregate routes/airlines. */}
      <FlightBoard airport={airport} locale={locale} displayName={name} initialFlights={initialFlights.slice(0, 40)} initialFetchedAt={getBoardFetchedAt(airport.iata, 'departures')} boardTotal={initialFlights.length} lead={tHome(fold(name) === fold(city) ? 'airport_lead_same' : 'airport_lead', { name, iata: airport.iata, city, country })} statusLine={delayLine} noService={noService} infoOnly={infoOnly} pendingNote={pendingNote} />
      <AirportBottom airport={airport} locale={locale} about={about} displayName={name} flights={initialFlights} noService={noService} nearestServed={nearestWithFlights} schedule />
    </>
  );
}
