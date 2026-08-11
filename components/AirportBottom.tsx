import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Airport } from '@/lib/airports';
import { nearestAirports, getCountries, getAirportsByCountry, getCities, getAllIataCodes, getAirport } from '@/lib/airports';
import { getCityName, getCountryName } from '@/lib/places';
import { getAirportName } from '@/lib/airport-names';
import type { FlightRow } from '@/lib/flights';
import { MoreInfo, OverviewMetrics, AboutCard, Faq } from '@/components/AirportExtras';
import { getAirportContentExtended } from '@/lib/airport-content-extended';
import { getAirportSchedule, weekdayNames, maskToDays } from '@/lib/airport-schedule';
import { getWikiRoutes } from '@/lib/wiki-routes';
import { serviceLevel, serviceMeasuredOn, worldServiceCounts } from '@/lib/warm';
import { GENERIC_LOCALES } from '@/lib/generic-word';
import { localizedMeasuredOn } from '@/lib/measured-date';
import { deName as withDe } from '@/lib/fr-elision';
import { EventBanner } from '@/components/EventBanner';
import { RecentlyViewed } from '@/components/RecentlyViewed';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SUB = '#8A8A8A';

// Section labels for the extended content (transport/terminals/tips). Kept as a small
// local map rather than message keys so the feature is self-contained (labels + reader
// + render live together) and doesn't touch the shared messages/*.json.
// Section labels for the extended content (transport/terminals/tips). Phrased as the
// questions a traveller actually asks — "How do I get to and from Heathrow?" rather than
// "Getting to & from the airport" — because a heading that matches a question is what an
// answer engine matches a query against, and the paragraph beneath it becomes the answer.
// {a} is the airport's localized name. Kept as a local map rather than message keys so the
// feature stays self-contained and doesn't touch the shared messages/*.json.
const EXT_LABELS: Record<string, { transport: string; terminals: string; tips: string }> = {
  en: { transport: 'How do I get to and from {a}?', terminals: 'How do the terminals work at {a}?', tips: 'Tips for flying from {a}' },
  // ru/de/fr/es/it carry the airport word so the proper name stays nominative — «до
  // Минеральные Воды» and "vom Frankfurt" were broken on every airport whose name declines
  // or needs an article; «до аэропорта {a}» / "zum Flughafen {a}" are correct for all of them.
  ru: { transport: 'Как добраться до аэропорта {a} и обратно?', terminals: 'Как устроены терминалы в аэропорту {a}?', tips: 'Советы вылетающим из аэропорта {a}' },
  zh: { transport: '如何往返{a}？', terminals: '{a}的航站楼如何分布？', tips: '从{a}出发的实用建议' },
  ar: { transport: 'كيف أصل إلى {a} وأعود منه؟', terminals: 'كيف تعمل صالات {a}؟', tips: 'نصائح للمسافرين من {a}' },
  de: { transport: 'Wie komme ich zum Flughafen {a} und zurück?', terminals: 'Wie sind die Terminals am Flughafen {a} aufgeteilt?', tips: 'Tipps für Abflüge ab dem Flughafen {a}' },
  ko: { transport: '{a}까지 어떻게 오가나요?', terminals: '{a}의 터미널은 어떻게 나뉘어 있나요?', tips: '{a} 출발 시 알아둘 점' },
  ja: { transport: '{a}へのアクセス方法は？', terminals: '{a}のターミナルはどう分かれていますか？', tips: '{a}から出発する際のヒント' },
  fr: { transport: 'Comment se rendre à l’aéroport {a} et en revenir ?', terminals: 'Comment sont organisés les terminaux de l’aéroport {a} ?', tips: 'Conseils pour partir de l’aéroport {a}' },
  es: { transport: '¿Cómo llegar al aeropuerto {a} y volver?', terminals: '¿Cómo funcionan las terminales del aeropuerto {a}?', tips: 'Consejos para volar desde el aeropuerto {a}' },
  it: { transport: 'Come arrivare all’aeroporto {a} e tornare?', terminals: 'Come sono organizzati i terminal dell’aeroporto {a}?', tips: 'Consigli per partire dall’aeroporto {a}' },
  hi: { transport: '{a} तक कैसे पहुँचें और लौटें?', terminals: '{a} के टर्मिनल कैसे बँटे हैं?', tips: '{a} से उड़ान भरने के सुझाव' },
  tr: { transport: '{a} havalimanına nasıl gidilir ve dönülür?', terminals: '{a} terminalleri nasıl ayrılmış?', tips: '{a} çıkışlı uçuşlar için ipuçları' },
};

function gmtOffset(tz?: string | null): string {
  if (!tz) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}

