import { LocaleLinks } from '@/components/LocaleLinks';
import type { Locale } from '@/lib/i18n';
import { airportSchema } from '@/lib/airport-schema';
import type { Metadata } from 'next';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAirport, getStaticIataCodes, getCountries, getCities } from '@/lib/airports';
import { getAirportName, getAirportNameBare } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { getBoard, getBoardFetchedAt } from '@/lib/flights';
import { boardForVisitor } from '@/lib/live-board';
import { FlightBoard } from '@/components/FlightBoard';
import { AirportBottom } from '@/components/AirportBottom';
import { getAirportContent } from '@/lib/airport-content';
import { hasWikiAirlines } from '@/lib/wiki-routes';
import { hasNoService, nearestServiced, sourcedNoCommercialService, serviceLevel, advertisedInSitemap, isUnfillable } from '@/lib/warm';
import { nearestAirports } from '@/lib/airports';
import { Breadcrumb } from '@/components/Breadcrumb';
import { airportNodeId } from '@/lib/airport-sameas';
import { EventBanner } from '@/components/EventBanner';
import { locales } from '@/lib/i18n';
import { currentIata } from '@/lib/iata-aliases';
import { showCityFlag } from '@/lib/show-city';
import { assertLocale } from '@/lib/locale-guard';

/**
 * Срез борта для показа и признак «всё уже в прошлом».
 *
 * orderBoard на мёртвом борту отдаёт ХВОСТ по возрастанию — то есть самое ценное стоит в
 * конце списка. Страница резала его `slice(0, 40)`, компонент рисовал первые тридцать: два
 * среза подряд с головы, и человек видел самые СТАРЫЕ строки из имеющихся, а десять–двадцать
 * самых свежих не доезжали до разметки вовсе. Замер 12.08 на AYT: на экране 07:00–07:55, в
 * полезной нагрузке было до 08:30, в хранилище — примерно до 09:00.
 *
 * Считается на сервере от НАСТОЯЩЕГО времени, а не от времени снимка: вопрос «что уже
 * улетело» — про часы читателя, а не про то, что видел поставщик данных.
 */
function boardWindow(rows: { ts?: number }[], n: number): { rows: any[]; allPast: boolean } {
  const now = Date.now() / 1000;
  const allPast = rows.length > 0 && rows.every(r => !r.ts || r.ts < now);
  return { rows: allPast ? rows.slice(-n) : rows.slice(0, n), allPast };
}


const BASE = 'https://airportsboard.live';

// Кэш на 30 секунд — по той же причине, что и у родителя. Разбор — в комментарии к dynamic
// в airport/[iata]/page.tsx.
export const dynamic = 'force-static';
export const revalidate = 30;
export const dynamicParams = true;

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getStaticIataCodes().map(iata => ({ iata }));
}

