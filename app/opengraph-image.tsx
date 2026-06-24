import { ImageResponse } from 'next/og';

// Default social-share image for the whole site. The file-convention placement at the
// app root means Next attaches og:image + twitter:image to EVERY route automatically,
// so shares on social/messengers and SERP/Discover cards get a branded thumbnail.
export const alt = 'airportsboard.live — live flight boards';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 90px',
          background: 'linear-gradient(135deg, #050505 0%, #0d0d12 55%, #0a1622 100%)',
          color: '#FFFFFF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, color: '#0A84FF', fontWeight: 700, letterSpacing: '-0.01em' }}>
          ✈ airportsboard.live
        </div>
        <div style={{ marginTop: 26, fontSize: 84, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.02 }}>
          Live flight boards
        </div>
        <div style={{ marginTop: 22, fontSize: 38, color: '#9AA0A6', fontWeight: 500 }}>
          Arrivals &amp; departures · 6,000+ airports · real-time
        </div>
      </div>
    ),
    { ...size },
  );
}
