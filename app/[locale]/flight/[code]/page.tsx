import { LocaleLinks } from '@/components/LocaleLinks';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirport } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName } from '@/lib/places';
import { getFlightByNumber } from '@/lib/flights';
import { locales, forwardArrow } from '@/lib/i18n';
import { assertLocale } from '@/lib/locale-guard';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; code: string }> };

export const dynamicParams = true;
export const revalidate = 300;

function normalize(code: string): string | null {
  const c = decodeURIComponent(code).toUpperCase().replace(/[\s-]/g, '');
  return /^[A-Z0-9]{2,3}\d{1,4}$/.test(c) ? c : null;
}
function pretty(code: string): string {
  // Airline IATA code is 2 chars (e.g. SU, S7, U6); the rest is the flight number.
  const m = code.match(/^([A-Z0-9]{2})(\d{1,4})$/);
  return m ? `${m[1]} ${m[2]}` : code;
}

const STATUS_COLOR: Record<string, string> = {
  ontime: 'var(--ab-30d158)', scheduled: 'var(--ab-8a8a8a)', boarding: 'var(--ab-0a84ff)', finalcall: 'var(--ab-ff453a)',
  delayed: 'var(--ab-ff9f0a)', departed: 'var(--ab-48484a)', baggage: 'var(--ab-0a84ff)', arrived: 'var(--ab-48484a)', cancelled: 'var(--ab-ff453a)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params;
  setRequestLocale(assertLocale(locale));
  const c = normalize(code);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const flight = pretty(c);
  // Don't index a flight number with no current data (avoids soft-404s across the
  // astronomically large flight-number space). Shared fetch is cache-deduped.
  let found = null;
  try { found = await getFlightByNumber(c, locale); } catch {}
  const canonical = `${BASE}/${locale}/flight/${c}`;
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/flight/${c}`;
  languages['x-default'] = `${BASE}/en/flight/${c}`;
  return {
    title: withBrand(t('flight_title', { flight })),
    description: t('flight_desc', { flight }),
    alternates: found ? { canonical, languages } : { canonical },
    robots: { index: !!found, follow: true },
  };
}

export default async function FlightPage({ params }: Props) {
  const { locale, code } = await params;
  setRequestLocale(assertLocale(locale));
  const c = normalize(code);
  if (!c) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tStatus = await getTranslations({ locale, namespace: 'status' });
  const tBoard = await getTranslations({ locale, namespace: 'board' });
  const flight = pretty(c);

  let f = null;
  try { f = await getFlightByNumber(c, locale); } catch {}
  // A 200 carrying "flight not found" is a soft-404: Google keeps the URL in the crawl queue
  // for months and re-checks it. Since getFlightByNumber() reads a store key nothing writes,
  // that was every request to this page — roughly 12,000 URLs. Removing the inbound links
  // stops new discovery but does nothing about what is already queued; this does.
  // Deliberately after the lookup, so the day this page can resolve a flight it simply starts
  // working instead of needing this line revisited.
  if (!f) notFound();

  const dep = f ? getAirport(f.depIata) : undefined;
  const arr = f ? getAirport(f.arrIata) : undefined;
  const statusKey = f && (f.status === 'finalcall' ? 'boarding' : f.status);
  const color = f ? (STATUS_COLOR[f.status] || 'var(--ab-48484a)') : 'var(--ab-48484a)';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Flight',
    flightNumber: flight,
    ...(f?.airline ? { provider: { '@type': 'Airline', name: f.airline } } : {}),
    ...(dep ? { departureAirport: { '@type': 'Airport', iataCode: dep.iata, name: dep.name } } : {}),
    ...(arr ? { arrivalAirport: { '@type': 'Airport', iataCode: arr.iata, name: arr.name } } : {}),
  };

  const Card = ({ label, value }: { label: string; value: string }) => (
    <div style={{ background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 16, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ab-8a8a8a)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ab-ffffff)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
  const link: React.CSSProperties = { color: 'var(--ab-0a84ff)', textDecoration: 'none' };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: 'var(--ab-8a8a8a)', marginBottom: 14 }}>
        <Link href={`/${locale}`} style={{ color: 'var(--ab-6a6a6a)', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>airportsboard</Link>
      </div>

      {f && statusKey && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 999, background: `color-mix(in srgb, ${color} 12.156862745098039%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 34.90196078431372%, transparent)`, marginBottom: 14 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{tStatus(statusKey)}</span>
        </div>
      )}

      <h1 style={{ fontSize: 'clamp(44px, 13vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--ab-ffffff)', margin: 0, lineHeight: 0.95 }}>{flight}</h1>
      {f?.airline && (
        <div style={{ fontSize: 20, marginTop: 8 }}>
          {f.airlineIata ? <Link href={`/${locale}/airline/${f.airlineIata}`} style={{ color: 'var(--ab-a1a1a1)', textDecoration: 'none' }}>{f.airline}</Link> : <span style={{ color: 'var(--ab-a1a1a1)' }}>{f.airline}</span>}
        </div>
      )}

      {f && dep && arr ? (
        <>
          <p style={{ fontSize: 16, color: 'var(--ab-c4c4c4)', marginTop: 14 }}>
            <Link href={`/${locale}/airport/${dep.iata}/departures`} style={link}>{getCityName(dep.city, locale)} ({dep.iata})</Link>
            {`  ${forwardArrow(locale)}  `}
            <Link href={`/${locale}/airport/${arr.iata}/arrivals`} style={link}>{getCityName(arr.city, locale)} ({arr.iata})</Link>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 24 }}>
            <Card label={tBoard('scheduled')} value={f.actual || f.scheduled} />
            {f.gate && <Card label={tBoard('gate')} value={f.gate} />}
            {f.terminal && <Card label={tBoard('terminal')} value={f.terminal} />}
          </div>

          <p style={{ fontSize: 14, color: 'var(--ab-6a6a6a)', marginTop: 28 }}>
            {t('flight_route')}: <Link href={`/${locale}/route/${dep.iata}-${arr.iata}`} style={link}>{getCityName(dep.city, locale)} {forwardArrow(locale)} {getCityName(arr.city, locale)}</Link>
          </p>
        </>
      ) : (
        <p style={{ fontSize: 16, color: 'var(--ab-8a8a8a)', marginTop: 20 }}>{t('flight_notfound', { flight })}</p>
      )}
    {/* Эта же страница на остальных одиннадцати языках. Ряд стоит в странице,
        а не в подвале, потому что подвал рисует раскладка, а она своего адреса
        не знает: узнать его можно только заголовком из middleware, и тогда
        каждая страница сайта стала бы динамической. Подробности — в LocaleLinks. */}
    <LocaleLinks locale={locale as Locale} path={`/flight/${c}`} />
    </div>
  );
}
