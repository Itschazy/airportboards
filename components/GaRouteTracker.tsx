'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

// App Router navigations are client-side and never reload, so gtag's automatic page_view
// (fired once by the config call in components/Analytics.tsx) only ever counts the landing
// page. Send an explicit page_view on each route change. The first effect run is skipped so
// the landing page is not counted twice — the ref also absorbs StrictMode's double-invoke.
// Deliberately keyed on pathname only: useSearchParams would force a Suspense boundary around
// the whole layout, and no content on this site varies by query string.
export function GaRouteTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!gaId) return;
    if (first.current) { first.current = false; return; }
    window.gtag?.('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_to: gaId,
    });
  }, [pathname, gaId]);

  return null;
}
