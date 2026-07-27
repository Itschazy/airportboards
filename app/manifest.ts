import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AirportsBoard.live — Live flight boards',
    short_name: 'AirportsBoard',
    description: 'Live arrivals & departures boards for 6,000+ airports, in real time.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      { src: '/icon', sizes: '48x48', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      // The two below are what make the app INSTALLABLE. Chromium's installability check
      // requires an icon of at least 192px; without one, beforeinstallprompt never fires and
      // InstallPrompt.tsx (which arms only from that event) never shows on Android — 62% of
      // the audience. The 512 maskable variant feeds the launcher and splash screen.
      { src: '/icon1', sizes: '192x192', type: 'image/png' },
      { src: '/icon2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