// 23.10.2026: Вебмастер показывает дубли TKQ/GYY/SCU и описаний CFK/IPT.
// У информационных страниц сохраняем честное отсутствие обещания live-табло, но обозначаем
// направление. Этот же текст использует JSON-LD: раньше он всегда обещал табло, даже когда
// meta сообщала лишь справочную информацию. Проверка — check-seo-metadata.mjs на фикстуре.
async function arrivalsCopy(airport: NonNullable<ReturnType<typeof getAirport>>, locale: string) {
  const t = await getTranslations({ locale, namespace: 'meta' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const cityName = getCityName(airport.city, locale);
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
  /**
   * Обещание актуальности — только когда снимок свежий.
   *
   * Порог двенадцать часов, тот же, что на странице аэропорта и в самом табло: потолок яруса
   * hub из lib/warm.ts. Ключевые слова («табло прилёта», «табло вылета») сохраняются — по ним
   * приходят из поиска; уходит только «сегодня»/«today»/«实时», которое на почти половине
   * заходов было неправдой. getBoardFetchedAt читает хранилище и платного вызова не делает.
   */
  const STALE_AFTER = 12 * 60 * 60 * 1000;
  const at = getBoardFetchedAt(airport.iata, 'arrivals');
  const fresh = at != null && Date.now() - at <= STALE_AFTER;
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const title = boardless
    ? `${tNav('arrivals')}: ${name} (${airport.iata}) — ${tHome('ns_title')}`
    : infoOnly
      ? `${tNav('arrivals')}: ${t('info_title', { airport: name, iata: airport.iata })}`
      : t(fresh ? 'arrivals_title' : 'arrivals_title_stale', { airport: name, iata: airport.iata, city: cityName, showCity });
  const description = boardless
    ? `${tNav('arrivals')}: ${tHome('ns_meta', { airport: name, iata: airport.iata, city: cityName, country })}`
    : infoOnly
      ? `${tNav('arrivals')}: ${t('info_description', { airport: name, iata: airport.iata, city: cityName, country })}`
      : t(fresh ? 'arrivals_description' : 'arrivals_description_stale', { airport: name, iata: airport.iata, city: cityName });
  return { title, description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, iata } = await params;
  setRequestLocale(assertLocale(locale));
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const { title, description } = await arrivalsCopy(airport, locale);
  const canonical = `${BASE}/${locale}/airport/${airport.iata}/arrivals`;

  // Раньше index зависел только от строк текущего снимка: даже DME получал noindex
  // при пустом ответе/ночной паузе. Для постоянно прогреваемых аэропортов используем
  // устойчивый допуск sitemap; редкий хвост по-прежнему требует реальных строк.
  // Закрытые/необслуживаемые аэропорты не индексируем даже при старом снимке в store.
  let hasFlights = false;
  try { hasFlights = (await getBoard(airport.iata, 'arrivals', locale)).length > 0; } catch {}
  const indexable = !airport.closed && !hasNoService(airport.iata) && !isUnfillable(airport.iata)
    && (advertisedInSitemap(airport.iata) || hasFlights);

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}/arrivals`;
  }
  languages['x-default'] = `${BASE}/en/airport/${airport.iata}/arrivals`;

  return {
    title,
    description,
    // Advertise the 12-language hreflang cluster only when the page is indexable.
    alternates: indexable ? { canonical, languages } : { canonical },
    // og/twitter (incl. default OG image) inherited from layout; custom openGraph would drop it.
    robots: { index: indexable, follow: true },
  };
}

export default async function ArrivalsPage({ params }: Props) {
  const { locale, iata } = await params;
  setRequestLocale(assertLocale(locale));
  if (iata !== iata.toUpperCase()) permanentRedirect(`/${locale}/airport/${iata.toUpperCase()}/arrivals`);
  const airport = getAirport(iata.toUpperCase());
  // A retired code (TSE → NQZ) redirects to the live one rather than 404ing or, worse,
  // rendering a stale record. See lib/iata-aliases.ts.
  const renamed = currentIata(iata);
  if (renamed) permanentRedirect(`/${locale}/airport/${renamed}/arrivals`);
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}/arrivals`;
  // Свежесть на первом экране — то же ядро решений, что у родителя и у /api/flights.
  // Разбор цены, крайнего срока и почему краулер сюда не попадает — в lib/live-board.ts.
  const visitorBoard = await boardForVisitor(airport.iata, 'arrivals', locale);
  const initialFlights = visitorBoard.rows;
  const t = await getTranslations({ locale, namespace: 'meta' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);
  const { title: schemaTitle, description: desc } = await arrivalsCopy(airport, locale);

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
    airportSchema(airport, name, city, `${BASE}/${locale}/airport/${airport.iata}`, BASE),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      // Home → Country → City (if it has an indexed page) → Airport → Arrivals.
      itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: schemaTitle,
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


  // Один вызов на рендер: между двумя вызовами Date.now() успел бы тикнуть, и строка
  // могла бы перепрыгнуть из будущего в прошлое между срезом и признаком.
  const board = boardWindow(initialFlights, 40);

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      {/* The visible <h1> now lives in FlightBoard's airport header (single semantic h1). */}
      {/* boardTotal is the full board, not the SSR slice: passing nothing here made the page
          publish "40 arrivals" on airports whose board holds 80 — the same slice-vs-total
          defect already fixed on the parent page. */}
      {/* headingNote — признак ВЫДЕЛЕННОЙ подстраницы прилётов, а не текущего режима табло:
          переключатель внутри компонента меняет режим без перехода, и заголовок первого
          уровня прыгал бы под рукой. До этой строки h1 у родителя и здесь был один и тот же
          («UFA Уфа»), хотя заголовки вкладок различаются, а класс запросов «прилёт» даёт
          лучший CTR на сайте. Слово берётся из каталога, новых строк не заводится. */}
      <FlightBoard airport={airport} locale={locale} defaultMode="arrivals" displayName={getAirportName(airport.iata, locale, airport.name)} cityName={city} headingNote={tNav('arrivals')} initialFlights={board.rows} initialAllPast={board.allPast} initialFetchedAt={getBoardFetchedAt(airport.iata, 'arrivals')} boardTotal={initialFlights.length} about={about} aboutTitle={tHome('about_title', { iata: airport.iata })} aboutExtra={<AirportBottom part="reference" airport={airport} locale={locale} displayName={getAirportName(airport.iata, locale, airport.name)} flights={initialFlights} noService={noService} nearestServed={nearestWithFlights} direction="arrivals" />} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px 8px' }}>
        <EventBanner iata={airport.iata} locale={locale} />
      </div>
      {/* This subpage used to be board + footer and nothing else: 221 visible words against
          903 on the parent. Google crawled 487 of these and indexed none — they are half of
          everything sitting in "Crawled — currently not indexed". The About paragraph, the
          travel guides and the FAQ already exist per airport; withholding them here bought
          nothing. direction="arrivals" makes the routes section aggregate ORIGINS, so the
          section genuinely differs from the parent rather than duplicating it. */}
      <AirportBottom airport={airport} locale={locale} about={about} displayName={getAirportName(airport.iata, locale, airport.name)} flights={initialFlights} noService={noService} nearestServed={nearestWithFlights} direction="arrivals" tail={<><Breadcrumb label={tNav('aria_breadcrumb')} trail={trail} extra={{ href: `/${locale}/airport/${airport.iata}/departures`, label: tNav('departures') }} foot /><LocaleLinks locale={locale as Locale} path={`/airport/${airport.iata}/arrivals`} /></>} />
    </>
  );
}
