import { ImageResponse } from 'next/og';

/**
 * 512×512 maskable PWA icon — the splash-screen and launcher asset.
 *
 * `purpose: maskable` (declared in manifest.ts) lets Android crop this into any launcher
 * shape, so the glyph sits inside the safe zone: maskable spec reserves the outer 20% for
 * cropping, hence the glyph at ~55% of the canvas rather than edge to edge. Same brand block
 * as app/icon.tsx — one visual identity from favicon to splash.
 */
export const size = { width: 512, height: 512 };
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
          fontSize: 280,
        }}
      >
        ✈
      </div>
    ),
    { ...size },
  );
}
