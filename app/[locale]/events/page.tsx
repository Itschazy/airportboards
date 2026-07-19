import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { getEventsForHub, type EventData, type EventType } from '@/lib/event-content';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string }> };

export const revalidate = 3600;

const TYPE_EMOJI: Record<EventType, string> = { concert: '🎤', sports: '🏆', festival: '🎪' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const tE = await getTranslations({ locale, namespace: 'event' });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/events`;
  languages['x-default'] = `${BASE}/en/events`;
  return {
    title: withBrand(tE('hub_title')),
    description: tE('hub_desc'),
    alternates: { canonical: `${BASE}/${locale}/events`, languages },
    robots: { index: true, follow: true },
  };
}

export default async function EventsHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tE = await getTranslations({ locale, namespace: 'event' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const { upcoming, past } = getEventsForHub();

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: tE('hub_title'), item: `${BASE}/${locale}/events` },
    ],
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: tE('hub_title'),
    numberOfItems: upcoming.length,
    itemListElement: upcoming.map((e, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: (e.locales[locale] || e.locales.en)?.h1 || e.meta.name,
      item: `${BASE}/${locale}/event/${e.meta.slug}`,
    })),
  };

  const h2s = { margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' } as const;

  const Row = ({ e, dim }: { e: EventData; dim?: boolean }) => {
    const c = e.locales[locale] || e.locales.en;
    return (
      <Link href={`/${locale}/event/${e.meta.slug}`} className="frow" style={{ textDecoration: 'none', color: 'inherit', opacity: dim ? 0.65 : 1 }}>
        <div style={{ width: 4, background: dim ? '#3A3A3C' : '#0A84FF', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '15px 16px', gap: 13, minWidth: 0 }}>
          <span style={{ fontSize: 22, flexShrink: 0 }} aria-hidden="true">{TYPE_EMOJI[e.meta.type] || '📍'}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#E4E4E7', lineHeight: 1.3 }}>{c?.h1 || e.meta.name}</span>
            <span style={{ display: 'block', fontSize: 12, color: '#8A8A8A', marginTop: 3 }}>
              {dateFmt.format(new Date(e.meta.startDate))} · {e.meta.venueCity} · {e.meta.airports.map(a => a.iata).join(' · ')}
            </span>
          </span>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>
    );
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px' }}>
        {tE('hub_title')}
      </h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', margin: '0 0 30px', lineHeight: 1.5 }}>{tE('hub_desc')}</p>

      {upcoming.length > 0 && (
        <section style={{ marginBottom: 34 }}>
          <h2 style={h2s}>{tE('hub_upcoming')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map(e => <Row key={e.meta.slug} e={e} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 style={h2s}>{tE('hub_past')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(e => <Row key={e.meta.slug} e={e} dim />)}
          </div>
        </section>
      )}
    </div>
  );
}
