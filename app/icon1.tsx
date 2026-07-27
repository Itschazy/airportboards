import { ImageResponse } from 'next/og';

/**
 * 192×192 PWA icon.
 *
 * Not decoration — installability. Chromium fires `beforeinstallprompt` only when the
 * manifest carries an icon of at least 192px, and until this file existed the manifest's
 * largest was 180×180. InstallPrompt.tsx arms itself exclusively from that event, so the
 * install card had never once been shown to the 62% of the audience on Android: fully
 * written, fully dead. For a site whose core use is checking the same board three to five
 * times a day, home-screen installation is the retention loop — and it was disabled by a
 * missing PNG.
 */
export const size = { width: 192, height: 192 };
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
          fontSize: 128,
        }}
      >
        ✈
      </div>
    ),
    { ...size },
  );
}
