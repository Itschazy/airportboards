import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirport } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName } from '@/lib/places';
import { getRoute, airlineName, type FlightRow } from '@/lib/flights';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; pair: string }> };

// On-demand only (the route space is huge); discovered via PopularRoutes links + ISR.
export const dynamicParams = true;
export const revalidate = 600;

function parsePair(pair: string): { from: string; to: string } | null {
  const m = pair.toUpperCase().match(/^([A-Z]{3})-([A-Z]{3})$/);
  if (!m || m[1] === m[2]) return null;
  return { from: m[1], to: m[2] };
}

const STATUS_COLOR: Record<string, string> = {
  ontime: '#8A8A8A', scheduled: '#8A8A8A', boarding: '#0A84FF', finalcall: '#FF453A',
  delayed: '#FF9F0A', departed: '#48484A', baggage: '#0A84FF', arrived: '#48484A', cancelled: '#FF453A',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const p = parsePair(pair);
  if (!p) return {};
  const a = getAirport(p.from), b = getAirport(p.to);
  if (!a || !b) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const from = getCityName(a.city, locale), to = getCityName(b.city, locale);
  const title = t('route_title', { from, to, iata1: p.from, iata2: p.to });
  const slug = `${p.from}-${p.to}`;
  // Only index a route that actually has flights — avoids soft-404s on the huge
  // pair space. Shared fetch is cache-deduped with the page render.
  let hasFlights = false;
  try { hasFlights = (await getRoute(p.from, p.to, locale)).length > 0; } catch {}
  const canonical = `${BASE}/${locale}/route/${slug}`;
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/route/${slug}`;
  languages['x-default'] = `${BASE}/en/route/${slug}`;
  return {
    title: `${title} — AirportsBoard`,
    description: t('route_desc', { from, to, iata1: p.from, iata2: p.to }),
    alternates: hasFlights ? { canonical, languages } : { canonical },
    robots: { index: hasFlights, follow: true },
  };
}

export default async function RoutePage({ params }: Props) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const p = parsePair(pair);
  if (!p) notFound();
  const a = getAirport(p.from), b = getAirport(p.to);
  if (!a || !b) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const from = getCityName(a.city, locale), to = getCityName(b.city, locale);
  const fromName = getAirportName(a.iata, locale, a.name), toName = getAirportName(b.iata, locale, b.name);

  let flights: FlightRow[] = [];
  try { flights = await getRoute(p.from, p.to, locale); } catch {}

  const airlines = [...new Set(flights.map(f => f.airlineIata).filter(Boolean))].map(airlineName);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('route_h1', { from, to, iata1: p.from, iata2: p.to }), item: `${BASE}/${locale}/route/${p.from}-${p.to}` },
    ],
  };

  const link: React.CSSProperties = { color: '#0A84FF', textDecoration: 'none' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(26px, 6.4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 8px', lineHeight: 1.1 }}>
        {t('route_h1', { from, to, iata1: p.from, iata2: p.to })}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', margin: '0 0 8px' }}>
        <Link href={`/${locale}/airport/${a.iata}/departures`} style={link}>{fromName}</Link>
        {' → '}
        <Link href={`/${locale}/airport/${b.iata}/arrivals`} style={link}>{toName}</Link>
      </p>

      {airlines.length > 0 && (
        <p style={{ fontSize: 14, color: '#6A6A6A', margin: '0 0 24px' }}>
          {t('route_airlines')}: <span style={{ color: '#B4B4B4' }}>{airlines.join(' · ')}</span>
        </p>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A', margin: '16px 0 14px' }}>
        {t('route_flights_today')}
      </div>

      {flights.length === 0 ? (
        <div style={{ fontSize: 15, color: '#8A8A8A', padding: '24px 0' }}>{t('route_none')}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flights.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '14px 16px', overflow: 'hidden' }}>
              <span style={{ width: 4, alignSelf: 'stretch', background: STATUS_COLOR[f.status] || '#48484A', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: f.actual ? '#FF9F0A' : '#FFFFFF', fontVariantNumeric: 'tabular-nums', width: 64, flexShrink: 0 }}>{f.actual || f.scheduled}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, color: '#E4E4E7', fontWeight: 600 }}>{f.airline}</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6A6A6A', marginTop: 2 }}>{f.flight}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 14, color: '#6A6A6A', marginTop: 32 }}>
        <Link href={`/${locale}/airport/${a.iata}`} style={link}>{fromName} ({a.iata})</Link>
        {' · '}
        <Link href={`/${locale}/airport/${b.iata}`} style={link}>{toName} ({b.iata})</Link>
      </p>
    </div>
  );
}
