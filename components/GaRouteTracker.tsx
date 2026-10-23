'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

// App Router navigations are client-side and never reload, so gtag's automatic page_view
// (fired once by the config call in components/Analytics.tsx) only ever counts the landing
// page. Send an explicit page_view on each route change. Remember the pathname rather than
// the number of effect runs: StrictMode can repeat the first effect without a navigation.
// Deliberately keyed on pathname only: useSearchParams would force a Suspense boundary around
// the whole layout, and no content on this site varies by query string.
export function GaRouteTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // В Next 15 afterInteractive заранее preload-ил gtag вместе с чанками табло.
    // Создаём тег только после гидратации и с низким приоритетом. Без ожидания load,
    // idle или первого клика: короткие визиты и очередь событий сохраняют прежний
    // смысл. Старые браузеры просто игнорируют fetchPriority. Проверено исполнением
    // bootstrap/эффектов и HTML production build (check-analytics-loading).
    if (!gaId || (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`]
      || document.getElementById('ga-lib')) return;
    const script = document.createElement('script');
    script.id = 'ga-lib';
    script.async = true;
    script.fetchPriority = 'low';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(script);
    // Не удаляем тег при cleanup: библиотека и очередь общие для всей сессии,
    // повторное монтирование не должно скачивать её или посылать config повторно.
  }, [gaId]);

  useEffect(() => {
    if (!gaId) return;
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    window.gtag?.('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
      send_to: gaId,
    });
  }, [pathname, gaId]);

  return null;
}
