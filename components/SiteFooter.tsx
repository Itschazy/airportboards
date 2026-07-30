import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCountries, getAirportsByCountry } from '@/lib/airports';
import { getCountryName } from '@/lib/places';
import { serviceLevel } from '@/lib/warm';
import { locales, localeNames, type Locale } from '@/lib/i18n';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/**
 * Demand-sorted country slots, computed ONCE per process.
 *
 * The footer renders on every page, and the first version recomputed this inline on every
 * render: getAirportsByCountry × 237 countries walks the 6,073-airport list per country —
 * ~1.4M iterations per SSR of a component whose inputs (service levels, country list) are
 * static for the process lifetime. The audit flagged it; module-level memoisation makes the
 * footer O(1) after the first render, and the data cannot change without a deploy anyway.
 */
let cachedTop: (ReturnType<typeof getCountries>[number] & { flights: number })[] | null = null;
function topCountriesByDemand(earning: string[]) {
  if (cachedTop) return cachedTop;
  const withVolume = [...getCountries()].map(c => ({
    ...c,
    flights: getAirportsByCountry(c.slug).reduce((n, a) => n + Math.max(0, serviceLevel(a.iata) ?? 0), 0),
  }));
  const byDemand = [...withVolume].sort((a, b) => b.flights - a.flights);
  const top12 = byDemand.slice(0, 12);
  cachedTop = [...top12, ...byDemand.filter(c => earning.includes(c.country) && !top12.includes(c))];
  return cachedTop;
}

