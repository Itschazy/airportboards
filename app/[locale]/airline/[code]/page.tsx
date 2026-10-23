import type { Metadata } from 'next';
import { forwardArrow } from '@/lib/i18n';
import { withBrand } from '@/lib/title';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirport } from '@/lib/airports';
import { getCityName } from '@/lib/places';
import { getAirline, getAirlineFlights, type FlightRow } from '@/lib/flights';
import { assertLocale } from '@/lib/locale-guard';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; code: string }> };

export const dynamicParams = true;
export const revalidate = 600;

const STATUS_COLOR: Record<string, string> = {
  ontime: 'var(--ab-8a8a8a)', scheduled: 'var(--ab-8a8a8a)', boarding: 'var(--ab-0a84ff)', finalcall: 'var(--ab-ff453a)',
  delayed: 'var(--ab-ff9f0a)', departed: 'var(--ab-48484a)', baggage: 'var(--ab-0a84ff)', arrived: 'var(--ab-48484a)', cancelled: 'var(--ab-ff453a)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  setRequestLocale(assertLocale(locale));
  const name = getAirline(code);
  if (!name) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const cu = code.toUpperCase();
  // Airline pages carry only a name + a (frequently empty) live flight list — too thin to
  // index across ~976 codes without soft-404 risk, and indexability can't be derived from
  // live data without spending quota on every crawl. Keep them noindex/follow (useful for
  // users + link flow) and omit the hreflang cluster; they're also dropped from the sitemap.
  return {
    title: withBrand(`${t('airline_title', { airline: name })} (${cu})`),
    description: t('airline_desc', { airline: name, iata: cu }),
    alternates: { canonical: `${BASE}/${locale}/airline/${cu}` },
    robots: { index: false, follow: true },
  };
}

export default async function AirlinePage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(assertLocale(locale));
  const name = getAirline(code);
  if (!name) notFound();
  const cu = code.toUpperCase();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  let flights: FlightRow[] = [];
  try { flights = await getAirlineFlights(cu, locale); } catch {}
  // Same soft-404 as the flight page: getAirlineFlights() reads "airline_iata=", a key the
  // warmer never writes, so this always rendered an empty board under a 200. Ten of these
  // were linked from every airport page until this commit's predecessor.
  if (flights.length === 0) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Airline',
    name,
    iataCode: cu,
    url: `${BASE}/${locale}/airline/${cu}`,
  };
  const link: React.CSSProperties = { color: 'var(--ab-0a84ff)', textDecoration: 'none' };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: 'var(--ab-8a8a8a)', marginBottom: 12 }}>
        <Link href={`/${locale}`} style={{ color: 'var(--ab-6a6a6a)', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(30px, 8vw, 46px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', margin: 0, lineHeight: 1.05 }}>
        {t('airline_title', { airline: name })}
      </h1>
      <div style={{ fontSize: 16, color: 'var(--ab-6a6a6a)', marginTop: 6, fontWeight: 700, letterSpacing: '0.08em' }}>{cu}</div>

      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ab-8a8a8a)', margin: '32px 0 14px' }}>
        {t('airline_live')}
      </div>

      {flights.length === 0 ? (
        <div style={{ fontSize: 15, color: 'var(--ab-8a8a8a)', padding: '20px 0' }}>{t('airline_none', { airline: name })}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flights.map((f, i) => {
            const dep = getAirport(f.depIata), arr = getAirport(f.arrIata);
            return (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ab-0b0b0b)', border: '1px solid var(--ab-1a1a1a)', borderRadius: 14, padding: '14px 16px', overflow: 'hidden' }}>
                <span style={{ width: 4, alignSelf: 'stretch', background: STATUS_COLOR[f.status] || 'var(--ab-48484a)', borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 20, fontWeight: 700, color: f.actual ? 'var(--ab-ff9f0a)' : 'var(--ab-ffffff)', fontVariantNumeric: 'tabular-nums', width: 58, flexShrink: 0 }}>{f.actual || f.scheduled}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/${locale}/flight/${f.flight.replace(/\s/g, '')}`} style={{ ...link, display: 'block', fontSize: 14, fontWeight: 600 }}>{f.flight}</Link>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--ab-8a8a8a)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dep ? getCityName(dep.city, locale) : f.depIata} {forwardArrow(locale)} {arr ? getCityName(arr.city, locale) : f.arrIata}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
