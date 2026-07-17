'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { ym?: (...args: unknown[]) => void }
}

// App Router navigations are client-side and don't reload the page, so send a manual
// `hit` on each route change. The server-rendered bootstrap's `init` already counts the
// first page, so skip the initial effect run (StrictMode double-invoke is also covered
// by the ref, so we never double-count the landing page).
export function YandexMetricaRouteTracker({ ymId }: { ymId: number }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!ymId) return;
    if (first.current) { first.current = false; return; }
    window.ym?.(ymId, 'hit', window.location.href);
  }, [pathname, ymId]);

  return null;
}
