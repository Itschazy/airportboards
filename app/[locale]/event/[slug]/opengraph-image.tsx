import { ImageResponse } from 'next/og';
import { getEvent, getEventSlugs } from '@/lib/event-content';

// Per-event social card: event name + the airports it covers. Deliberately text-only —
// no organiser logos, no artist imagery (trademark / right-of-publicity safe).
export const alt = 'Airports & live flight boards for the event';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return getEventSlugs().map(slug => ({ slug }));
}

export default async function EventOgImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const ev = getEvent(slug);
  const c = ev ? (ev.locales[locale] || ev.locales.en) : null;
  const heading = c?.h1 || ev?.meta.name || 'airportsboard.live';
  const place = ev ? `${ev.meta.venue} · ${ev.meta.venueCity}` : '';
  const codes = ev ? ev.meta.airports.map(a => a.iata).join('  ·  ') : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 84px',
          background: 'linear-gradient(135deg, #050505 0%, #0d0d12 55%, #0a1622 100%)',
          color: '#FFFFFF', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, color: '#0A84FF', fontWeight: 700, letterSpacing: '-0.01em' }}>
          ✈ airportsboard.live
        </div>
        <div style={{ display: 'flex', marginTop: 22, fontSize: heading.length > 52 ? 54 : 68, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          {heading}
        </div>
        {place && (
          <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: '#9AA0A6', fontWeight: 500 }}>{place}</div>
        )}
        {codes && (
          <div style={{ display: 'flex', marginTop: 26, fontSize: 42, fontWeight: 800, color: '#34C759', letterSpacing: '0.02em' }}>{codes}</div>
        )}
      </div>
    ),
    { ...size },
  );
}
