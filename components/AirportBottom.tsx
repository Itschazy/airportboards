import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Airport } from '@/lib/airports';
import { nearestAirports, getCountries, getAirportsByCountry, getCities } from '@/lib/airports';
import { getCityName, getCountryName } from '@/lib/places';
import { getAirportName } from '@/lib/airport-names';
import type { FlightRow } from '@/lib/flights';
import { MoreInfo, OverviewMetrics, AboutCard, Faq } from '@/components/AirportExtras';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const SUB = '#8A8A8A';

function gmtOffset(tz?: string): string {
  if (!tz) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch { return ''; }
}

function Chevron() {
  return <svg width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}><path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export async function AirportBottom({ airport, locale, about, displayName, flights = [] }: { airport: Airport; locale: string; about: string | null; displayName?: string; flights?: FlightRow[] }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const name = displayName || airport.name;
  const city = getCityName(airport.city, locale);
  const country = getCountryName(airport.country, locale);

  const nearby = nearestAirports(airport.lat, airport.lon, 7).filter(a => a.iata !== airport.iata).slice(0, 5);
  const countryInfo = getCountries().find(c => c.country === airport.country);
  const countryAirports = countryInfo
    ? getAirportsByCountry(countryInfo.slug).filter(a => a.iata !== airport.iata).slice(0, 8)
    : [];
  const offset = gmtOffset(airport.tz);

  // Multi-airport city → link UP to its (indexed) city page.
  const cityInfo = getCities().find(c => c.city === airport.city && c.country === airport.country);
  const cityLink = cityInfo && cityInfo.count > 1 ? `/${locale}/city/${cityInfo.slug}` : null;

  // Derive popular routes + airlines from today's SSR departures board, so these links
  // ship as real <a href> in the server HTML (the client version left /route and /airline
  // pages orphaned/undiscoverable). Aggregated by destination airport / operating carrier.
  const routeMap = new Map<string, { label: string; n: number }>();
  const airlineMap = new Map<string, { name: string; n: number }>();
  for (const f of flights) {
    if (f.arrIata && f.arrIata !== airport.iata) {
      const e = routeMap.get(f.arrIata) || { label: ('destination' in f && f.destination) || f.arrIata, n: 0 };
      e.n++; routeMap.set(f.arrIata, e);
    }
    if (f.airlineIata) {
      const e = airlineMap.get(f.airlineIata) || { name: f.airline || f.airlineIata, n: 0 };
      e.n++; airlineMap.set(f.airlineIata, e);
    }
  }
  const routes = [...routeMap.entries()].map(([iata, v]) => ({ iata, ...v })).sort((a, b) => b.n - a.n).slice(0, 8);
  const airlines = [...airlineMap.entries()].map(([iata, v]) => ({ iata, ...v })).sort((a, b) => b.n - a.n).slice(0, 10);

  const faq: { q: string; a: string }[] = [
    { q: t('faq_iata_q', { name }), a: airport.iata },
    ...(airport.icao ? [{ q: t('faq_icao_q', { name }), a: airport.icao }] : []),
    { q: t('faq_where_q', { name }), a: `${city}, ${country}` },
    { q: t('faq_tz_q', { name }), a: `${airport.tz}${offset ? ` (${offset})` : ''}` },
    { q: t('faq_arrive_q', { name }), a: t('faq_arrive_a') },
    { q: t('faq_live_q', { name }), a: t('faq_live_a', { name, iata: airport.iata }) },
  ];
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const H2 = ({ children, href, viewAll }: { children: React.ReactNode; href?: string; viewAll?: string }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' }}>{children}</h2>
      {href && viewAll && <Link href={href} style={{ fontSize: 13, color: '#0A84FF', textDecoration: 'none', flexShrink: 0 }}>{viewAll}</Link>}
    </div>
  );
  const sec: React.CSSProperties = { marginTop: 36 };

  return (
    <div style={{ background: '#050505', padding: '0 24px 8px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <MoreInfo label={t('show_more')}>

          {/* 2. OVERVIEW */}
          <section style={{ marginTop: 24 }}>
            <div style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 20, padding: '20px 22px' }}>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1 }}>{airport.iata} {t('airport_word')}</div>
              <div style={{ fontSize: 16, color: '#B4B4B4', marginTop: 8 }}>{name}</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 4 }}>{city}, {country}{offset ? ` · ${offset}` : ''}</div>
            </div>
            <OverviewMetrics iata={airport.iata} depLabel={t('ov_dep')} arrLabel={t('ov_arr')} />
          </section>

          {/* 3. POPULAR ROUTES (server-rendered → crawlable /route links) */}
          {routes.length > 0 && (
            <section style={sec}>
              <H2 href={`/${locale}/airport/${airport.iata}/departures`} viewAll={t('view_all')}>{t('routes_title', { iata: airport.iata })}</H2>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {routes.map(r => (
                  <Link key={r.iata} href={`/${locale}/route/${airport.iata}-${r.iata}`} style={{ flexShrink: 0, width: 160, textDecoration: 'none', color: 'inherit', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '14px 16px' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{r.iata}</div>
                    <div style={{ fontSize: 13, color: SUB, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label.replace(/\s*\([A-Z]{3}\)\s*$/, '')}</div>
                    <div style={{ fontSize: 12, color: '#34C759', marginTop: 10, fontWeight: 600 }}>{t('per_day', { n: r.n })}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 3b. AIRLINES AT THIS AIRPORT (server-rendered → crawlable /airline links) */}
          {airlines.length > 0 && (
            <section style={sec}>
              <H2>{t('airlines_title')}</H2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {airlines.map(al => (
                  <Link key={al.iata} href={`/${locale}/airline/${al.iata}`} style={{ textDecoration: 'none', color: '#E4E4E7', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 12, padding: '9px 14px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0A84FF' }}>{al.iata}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{al.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 4. NEARBY AIRPORTS */}
          {nearby.length > 0 && (
            <section style={sec}>
              <H2>{t('nearby_title', { city })}</H2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {nearby.map(a => (
                  <li key={a.iata}>
                    <Link href={`/${locale}/airport/${a.iata}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit', background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '12px 16px' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#0A84FF', width: 44, flexShrink: 0 }}>{a.iata}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
                      <span style={{ fontSize: 12, color: SUB, flexShrink: 0 }}>{t('km_away', { km: a.km, iata: airport.iata })}</span>
                      <Chevron />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 5. FAQ */}
          <section style={sec}>
            <H2>{t('faq_title')}</H2>
            <Faq items={faq} />
          </section>

          {/* 6. ABOUT */}
          {about && (
            <section style={sec}>
              <H2>{t('about_title', { iata: airport.iata })}</H2>
              <AboutCard text={about} readMore={t('read_more')} />
            </section>
          )}

          {/* 7. POPULAR AIRPORTS IN COUNTRY */}
          {countryAirports.length > 0 && countryInfo && (
            <section style={sec}>
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
          <section style={sec}>
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
            <p style={{ fontSize: 13, color: SUB, lineHeight: 1.5, marginTop: 8, maxWidth: 340 }}>{t('footer_tagline')}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', marginTop: 16, fontSize: 13 }}>
              {countryInfo && <Link href={`/${locale}/airports/${countryInfo.slug}`} style={{ color: SUB, textDecoration: 'none' }}>{t('footer_countries')}</Link>}
              {cityLink && <Link href={cityLink} style={{ color: SUB, textDecoration: 'none' }}>{city}</Link>}
              <Link href={`/${locale}/az/a`} style={{ color: SUB, textDecoration: 'none' }}>{t('az_all')}</Link>
            </div>
            <div style={{ fontSize: 12, color: '#3A3A3C', marginTop: 18 }}>© 2026 airportsboard.live</div>
          </footer>

        </MoreInfo>
      </div>
    </div>
  );
}
