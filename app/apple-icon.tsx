import { ImageResponse } from 'next/og';

// Branded apple-touch-icon (iOS home-screen / bookmark). Auto-wired by Next.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0A84FF 0%, #0a1622 100%)',
          color: '#FFFFFF',
          fontSize: 110,
        }}
      >
        ✈
      </div>
    ),
    { ...size },
  );
}
