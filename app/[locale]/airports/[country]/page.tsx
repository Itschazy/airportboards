import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations , setRequestLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getCountryBySlug, getAirportsByCountry, getCountries } from '@/lib/airports';
import { COUNTRY_SLUG_ALIASES } from '@/lib/country-slug-aliases';
import { getAirportName } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { countryIn as esCountryIn } from '@/lib/es-article';
import { numLocale, locales } from '@/lib/i18n';
import { splitByService, serviceMeasuredOn } from '@/lib/warm';
import { localizedMeasuredOn } from '@/lib/measured-date';

// See app/[locale]/airports/page.tsx — ICU renders a bare placeholder ungrouped.
const fmt = (n: number, locale: string) => n.toLocaleString(numLocale(locale));

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; country: string }> };

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  // Pre-render the busiest 40 countries; the rest render on-demand.
  return getCountries().slice(0, 40).map(c => ({ country: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, country } = await params;
  setRequestLocale(locale);
  const c = getCountryBySlug(country);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const countryName = getCountryName(c.country, locale);
  const title = t('country_title', { country: countryName, countryIn: esCountryIn(countryName, locale) });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/airports/${c.slug}`;
  languages['x-default'] = `${BASE}/en/airports/${c.slug}`;
  const hasServed = splitByService(getAirportsByCountry(c.slug)).served.length > 0;
  return {
    title: withBrand(title),
    description: (() => {
      // Say how many of the country's airports you can actually fly from — the number a
      // traveller wants and that no atlas publishes — rather than implying all of them
      // have live boards.
      const { served, unserved, unknown } = splitByService(getAirportsByCountry(c.slug));
      const iso = serviceMeasuredOn();
      const date = iso ? localizedMeasuredOn(iso, locale) : null;
      // The full sentence accounts for every airport (served + the rest), so it may only be
      // used when there is nothing we are unsure about. Once the OurAirports cross-check moves
      // airports into `unknown`, "the remaining N are airfields with no airline flights" stops
      // adding up — Norway would read "8 have service; the remaining 10" out of 56 — and it
      // also asserts a negative we no longer stand behind. The partial variant states only the
      // confirmed floor, which is both true and still the number a traveller wants.
      // Zero served airports is NOT the same as "no measurement date", and the two used to
      // share this branch — so /en/airports/ukraine (31 airports, none with service) answered
      // with the most confident template on the site: "Live arrivals and departures for the 31
      // airports in Ukraine … with the age of the data shown on every board." 19 countries did
      // this. It is the country-page form of the promise AdSense rejected the site over.
      // Raw numbers, not fmt(): these two keys now carry an ICU plural, and `#` inside a plural
      // formats the number for the locale itself. Handing it a pre-formatted STRING makes the
      // plural rule unmatchable, so every count would fall through to `other` — which is the
      // bug being fixed. 56 countries have exactly one served airport and read "1 airports".
      if (!served.length) return t('country_none', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count });
      if (!date) return t('country_desc', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count });
      // Numbers, not fmt() — same reason as above: these keys pluralise count, served and rest,
      // and ICU cannot match a plural rule against a pre-formatted string. Bahrain read
      // "Of the 1 airports … 1 have scheduled passenger service"; it is one of 56 countries
      // with exactly one served airport.
      return unknown.length
        ? t('country_split_partial', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count, served: served.length, date })
        : t('country_split', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count, served: served.length, rest: unserved.length, date });
    })(),
    alternates: { canonical: `${BASE}/${locale}/airports/${c.slug}`, languages },
    // A country where nothing is served has no flight content to offer — it is a list of codes.
    // Reachable and followed, so the airports below still get crawled, but not competing in
    // search as if it were a board.
    robots: { index: hasServed, follow: true },
  };
}

export default async function CountryPage({ params }: Props) {
  const { locale, country } = await params;
  setRequestLocale(locale);
  const c = getCountryBySlug(country);
  // A renamed country moves its own URL. Redirect rather than 404, so the old page keeps its
  // value — /en/airports/burma answered 200 and sat in the sitemap right up until the rename.
  if (!c) {
    const successor = COUNTRY_SLUG_ALIASES[country.toLowerCase()];
    if (successor) permanentRedirect(`/${locale}/airports/${successor}`);
    notFound();
  }
  const t = await getTranslations({ locale, namespace: 'home' });
  const airports = getAirportsByCountry(country);
  const countryName = getCountryName(c.country, locale);
  // The exclusive fact: of every IATA-coded airport in this country, how many actually have
  // scheduled passenger service. Measured across all 6,069 codes, so it is ours to state.
  const { served, unserved, unknown } = splitByService(airports);
  const measuredOn = serviceMeasuredOn();
  const showSplit = !!measuredOn && served.length > 0 && unserved.length > 0;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'airportsboard', item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('sec_countries'), item: `${BASE}/${locale}/airports` },
      { '@type': 'ListItem', position: 3, name: countryName, item: `${BASE}/${locale}/airports/${c.slug}` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('country_title', { country: countryName, countryIn: esCountryIn(countryName, locale) }),
    numberOfItems: airports.length,
    itemListElement: airports.map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: getAirportName(a.iata, locale, a.name),
      item: `${BASE}/${locale}/airport/${a.iata}`,
    })),
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 8 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>airportsboard</Link>
        {' / '}
        <Link href={`/${locale}/airports`} style={{ color: '#6A6A6A', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>{t('sec_countries')}</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1.05, margin: 0 }}>
        <span style={{ marginInlineEnd: 12 }}>{flag(c.iso2)}</span>{t('country_title', { country: countryName, countryIn: esCountryIn(countryName, locale) })}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', marginTop: 12 }}>{t('airports_count', { count: c.count })}</p>
      {/* One self-contained, dated sentence — the unit an answer engine lifts verbatim. */}
      {showSplit && (
        <p style={{ fontSize: 15, lineHeight: 1.55, color: '#C7C7CC', marginTop: 14, maxWidth: 640 }}>
          {unknown.length
            ? t('country_split_partial', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count, served: served.length, date: localizedMeasuredOn(measuredOn!, locale) })
            : t('country_split', { country: countryName, countryIn: esCountryIn(countryName, locale), count: c.count, served: served.length, rest: unserved.length, date: localizedMeasuredOn(measuredOn!, locale) })}
        </p>
      )}

      {showSplit && <SectionLabel>{t('grid_served')}</SectionLabel>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginTop: 28 }}>
        {(showSplit ? served : airports).map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '11px 16px',
          }}>
            <span style={{ width: 50, flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#0A84FF', letterSpacing: '-0.02em' }}>{a.iata}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: '#E4E4E7', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getCityName(a.city, locale)}</span>
              <span style={{ fontSize: 12, color: '#8A8A8A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
            </span>
            <svg data-flip width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Airfields with no airline service are listed too — they are real places people
          look up — but separated, so a military strip no longer sits beside Heathrow as if
          both offered flights. */}
      {showSplit && (
        <>
          <SectionLabel>{t('grid_unserved')}</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, marginTop: 28, opacity: 0.72 }}>
            {unserved.map(a => (
              <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
                display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
                background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '11px 16px',
              }}>
                <span style={{ width: 50, flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#6A6A6A', letterSpacing: '-0.02em' }}>{a.iata}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, color: '#A1A1AA', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getCityName(a.city, locale)}</span>
                  <span style={{ fontSize: 12, color: '#6A6A6A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: '32px 0 -14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: '#8A8A8A',
    }}>{children}</h2>
  );
}
