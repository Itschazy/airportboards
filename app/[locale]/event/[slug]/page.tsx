import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getEvent, getEventSlugs, effectiveStatus, type EventLocale, type EventType,
} from '@/lib/event-content';
import { getAirport } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; slug: string }> };

// Small closed set of event pages; prerender them all, 404 anything else.
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return getEventSlugs().map(slug => ({ slug }));
}

const TYPE_EMOJI: Record<EventType, string> = { concert: '🎤', sports: '🏆', festival: '🎪' };

/** Rendering falls back to EN so a half-generated event still shows something;
 *  indexing does NOT — a locale without its own copy is noindex + out of hreflang. */
function pick(ev: NonNullable<ReturnType<typeof getEvent>>, locale: string): EventLocale {
  return ev.locales[locale] || ev.locales.en;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const ev = getEvent(slug);
  if (!ev) return {};
  const c = pick(ev, locale);
  const hasLocale = !!ev.locales[locale];
  const status = effectiveStatus(ev.meta);
  const canonical = `${BASE}/${locale}/event/${slug}`;

  // Only advertise locales that actually have their own copy (no EN duplicates in the cluster).
  const languages: Record<string, string> = {};
  for (const loc of locales) if (ev.locales[loc]) languages[loc] = `${BASE}/${loc}/event/${slug}`;
  if (ev.locales.en) languages['x-default'] = `${BASE}/en/event/${slug}`;

  const indexable = hasLocale && status !== 'cancelled';
  return {
    title: c.title,
    description: c.description,
    alternates: indexable ? { canonical, languages } : { canonical },
    robots: { index: indexable, follow: true },
  };
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const ev = getEvent(slug);
  if (!ev) notFound();
  const c = pick(ev, locale);
  const m = ev.meta;
  const status = effectiveStatus(m);
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tE = await getTranslations({ locale, namespace: 'event' });
  const canonical = `${BASE}/${locale}/event/${slug}`;

  // Per-event, per-locale headings when generated; generic localized fallback otherwise.
  const sec = {
    boards: c.sec?.boards || tE('sec_boards'),
    getting: c.sec?.getting || tE('sec_getting'),
    leaving: c.sec?.leaving || tE('sec_leaving'),
    tips: c.sec?.tips || tE('sec_tips'),
  };

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const whenText = (() => {
    const s = dateFmt.format(new Date(m.startDate));
    if (!m.endDate) return s;
    const e = dateFmt.format(new Date(m.endDate));
    return s === e ? s : `${s} — ${e}`;
  })();

  // Event is referenced via WebPage.about (semantic link for search/LLMs) rather than as a
  // top-level Event entity: this is a travel guide, not an event-posting page, and Google's
  // Event markup is scoped to the latter (marking it up here risks a spam manual action).
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: c.h1,
      description: c.description,
      url: canonical,
      inLanguage: locale,
      about: {
        '@type': 'Event',
        name: m.name,
        startDate: m.startDate,
        ...(m.endDate ? { endDate: m.endDate } : {}),
        ...(status === 'cancelled' ? { eventStatus: 'https://schema.org/EventCancelled' } : {}),
        ...(status === 'postponed' ? { eventStatus: 'https://schema.org/EventPostponed' } : {}),
        location: {
          '@type': 'Place',
          name: m.venue,
          address: { '@type': 'PostalAddress', addressLocality: m.venueCity, addressCountry: m.country },
        },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: tE('hub_title'), item: `${BASE}/${locale}/events` },
        { '@type': 'ListItem', position: 3, name: c.h1, item: canonical },
      ],
    },
  ];

  const sub = { fontSize: 15, lineHeight: 1.65, color: '#B4B4B4' } as const;
  const h2s = { margin: '0 0 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' } as const;
  const card = { background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '16px 18px' } as const;

  const notice =
    status === 'cancelled' ? { text: tE('cancelled'), color: '#FF453A' }
    : status === 'postponed' ? { text: tE('postponed'), color: '#FF9F0A' }
    : status === 'past' ? { text: `${tE('past_title')} — ${tE('past_text')}`, color: '#8A8A8A' }
    : null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
        {' / '}
        <Link href={`/${locale}/events`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>{tE('hub_title')}</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.08 }}>
        <span aria-hidden="true">{TYPE_EMOJI[m.type] || '📍'}</span> {c.h1}
      </h1>
      <p style={{ fontSize: 14, color: '#8A8A8A', margin: '0 0 6px' }}>
        {m.venue} · {m.venueCity}
      </p>
      <p style={{ fontSize: 14, color: '#8A8A8A', margin: '0 0 22px' }}>
        {tE('when')}: <time dateTime={m.startDate}>{whenText}</time>
      </p>

      {notice && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: `1px solid ${notice.color}55`,
          borderLeft: `3px solid ${notice.color}`, borderRadius: 12, padding: '13px 16px',
          fontSize: 14, color: '#E4E4E7', lineHeight: 1.5, margin: '0 0 24px',
        }}>
          {notice.text}
        </div>
      )}

      <p style={{ ...sub, margin: '0 0 30px' }}>{c.intro}</p>

      {/* Airports — the money block: live-board links */}
      <section style={{ marginBottom: 34 }}>
        <h2 style={h2s}>{sec.boards}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {m.airports.map(a => {
            const ap = getAirport(a.iata);
            if (!ap) return null;
            const name = getAirportName(a.iata, locale, ap.name);
            return (
              <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} className="frow" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ width: 4, background: '#0A84FF', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '16px', gap: 14, minWidth: 0 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#0A84FF', width: 64, flexShrink: 0, letterSpacing: '-0.02em' }}>{a.iata}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#E4E4E7' }}>{name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>≈{a.km} km · {m.venue}</span>
                  </span>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={h2s}>{sec.getting}</h2>
        <div style={{ ...card, ...sub }}>{c.getting}</div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={h2s}>{sec.leaving}</h2>
        <div style={{ ...card, ...sub }}>{c.leaving}</div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={h2s}>{sec.tips}</h2>
        <div style={{ ...card, ...sub }}>{c.tips}</div>
      </section>

      {/* Organiser link — a plain outbound link, never affiliate, never a purchase CTA. */}
      {m.officialUrl && (
        <section style={{ marginBottom: 26 }}>
          <h2 style={h2s}>{tE('organiser')}</h2>
          <div style={card}>
            <a href={m.officialUrl} rel="nofollow noopener" target="_blank"
               style={{ fontSize: 15, color: '#0A84FF', textDecoration: 'none', wordBreak: 'break-word' }}>
              {new URL(m.officialUrl).hostname.replace(/^www\./, '')}
            </a>
          </div>
        </section>
      )}

      <p style={{ fontSize: 12, color: '#6A6A6A', lineHeight: 1.5, marginTop: 26 }}>
        {tE('disclaimer')}
      </p>
    </div>
  );
}
