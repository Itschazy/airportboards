'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * When the INSTALLED app opens on the homepage, continue to the airport the person actually
 * uses.
 *
 * A web manifest has exactly one `start_url` for the whole app, so someone who installed the
 * app while watching Sochi still cold-starts on the generic homepage — and the whole reason
 * they installed was to skip navigating there. This component closes that gap client-side:
 * in standalone display mode, on the homepage, with no explicit navigation intent, forward
 * to the most recent airport from the same `ab_recent` list the rest of the return loop
 * already maintains.
 *
 * Guards, each load-bearing:
 *  - display-mode check: browser-tab visitors are never redirected anywhere;
 *  - sessionStorage flag: the redirect happens once per app launch, so tapping the logo to
 *    reach the homepage inside the app works normally afterwards;
 *  - `replace`, not `push`: Back must not bounce through the homepage they never saw.
 */
export function StandaloneResume({ locale }: { locale: string }) {
  const router = useRouter();
  useEffect(() => {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as unknown as { standalone?: boolean }).standalone === true; // iOS Safari
      if (!standalone) return;
      if (sessionStorage.getItem('ab_resumed')) return;
      sessionStorage.setItem('ab_resumed', '1');
      const recent = JSON.parse(localStorage.getItem('ab_recent') || '[]') as { iata?: string }[];
      const iata = recent[0]?.iata;
      if (iata && /^[A-Z0-9]{3}$/.test(iata)) router.replace(`/${locale}/airport/${iata}`);
    } catch { /* storage unavailable — homepage is a fine place to be */ }
  }, [locale, router]);
  return null;
}