function Chevron() {
  return <svg width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}><path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export async function AirportBottom({ airport, locale, about, displayName, flights = [], noService = false, nearestServed = null, direction = 'departures', schedule = false }: {
  airport: Airport; locale: string; about: string | null; displayName?: string; flights?: FlightRow[];
  /**
   * Which board the caller rendered. Controls which end of each flight the routes section
   * aggregates, and therefore whether /route links point out of or into this airport.
   */
  direction?: 'departures' | 'arrivals';
  /** Measured: no airline operates scheduled service here (see data/airport-service.json). */
  noService?: boolean;
  /** Nearest airport that does have scheduled service — computed once by the page. */
  nearestServed?: (Airport & { km: number }) | null;
  /**
   * Render the weekly departure pattern. Passed only by the parent airport page: the
   * /departures subpage canonicalises to the parent, and on /arrivals the section would face
   * the wrong way. Opt-in, so a new caller cannot get it by accident.
   */
  schedule?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tUi = await getTranslations({ locale, namespace: 'ui' });
  const name = displayName || airport.name;
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);

  // Французский предлог приезжает вместе с именем: «d’Amsterdam», «du Havre», «de Paris».
  // Отдельные параметры, а не подмена name/city, потому что те же имена печатаются и без
  // предлога. Остальные локали этих параметров в своих строках не используют, а лишние
  // значения ICU молча игнорирует — поэтому их можно передавать во все вызовы подряд, не
  // разбирая, какой строке предлог нужен: пропущенный параметр напечатал бы «{deName}».
  const deName = withDe(name, locale);
  const deCity = withDe(city, locale);
  const deIata = withDe(airport.iata, locale);
  const ext = getAirportContentExtended(airport.iata, locale);
  // Published routes for airports whose live board can never fill (see lib/wiki-routes.ts).
  // Only rendered when the board is genuinely empty — where flights exist, the board IS the
  // better answer and this would just repeat it less precisely.
  const wiki = flights.length ? null : getWikiRoutes(airport.iata);
  // Weekly departure pattern. Only on the parent page and only for departures: the arrivals
  // view aggregates by ORIGIN, where "flights from here on Fridays" would state the reverse
  // of the data. `schedule` is a prop the subpages never pass, which is a stronger gate than
  // checking `direction` — /departures also reports direction 'departures'.
  const sched = schedule ? getAirportSchedule(airport.iata, new Set(getAllIataCodes())) : null;
  const wdShort = sched ? weekdayNames(locale, 'short') : [];
  const wdLong = sched ? weekdayNames(locale, 'long') : [];
  const rawLabels = EXT_LABELS[locale] || EXT_LABELS.en;
  const extLabels = {
    transport: rawLabels.transport.replace('{a}', name),
    terminals: rawLabels.terminals.replace('{a}', name),
    tips: rawLabels.tips.replace('{a}', name),
  };

  // Closed airports are dropped from "nearby": Berlin Brandenburg was listing Tegel,
  // Schönefeld and Tempelhof as neighbouring airports with no hint that all three have been
  // shut for years, which reads to a person (and an answer engine) as four working options.
  const nearby = nearestAirports(airport.lat, airport.lon, 9)
    .filter(a => a.iata !== airport.iata && !a.closed)
    .slice(0, 5);
  const countryInfo = getCountries().find(c => c.country === airport.country);
  const countryAirports = countryInfo
    ? getAirportsByCountry(countryInfo.slug).filter(a => a.iata !== airport.iata).slice(0, 8)
    : [];
  const offset = gmtOffset(airport.tz);

  // Multi-airport city → link UP to its (indexed) city page.
  const cityInfo = getCities().find(c => c.city === airport.city && c.country === airport.country);
  const cityLink = cityInfo && cityInfo.count > 1 ? `/${locale}/city/${cityInfo.slug}` : null;

  // Derive popular routes + airlines from today's SSR board, so these links ship as real
  // <a href> in the server HTML (the client version left /route and /airline pages
  // orphaned/undiscoverable). Aggregated by the airport at the OTHER end of each flight.
  //
  // Which end that is depends on the board: a departures board names destinations, an
  // arrivals board names origins. Reading arrIata unconditionally is what left the arrivals
  // subpage with an empty routes section — on an arrivals board arrIata IS this airport, so
  // every row was filtered out by the guard below.
  const inbound = direction === 'arrivals';
  const routeMap = new Map<string, { label: string; n: number }>();
  const airlineMap = new Map<string, { name: string; n: number }>();
  for (const f of flights) {
    const otherIata = inbound ? f.depIata : f.arrIata;
    const otherLabel = inbound
      ? ('origin' in f && f.origin) || f.depIata
      : ('destination' in f && f.destination) || f.arrIata;
    if (otherIata && otherIata !== airport.iata) {
      const e = routeMap.get(otherIata) || { label: otherLabel || otherIata, n: 0 };
      e.n++; routeMap.set(otherIata, e);
    }
    if (f.airlineIata) {
      const e = airlineMap.get(f.airlineIata) || { name: f.airline || f.airlineIata, n: 0 };
      e.n++; airlineMap.set(f.airlineIata, e);
    }
  }
  const routes = [...routeMap.entries()].map(([iata, v]) => ({ iata, ...v })).sort((a, b) => b.n - a.n).slice(0, 8);
  const airlines = [...airlineMap.entries()].map(([iata, v]) => ({ iata, ...v })).sort((a, b) => b.n - a.n).slice(0, 10);

  // Measured scheduled departures for this airport, and when that was measured.
  const deps = serviceLevel(airport.iata);
  const measuredOn = serviceMeasuredOn();

  // Answers are full sentences, not bare values. "LHR" answers nothing out of context; an
  // answer engine can only quote a fragment that still means something on its own.
  // The board's Arrivals/Departures toggle is a <button>, so the two subpages are invisible
  // to crawlers from here. Real anchors fix the orphaning found in the sitemap audit.
  const subpageLinks = !noService && !airport.closed;

  // Locale-aware list joining; the try covers locales Node's ICU build might not know.
  const listFmt = (items: string[]) => {
    try { return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items); }
    catch { return items.join(', '); }
  };

  const faq: { q: string; a: string }[] = [
    { q: t('faq_iata_q', { name, deName }), a: t('faq_iata_a', { name, deName, code: airport.iata }) },
    ...(airport.icao ? [{ q: t('faq_icao_q', { name, deName }), a: t('faq_icao_a', { name, deName, code: airport.icao }) }] : []),
    { q: t('faq_where_q', { name, deName }), a: t('faq_where_a', { name, deName, iata: airport.iata, city, country }) },
    // Only claim a timezone when we actually have one. 557 airports inherited the literal
    // "\N" null marker from the OpenFlights dump and rendered it as the visible answer.
    ...(airport.tz ? [{ q: t('faq_tz_q', { name, deName }), a: t('faq_tz_a', { name, deName, iata: airport.iata, tz: `${airport.tz}${offset ? ` (${offset})` : ''}` }) }] : []),
    // How busy an airport is, from our own measurement — a question every other flight site
    // answers with marketing copy or not at all.
    ...(deps && deps > 0 && measuredOn
      ? [{ q: t('faq_deps_q', { name, deName }), a: t('faq_deps_a', { n: deps.toLocaleString(locale), name, iata: airport.iata, date: localizedMeasuredOn(measuredOn, locale) }) }]
      : []),
    // "Arrive 3 hours before departure" is advice for a place you can fly from. On the 3,789
    // airfields with no airline service and on closed airports it was being asserted as
    // FAQPage markup directly under a notice saying no flights exist — a self-contradiction
    // an answer engine reads as an unreliable source.
    ...(noService || airport.closed ? [] : [{ q: t('faq_arrive_q', { name, deName }), a: t('faq_arrive_a') }]),
    // Data-driven pairs from the board itself: which airlines operate here, where you can fly
    // nonstop. Genuinely unique per airport, derived from rows we already aggregated above,
    // and worded as sourced from the CURRENT departures board — a claim we can always stand
    // behind. Gated to the departures view: on the arrivals subpage `routes`/`airlines` are
    // aggregated over ORIGINS, and "fly nonstop from" would state the reverse of the data.
    // Intl.ListFormat gives each locale its own conjunction («А, Б и В», 「AとB」) instead of a
    // comma splice in eleven languages.
    ...(!inbound && !noService && !airport.closed && airlines.length >= 3
      ? [{ q: t('faq_airlines_q', { name, deName }), a: t('faq_airlines_a', { name, deName, iata: airport.iata, list: listFmt(airlines.slice(0, 5).map(al => al.name)) }) }]
      : []),
    // "On which days do flights depart?" — answerable only from the timetable, and the pair
    // rides into the FAQPage markup this component already emits, so no new schema type is
    // introduced. Appears and disappears with the section itself.
    ...((() => {
      if (!sched) return [];
      const named = sched.rows
        .map(r => ({ city: getCityName(getAirport(r.iata)?.city ?? '', locale), mask: r.mask }))
        .filter(x => x.city && x.city.length > 2)
        .slice(0, 3);
      if (named.length < 2) return [];
      // The FAQ says a route runs on Mondays, every Monday — a recurring form that Intl does
      // not provide. "по понедельник, вторник" (nominative, straight from Intl) is not
      // Russian; "по понедельникам, вторникам" is. Same for "montags", "los lunes",
      // "أيام الاثنين". The table keeps Intl's short forms, where no preposition governs them.
      const recurring = Array.from({ length: 7 }, (_, i) => tUi(`sched_wd${i}`));
      const ex = listFmt(named.map(x => tUi('sched_faq_ex', { city: x.city, days: listFmt(maskToDays(x.mask, recurring)) })));
      // The marked-up answer carries the snapshot date too. The visible footnote had it, the
      // JSON-LD did not — and the JSON-LD is the copy an answer engine quotes, where a
      // timeless-sounding claim about a timetable is exactly the wrong thing to hand over.
      const asOfLabel = sched.asOf
        ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' })
            .format(new Date(`${sched.asOf}T00:00:00Z`)).replace(/\s*г\.?$/, '')
        : '';
      return [{ q: tUi('sched_faq_q', { a: name, deA: deName }), a: tUi('sched_faq_a', { m: asOfLabel, a: name, d: sched.dailyCount, i: sched.irregularCount, ex }) }];
    })()),
    ...((() => {
      if (inbound || noService || airport.closed) return [];
      // A destination whose label is just its IATA code (the localizer had no name) reads as
      // garbage in a sentence («…направления: SVO, GME…»), and two airports of one city
      // (Шереметьево + Внуково → «Москва, Москва») read as a stutter. Filter and dedupe;
      // the ≥3 gate then applies to what would actually be printed.
      const printable = [...new Set(
        routes.map(r => r.label.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim())
          .filter(l => l && !/^[A-Z]{3}$/.test(l)),
      )];
      return printable.length >= 3
        ? [{ q: t('faq_dest_q', { name, deName }), a: t('faq_dest_a', { name, deName, iata: airport.iata, list: listFmt(printable.slice(0, 6)) }) }]
        : [];
    })()),
    // The questions people actually ask about a field with no airline service — and the
    // answers nobody else publishes, because nobody else measured which airports have
    // scheduled service. Both are plain, self-contained sentences, so they can be lifted
    // verbatim by an answer engine.
    ...(noService ? [{ q: t('faq_hasflights_q', { name, deName }), a: t('faq_hasflights_a', { name, deName, iata: airport.iata }) }] : []),
    ...(noService && nearestServed
      ? [{
          q: t('faq_nearest_q', { name, deName }),
          a: t('faq_nearest_a', {
            airport: getAirportName(nearestServed.iata, locale, nearestServed.name),
            code: nearestServed.iata,
            km: String(nearestServed.km),
          }),
        }]
      : []),
    // "shows live arrivals and departures … updated every minute" is false on an airport
    // with an empty board, and it was being asserted as FAQPage markup on every page.
    ...(flights.length ? [{ q: t('faq_live_q', { name, deName }), a: t('faq_live_a', { name, deName, iata: airport.iata }) }] : []),
  ];
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const H2 = ({ children, href, viewAll }: { children: React.ReactNode; href?: string; viewAll?: string }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' }}>{children}</h2>
      {/* Padding on the bottom and inline-start only: the row is baseline-aligned, so padding-top
          would drag the heading down, and padding-inline-end would unstick it from the right edge.
          The negative margin gives back the 6px so single-line headings keep their height. */}
      {href && viewAll && <Link href={href} style={{ fontSize: 13, color: '#0A84FF', textDecoration: 'none', flexShrink: 0, paddingBottom: 6, paddingInlineStart: 6, marginBottom: -6 }}>{viewAll}</Link>}
    </div>
  );
  const sec: React.CSSProperties = { marginTop: 36 };

  return (
    <div style={{ background: '#050505', padding: '0 24px 8px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Live-event banner (e.g. World Cup final): visible above the fold-out,
            links to the event guide. Auto-expires once the event is over. */}
        <EventBanner iata={airport.iata} locale={locale} style={{ marginTop: 14 }} />

        {/* ── Always visible: the unique, quotable prose ──────────────────────────
            About → guide (transport/terminals/tips) → FAQ sit ABOVE the fold-out. These
            are the passages worth citing and the only text here no other site has;
            behind a click they were ~83% of the page's text, invisible to readers,
            search engines and answer engines alike. What stays in "show more" below is
            navigation — link lists, not prose. */}
        {/* 6. ABOUT */}
        {about && (
          <section className="cv-auto" style={sec}>
            <H2>{t('about_title', { iata: airport.iata })}</H2>
            <AboutCard text={about} readMore={t('read_more')} />
          </section>
        )}

        {/* 6a. PUBLISHED ROUTES — the answer for airports with no live board.
            1,060 airports return no schedule from the provider under any code, so their board
            is permanently empty and this page used to say only "live board data is not
            available right now". Who flies here and where to is the actual question, it is a
            stable fact, and Wikipedia keeps it current. Facts only — no prose is copied — with
            the article and revision cited. */}
        {/* The no-service sentence renders only when the page-level banner is NOT already
            saying the same thing — hasNoService() now covers the sourced-negative case, so
            without this gate the two statements duplicated on the same screen. */}
        {wiki && (wiki.airlines.length > 0 || (wiki.status === 'no_commercial_service' && !noService)) && (
          <section className="cv-auto" style={sec}>
            <H2>{t('wiki_routes_title', { iata: airport.iata, deIata })}</H2>
            {wiki.status === 'no_commercial_service' ? (
              <p style={{ fontSize: 15, lineHeight: 1.6, color: '#B4B4B4', margin: 0 }}>
                {wiki.since
                  ? t('wiki_no_service', { name, deName, year: wiki.since })
                  : t('wiki_no_service_nodate', { name, deName })}
              </p>
            ) : (
              <>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: SUB, margin: '0 0 12px' }}>{t('wiki_routes_note')}</p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {wiki.airlines.map(row => (
                    <li key={row.airline} style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '12px 16px' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF' }}>{row.airline}</div>
                      <div style={{ fontSize: 14, color: '#B4B4B4', marginTop: 4, lineHeight: 1.5 }}>{row.destinations.join(' · ')}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {wiki.source && (
              <p style={{ fontSize: 12, color: '#6A6A6A', margin: '12px 0 0' }}>
                {t('wiki_source', { name: '' })}
                <a href={`${wiki.source.url}?oldid=${wiki.source.revid}`} rel="nofollow noopener" target="_blank" style={{ color: '#8A8A8A' }}>
                  {wiki.source.title}
                </a>
                {' '}· CC BY-SA 4.0
              </p>
            )}
          </section>
        )}

        {/* 6a-ter. WEEKLY DEPARTURE PATTERN — the question the board cannot answer.
            The board is capped at 80 rows over roughly a day, so a route that runs on
            Tuesdays is invisible here five days out of seven. This table is the only place on
            the site that knows those routes exist, and the only one that can say WHICH days.
            Daily destinations are deliberately excluded from the rows: sorted by frequency
            they occupy every visible line and turn the days column into the same word
            repeated twenty times. Their count goes in the lead sentence, where it is a fact
            rather than filler. */}
        {sched && (
          <section className="cv-auto" style={sec}>
            <H2>{tUi('sched_title', { a: name, deA: deName })}</H2>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#B4B4B4', margin: '0 0 14px' }}>
              {tUi('sched_lead', { a: name, deA: deName, d: sched.dailyCount, i: sched.irregularCount })}
              {(() => {
                // Only when the spread is real. On an airport whose busiest and quietest days
                // differ by one destination, this sentence would dress noise as a finding.
                const max = Math.max(...sched.perDay), min = Math.min(...sched.perDay);
                if (max - min < 3) return null;
                // Intl gives weekday names lowercase in most locales ("пятница", "freitag"),
                // and this string starts with one — mid-paragraph that reads as a typo.
                const sentence = tUi('sched_peak', {
                  best: wdLong[sched.perDay.indexOf(max)], bn: max,
                  worst: wdLong[sched.perDay.indexOf(min)], wn: min,
                });
                return ' ' + sentence.charAt(0).toLocaleUpperCase(locale) + sentence.slice(1);
              })()}
            </p>
            <div style={{ overflowX: 'auto', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '4px 18px 8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                <thead>
                  <tr style={{ color: '#8A8A8A', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <th style={{ textAlign: 'start', padding: '12px 8px 10px 0', fontWeight: 600 }}>{tUi('sched_col_dest')}</th>
                    <th style={{ textAlign: 'start', padding: '12px 8px 10px 0', fontWeight: 600 }}>{tUi('sched_col_days')}</th>
                    <th style={{ textAlign: 'end', padding: '12px 0 10px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{tUi('sched_col_time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sched.rows.map(r => (
                    <tr key={r.iata} style={{ borderTop: '1px solid #1A1A1A' }}>
                      <td style={{ padding: '11px 8px 11px 0' }}>
                        {/* Links to an airport page that already exists and is already
                            indexed — this section adds no URLs of its own. */}
                        <Link href={`/${locale}/airport/${r.iata}`} style={{ color: '#E4E4E4', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>
                          {getCityName(getAirport(r.iata)?.city ?? r.iata, locale)} <span style={{ color: '#6A6A6A' }}>({r.iata})</span>
                        </Link>
                        {r.airlines.length > 0 && (
                          <span style={{ display: 'block', color: '#6A6A6A', fontSize: 12, marginTop: 2 }}>{r.airlines.join(' · ')}</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 8px 11px 0', color: '#B4B4B4' }}>{maskToDays(r.mask, wdShort).join(', ')}</td>
                      <td style={{ padding: '11px 0 11px 8px', textAlign: 'end', color: '#B4B4B4', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {r.times.length === 1 ? r.times[0] : r.times.length === 2 ? r.times.join(' / ') : `${r.times[0]} +${r.times.length - 1}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sched.irregularCount > sched.rows.length && (
              <p style={{ fontSize: 13, color: '#8A8A8A', marginTop: 10 }}>{tUi('sched_more', { n: sched.irregularCount - sched.rows.length })}</p>
            )}
            <p style={{ fontSize: 12, color: '#6A6A6A', marginTop: 10, lineHeight: 1.5 }}>
              {tUi('sched_note2', {
                // Russian renders "27 июля 2026 г." — its trailing period collides with the
                // sentence's own, giving "…2026 г.. Только регулярные".
                m: sched.asOf
                  ? new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' })
                      .format(new Date(`${sched.asOf}T00:00:00Z`))
                      .replace(/\s*г\.?$/, '')
                  : '',
              })}
            </p>
          </section>
        )}

        {/* 6a-bis. REFERENCE TABLES — the numbers, before the prose.
            The pages that win this market answer "how far is my resort and what does the bus
            cost", not "there are buses and taxis". Our prose block said the latter in every
            language, with not a single figure in it. These tables carry road distances and
            the actual line numbers; both were harvested twice independently and only the
            agreeing rows survived, so a missing fare means the two passes disagreed — the
            line still renders, because a number and a direction beat nothing. */}
        {ext?.guide && (ext.guide.transfers.length > 0 || ext.guide.transit.length > 0) && (
          <section className="cv-auto" style={sec}>
            {ext.guide.transfers.length > 0 && (
              <>
                <H2>{tUi('guide_transfers')}</H2>
                <div style={{ overflowX: 'auto', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '4px 18px 8px', marginBottom: ext.guide.transit.length ? 22 : 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                    <thead>
                      <tr style={{ color: '#8A8A8A', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ textAlign: 'start', padding: '12px 8px 10px 0', fontWeight: 600 }}>{tUi('guide_col_dest')}</th>
                        <th style={{ textAlign: 'end', padding: '12px 0 10px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{tUi('guide_col_time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ext.guide.transfers.map((r) => (
                        <tr key={r.dest} style={{ borderTop: '1px solid #1A1A1A' }}>
                          <td style={{ padding: '11px 8px 11px 0', color: '#E4E4E4' }}>{r.dest}</td>
                          <td style={{ padding: '11px 0 11px 8px', textAlign: 'end', color: '#B4B4B4', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.km} {tUi('guide_km')} · {r.min} {tUi('guide_min')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {ext.guide.transit.length > 0 && (
              <>
                <H2>{tUi('guide_transit')}</H2>
                <div style={{ overflowX: 'auto', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '4px 18px 8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                    <thead>
                      <tr style={{ color: '#8A8A8A', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        <th style={{ textAlign: 'start', padding: '12px 8px 10px 0', fontWeight: 600 }}>{tUi('guide_col_line')}</th>
                        <th style={{ textAlign: 'start', padding: '12px 8px 10px 0', fontWeight: 600 }}>{tUi('guide_col_dest')}</th>
                        <th style={{ textAlign: 'end', padding: '12px 0 10px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{tUi('guide_col_fare')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ext.guide.transit.map((r, i) => (
                        <tr key={`${r.line}:${i}`} style={{ borderTop: '1px solid #1A1A1A' }}>
                          {/* The code is the line; the operator is a footnote. Rendering the
                              full signage ("EMT Palma A1 Aeroport–Ciutat") ate the whole
                              width on a phone and pushed the destination — the reason anyone
                              reads this table — into a four-line wrap. */}
                          <td style={{ padding: '11px 8px 11px 0', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#E4E4E4', fontWeight: 700 }}>{r.line}</span>
                            {r.op && <span style={{ display: 'block', color: '#6A6A6A', fontSize: 12, marginTop: 2 }}>{r.op}</span>}
                          </td>
                          {/* Three stops is a direction; five is a timetable. The long tail
                              wrapped to five lines on a phone and pushed the fare column off
                              the edge. */}
                          <td style={{ padding: '11px 8px 11px 0', color: '#B4B4B4' }}>{
                            (() => { const p = r.dest.split(' / '); return p.length > 3 ? `${p.slice(0, 3).join(' / ')} …` : r.dest; })()
                          }</td>
                          {/* An em dash where the two harvest passes disagreed on the price.
                              Spelling out "check locally" in the cell cost more width than the
                              price it replaced; the disclaimer under the table says it once. */}
                          <td title={r.fare ? undefined : tUi('guide_fare_check')} style={{ padding: '11px 0 11px 8px', textAlign: 'end', color: r.fare ? '#B4B4B4' : '#4A4A4A', whiteSpace: 'nowrap' }}>{r.fare || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <p style={{ fontSize: 12, color: '#6A6A6A', marginTop: 12, lineHeight: 1.5 }}>
              {tUi('guide_asof', {
                // "2026-07" is a storage format, not something to show a reader. Rendered as
                // the month in their own language: "Juli 2026", "июль 2026 г.", "2026年7月".
                m: (() => {
                  const [y, mo] = ext.guide.asOf.split('-').map(Number);
                  if (!y || !mo) return ext.guide.asOf;
                  // Russian formats as "июль 2026 г." — a trailing period that collides with
                  // the sentence's own, giving "июль 2026 г.. Время".
                  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })
                    .format(new Date(Date.UTC(y, mo - 1, 1)))
                    .replace(/\.$/, '');
                })(),
              })}
            </p>
          </section>
        )}

        {/* 6b. AIRPORT GUIDE — transport / terminals / tips (top hubs only; renders
            nothing when there's no extended content file for this airport). */}
        {ext?.transport && (
          <section className="cv-auto" style={sec}>
            <H2>{extLabels.transport}</H2>
            <div style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '16px 18px', fontSize: 15, lineHeight: 1.6, color: '#B4B4B4' }}>{ext.transport}</div>
          </section>
        )}
        {ext?.terminals && (
          <section className="cv-auto" style={sec}>
            <H2>{extLabels.terminals}</H2>
            <div style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '16px 18px', fontSize: 15, lineHeight: 1.6, color: '#B4B4B4' }}>{ext.terminals}</div>
          </section>
        )}
        {ext?.tips && (
          <section className="cv-auto" style={sec}>
            <H2>{extLabels.tips}</H2>
            <div style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '16px 18px', fontSize: 15, lineHeight: 1.6, color: '#B4B4B4' }}>{ext.tips}</div>
          </section>
        )}

        {/* 5. FAQ */}
        <section className="cv-auto" style={sec}>
          <H2>{t('faq_title')}</H2>
          <Faq items={faq} />
        </section>

        {/* 5b. RECENTLY VIEWED — the return loop, on the page people actually land on.
            The visit itself is recorded by FlightBoard on mount; these chips render the list
            back, minus the airport being viewed. Client-side and null when the list is empty,
            so crawlers see nothing and there is no layout to shift. Checking a board is a
            repeat activity — someone meeting a flight looks three to five times in a day, and
            until now the only page showing this list was the homepage, which a search visitor
            never sees. */}
        <RecentlyViewed locale={locale} title={t('sec_recent')} exclude={airport.iata} />

        <MoreInfo label={t('show_more')}>

          {/* 2. OVERVIEW */}
          <section style={{ marginTop: 24 }}>
            <div style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 20, padding: '20px 22px' }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1 }}>{airport.iata}{GENERIC_LOCALES.has(locale) ? '' : ` ${t('airport_word')}`}</div>
              <div style={{ fontSize: 16, color: '#B4B4B4', marginTop: 8 }}>{name}</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 4 }}>{city}, {country}{offset ? ` · ${offset}` : ''}</div>
            </div>
            <OverviewMetrics iata={airport.iata} depLabel={t('ov_dep')} arrLabel={t('ov_arr')} />
            {/* Real anchors to the two subpages. The board's Departures/Arrivals toggle is a
                <button>, so without these the arrivals page is unreachable for a crawler —
                the sitemap audit found zero /arrivals hrefs in the whole page HTML. */}
            {subpageLinks && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {(['departures', 'arrivals'] as const).map(d => (
                  <Link key={d} href={`/${locale}/airport/${airport.iata}/${d}`} style={{
                    flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 12,
                    background: '#0B0B0B', border: '1px solid #1A1A1A', textDecoration: 'none',
                    color: '#B4B4B4', fontSize: 14, fontWeight: 600,
                  }}>
                    {d === 'departures' ? tNav('departures') : tNav('arrivals')}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* 3. POPULAR ROUTES (server-rendered → crawlable /route links) */}
          {routes.length > 0 && (
            <section className="cv-auto" style={sec}>
              <H2 href={`/${locale}/airport/${airport.iata}/${inbound ? 'arrivals' : 'departures'}`} viewAll={t('view_all')}>{t(inbound ? 'routes_title_in' : 'routes_title', { iata: airport.iata })}</H2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {routes.map(r => (
                  /* Direction matters in the URL too: /route/A-B is "flights from A to B",
                     so an arrivals board must link origin→here, not here→origin. */
                  <Link key={r.iata} href={`/${locale}/route/${inbound ? `${r.iata}-${airport.iata}` : `${airport.iata}-${r.iata}`}`} style={{ flexShrink: 0, width: 160, textDecoration: 'none', color: 'inherit', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{r.iata}</div>
                    <div style={{ fontSize: 13, color: SUB, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label.replace(/\s*\([A-Z]{3}\)\s*$/, '')}</div>
                    <div style={{ fontSize: 12, color: '#34C759', marginTop: 10, fontWeight: 600 }}>{t('per_day', { n: r.n })}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 3b. AIRLINES AT THIS AIRPORT.
              These were links to /airline/<CODE>. That page reads a store key ("airline_iata=")
              which nothing ever writes — lib/flights.ts getAirlineFlights() is dead by
              construction, not merely stale — so every one of them answered 200 with an empty
              body under noindex: a textbook soft-404. Ten of them on each of 6,072 airport
              pages across 12 locales, emitted from the site's main indexable asset.
              The names stay, because "which airlines fly from here" is a real question and the
              answer is derived from the actual board. Only the dead link goes. */}
          {airlines.length > 0 && (
            <section className="cv-auto" style={sec}>
              <H2>{t('airlines_title')}</H2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {airlines.map(al => (
                  <span key={al.iata} style={{ color: '#E4E4E7', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 12, padding: '9px 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A84FF' }}>{al.iata}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{al.name}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 4. NEARBY AIRPORTS */}
          {nearby.length > 0 && (
            <section className="cv-auto" style={sec}>
              <H2>{t('nearby_title', { city, deCity })}</H2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nearby.map(a => (
                  <li key={a.iata}>
                    <Link href={`/${locale}/airport/${a.iata}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '12px 16px' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#0A84FF', width: 44, flexShrink: 0 }}>{a.iata}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
                      <span style={{ fontSize: 12, color: SUB, flexShrink: 0 }}>{t('km_away', { km: a.km, iata: airport.iata, deIata })}</span>
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 7. POPULAR AIRPORTS IN COUNTRY */}
          {countryAirports.length > 0 && countryInfo && (
            <section className="cv-auto" style={sec}>
              <H2 href={`/${locale}/airports/${countryInfo.slug}`} viewAll={t('view_all')}>{t('country_air_title', { country })}</H2>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {countryAirports.map(a => (
                  <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{ flexShrink: 0, textDecoration: 'none', color: 'inherit', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '12px 16px', minWidth: 96 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>{a.iata}</div>
                    <div style={{ fontSize: 12, color: SUB, marginTop: 3, whiteSpace: 'nowrap' }}>{getCityName(a.city, locale)}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 8. A-Z */}
          <section className="cv-auto" style={sec}>
            <H2 href={`/${locale}/az/a`} viewAll={t('view_all')}>{t('az_all')}</H2>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {LETTERS.map(L => (
                <Link key={L} href={`/${locale}/az/${L.toLowerCase()}`} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid #1A1A1A', background: '#0B0B0B', textDecoration: 'none', color: '#8A8A8A', fontSize: 14, fontWeight: 600 }}>{L}</Link>
              ))}
            </div>
          </section>

          {/* 9. FOOTER */}
          <footer style={{ marginTop: 44, paddingTop: 24, borderTop: '1px solid #1A1A1A' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>airportsboard</div>
            <p style={{ fontSize: 13, color: SUB, lineHeight: 1.5, marginTop: 8, maxWidth: 340 }}>{t('footer_tagline', { served: worldServiceCounts().withService })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: 16, fontSize: 13 }}>
              {countryInfo && <Link href={`/${locale}/airports/${countryInfo.slug}`} style={{ color: SUB, textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>{t('footer_countries')}</Link>}
              {cityLink && <Link href={cityLink} style={{ color: SUB, textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>{city}</Link>}
              <Link href={`/${locale}/az/a`} style={{ color: SUB, textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>{t('az_all')}</Link>
            </div>
            <div style={{ fontSize: 12, color: '#3A3A3C', marginTop: 18 }}>© 2026 airportsboard.live</div>
          </footer>

        </MoreInfo>
      </div>
    </div>
  );
}
