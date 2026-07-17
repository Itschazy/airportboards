import { ImageResponse } from 'next/og';
import { getAirport } from '@/lib/airports';

// Node runtime: getAirport() reads the bundled airport JSON via fs (not available on Edge).
export const runtime = 'nodejs';
export const alt = 'AirportsBoard — live flight board';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Per-airport social card. Text is the English source data (IATA + name + city/country),
// so the default Satori font renders it cleanly for every locale without embedding
// Cyrillic/CJK/Arabic fonts. One distinctive card per airport → far better share CTR
// than the single site-wide OG image it overrides.
export default async function Image({ params }: { params: Promise<{ locale: string; iata: string }> }) {
  const { iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  const code = airport?.iata ?? iata.toUpperCase();
  const name = airport?.name ?? 'Airport';
  const place = airport ? [airport.city, airport.country].filter(Boolean).join(', ') : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#050505',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 30, color: '#8A8A8A' }}>
          <span style={{ marginRight: 14 }}>✈</span>
          <span style={{ color: '#E4E4E7', fontWeight: 700 }}>airportsboard.live</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 230, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, letterSpacing: '-8px' }}>
            {code}
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: '#E4E4E7', marginTop: 24, maxWidth: 1050 }}>
            {name}
          </div>
          {place ? (
            <div style={{ fontSize: 34, color: '#8A8A8A', marginTop: 12 }}>{place}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: '#0A84FF', fontWeight: 600 }}>
          Live arrivals &amp; departures · updated every minute
        </div>
      </div>
    ),
    { ...size },
  );
}