// Server-rendered global footer. Its real job is SEO: it ships crawlable <a href>
// links to the top hubs (busiest countries + the full A–Z index) on EVERY page across
// all 12 locales, flattening crawl depth and spreading internal link equity so the
// long tail of airports is reachable in few clicks from anywhere on the site.
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tLegal = await getTranslations({ locale, namespace: 'legal' });
  /**
   * Country slots, allocated by DEMAND rather than by how many airfields a country contains.
   *
   * `count` is the number of airports with an IATA code, which is a fact about geography, not
   * about anyone's search behaviour. Sorting on it put Russia 6th (178 airports, 1,310 daily
   * departures) and left Spain out of the footer entirely — 55 airports, 22nd by count, but
   * 2,647 daily departures and 8th by demand. Italy (2,122) and Mexico (1,948) were missing for
   * the same reason, while Canada's 379 mostly-empty northern strips took the second slot.
   * Scheduled departures are the closest proxy for demand we hold, and the traffic model says
   * board demand scales with passenger volume, not with the number of runways.
   *
   * PINNED separately: the countries that actually earn impressions today. Measured in Yandex
   * Webmaster — Sochi, Mineralnye Vody, Kazan, Yekaterinburg (RU), Sukhumi (GE), Baku (AZ),
   * Tashkent (UZ), Gyumri (AM), Horta (PT), Antalya (TR) — several of which sit below 60th by
   * departures and would be dropped by a pure demand sort. Removing the country page of the one
   * audience the site already has, from every page on the site, would be self-inflicted.
   */
  const EARNING_COUNTRIES = [
    'Russia', 'Turkey', 'Portugal', 'Kazakhstan', 'Uzbekistan', 'Georgia', 'Azerbaijan', 'Armenia',
  ];
  const topCountries = topCountriesByDemand(EARNING_COUNTRIES);

  const tEvent = await getTranslations({ locale, namespace: 'event' });

  const legalLinks = [
    // Events hub sits here so event guides keep a permanent inbound link once their
    // airport banners expire — otherwise they'd be sitemap-only orphans.
    { href: `/${locale}/events`, label: tEvent('hub_title') },
    // The widget programme lives or dies by webmasters finding it — avionio links its
    // generator from every page for exactly this reason.
    { href: `/${locale}/widgets`, label: t('widgets_title') },
    { href: `/${locale}/about`, label: tLegal('about') },
    { href: `/${locale}/contact`, label: tLegal('contact') },
    { href: `/${locale}/privacy`, label: tLegal('privacy') },
    { href: `/${locale}/terms`, label: tLegal('terms') },
  ];

  // WCAG 2.2 (2.5.8) asks for a 24x24 CSS px target, and a 13px link's line box is 19.5px, so
  // every link in this footer was short on a site where roughly 70% of visits are phones.
  // inline-block + minHeight grows the target DOWNWARD into the 8px row gap that is already
  // there: the text does not move, the column grows about 4.5px per row, nothing reflows.
  const linkStyle = { color: '#8A8A8A', textDecoration: 'none', fontSize: 13, display: 'inline-block', minHeight: 24 } as const;
  const headStyle = { color: '#6A6A6A', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' } as const;

  return (
    <footer style={{ borderTop: '1px solid #1A1A1A', marginTop: 'auto', padding: '32px 18px 28px' }}>
      <nav style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28 }} aria-label="Footer">
        <div>
          <p style={headStyle}>{t('sec_countries')}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {topCountries.map(c => (
              <li key={c.slug}>
                <Link href={`/${locale}/airports/${c.slug}`} style={linkStyle}>{getCountryName(c.country, locale)}</Link>
              </li>
            ))}
            <li>
              <Link href={`/${locale}/airports`} style={{ ...linkStyle, color: '#0A84FF' }}>{tNav('all_airports')} →</Link>
            </li>
          </ul>
        </div>
        <div>
          <p style={headStyle}>A–Z</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
            {LETTERS.map(x => (
              <li key={x}>
                {/* A single letter is about 9px wide, so this is the one place in the footer
                    that also fails on the horizontal axis; centring inside 24px keeps the
                    existing 12px column gap and the row reads the same. */}
                <Link href={`/${locale}/az/${x}`} style={{ ...linkStyle, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{x.toUpperCase()}</Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      {/* Language row.
          Until this existed, eleven of the twelve language trees had no inbound link anywhere
          on the site. Measured on production: /en/airport/FRA carried 99 internal <a href> and
          every single one pointed at /en/, and all 1,028 <loc> in a sitemap child were /en/ too
          — the other locales appeared only as xhtml:link hreflang alternates. hreflang tells an
          engine which version to SHOW a given user; it is not a discovery or ranking signal, and
          it carries no link equity. So the ru/de/es/it trees the whole strategy depends on had
          zero internal PageRank and were reachable only by an engine choosing to follow an
          alternate.
          The header already had a switcher, but its links render inside `{open && …}` — client
          state, closed by default — so they were absent from the server HTML entirely. These are
          plain server-rendered links, visible, on every page of every locale. `hrefLang` is set
          so the relationship is explicit rather than inferred. */}
      <nav aria-label={tNav('language')} style={{ maxWidth: 1000, margin: '28px auto 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
        {locales.map(loc => (
          <Link
            key={loc}
            href={`/${loc}`}
            hrefLang={loc}
            style={{
              color: loc === locale ? '#FFFFFF' : '#8A8A8A',
              fontWeight: loc === locale ? 600 : 400,
              textDecoration: 'none',
              fontSize: 13,
              display: 'inline-block', minHeight: 24,   // 24px tap target; see linkStyle above
            }}
          >
            {localeNames[loc]}
          </Link>
        ))}
      </nav>
      <nav aria-label={tLegal('legal')} style={{ maxWidth: 1000, margin: '18px auto 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px' }}>
        {legalLinks.map(l => (
          <Link key={l.href} href={l.href} style={{ color: '#8A8A8A', textDecoration: 'none', fontSize: 13, display: 'inline-block', minHeight: 24 }}>{l.label}</Link>
        ))}
      </nav>
      <p style={{ maxWidth: 1000, margin: '20px auto 0', textAlign: 'center', fontSize: 12, color: '#6A6A6A', lineHeight: 1.5 }}>
        {t('data_note')}
      </p>
      <p style={{ maxWidth: 1000, margin: '10px auto 0', textAlign: 'center', fontSize: 11, color: '#5A5A5A', letterSpacing: '0.02em' }}>
        airportsboard.live · © 2026
      </p>
    </footer>
  );
}
