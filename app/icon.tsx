import { ImageResponse } from 'next/og';

// Branded favicon. Auto-wired by Next as <link rel="icon">.
export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A84FF',
          color: '#FFFFFF',
          fontSize: 32,
        }}
      >
        ✈
      </div>
    ),
    { ...size },
  );
}
