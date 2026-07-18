import Link from 'next/link';
import { getEventsForAirport, type EventType } from '@/lib/event-content';

const TYPE_EMOJI: Record<EventType, string> = { concert: '🎤', sports: '🏆', festival: '🎪' };

/** Promo chip linking an airport to the event guides that use it. Server-rendered so the
 *  link is in the crawlable HTML; auto-hides once the event is over (see effectiveStatus).
 *  Used on the airport board AND its arrivals/departures subpages — the fly-home traffic
 *  lands on those, and they were previously dead ends in the crawl graph. */
export function EventBanner({ iata, locale, style }: { iata: string; locale: string; style?: React.CSSProperties }) {
  const events = getEventsForAirport(iata);
  if (!events.length) return null;
  return (
    <>
      {events.map(ev => {
        const c = ev.locales[locale] || ev.locales.en;
        if (!c?.banner) return null;
        return (
          <Link key={ev.meta.slug} href={`/${locale}/event/${ev.meta.slug}`} className="press" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(10,132,255,0.09)', border: '1px solid rgba(10,132,255,0.35)',
            borderRadius: 16, padding: '13px 16px', textDecoration: 'none', ...style,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">{TYPE_EMOJI[ev.meta.type] || '📍'}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: '#E4E4E7', lineHeight: 1.35 }}>{c.banner}</span>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M1 1L7 7L1 13" stroke="#0A84FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        );
      })}
    </>
  );
}
