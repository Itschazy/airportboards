'use client';

import { useEffect, useRef } from 'react';
import { track, GOALS } from '@/lib/track';

/** Сервер отдаёт готовые подписи и FAQ, клиент подключает только журнал.
 * Карта не добавляет свой JS/каталог к табло. Модуль загружается при открытии
 * маршрута; abort снимает обработчики при переходе назад/в другой раздел.
 * HTML — наш проверенный шаблон, не содержимое backup или пользовательский ввод.
 */
export function FlightMap({ html, locale, messages }: { html: string; locale: string; messages: Record<string, unknown> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current!;
    const controller = new AbortController();
    const events = {
      open: GOALS.flightMapOpen, saved: GOALS.flightMapSaved,
      export: GOALS.flightMapExport, backup: GOALS.flightMapBackup,
      restore: GOALS.flightMapRestore,
    };
    // Каждый runtime связан со своей HTML-оболочкой. v1/v2/v3 остаются доступны
    // старому ISR и открытым вкладкам; v4 получает только текущий словарь.
    const moduleURL = '/flight-map/v4/app.js';
    import(/* webpackIgnore: true */ moduleURL)
      .then(m => {
        if (controller.signal.aborted) return;
        return m.mount(root, {
          signal: controller.signal, locale, messages,
          // Явный allowlist: номера, аэропорты, даты, ID и содержимое файлов
          // не попадают в аналитику даже при расширении клиентского модуля.
          track: (event: keyof typeof events, data?: Record<string, string>) => {
            if (!events[event]) return;
            track(events[event], {
              locale, release: process.env.NEXT_PUBLIC_RUM_RELEASE || 'unknown',
              ...(data?.export_kind && ['map', 'year', 'flight'].includes(data.export_kind) ? { export_kind: data.export_kind } : {}),
              ...(data?.format && ['story', 'square'].includes(data.format) ? { format: data.format } : {}),
            });
          },
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        root.removeAttribute('aria-busy');
        const status = root.querySelector('#storageStatus');
        if (status) status.textContent = String(messages.loadError);
        const retry = document.createElement('a');
        retry.href = `/${locale}/flight-map`;
        retry.dataset.retry = 'true';
        retry.textContent = String(messages.retry);
        status?.after(retry);
      });
    return () => controller.abort();
  }, [locale, messages]);
  return <div ref={ref} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flight-map-root ym-hide-content" aria-busy="true"
    dangerouslySetInnerHTML={{ __html: html }} />;
}
