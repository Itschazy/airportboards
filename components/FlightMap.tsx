'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { applyInitialMapLayout } from '@/lib/flight-map/layout-hint';
import { track, GOALS } from '@/lib/track';

/** Сервер отдаёт готовые подписи и FAQ, клиент подключает только журнал.
 * Карта не добавляет свой JS/каталог к табло. Модуль загружается при открытии
 * маршрута; abort снимает обработчики при переходе назад/в другой раздел.
 * HTML — наш проверенный шаблон, не содержимое backup или пользовательский ввод.
 */
export function FlightMap({ html, locale, messages, runtimeUrl }: { html: string; locale: string; messages: Record<string, unknown>; runtimeUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { applyInitialMapLayout(ref.current); }, [locale]);
  useEffect(() => {
    const root = ref.current!;
    let cancelled = false;
    let session: { dispose: () => void } | null = null;
    const events = {
      open: GOALS.flightMapOpen, saved: GOALS.flightMapSaved,
      export: GOALS.flightMapExport, backup: GOALS.flightMapBackup,
      restore: GOALS.flightMapRestore,
    };
    // SSR мог уже запустить карту: boot принимает существующий остров.
    // Каждый runtime связан со своей HTML-оболочкой. v1/v2/v3/v4/v5/v6 остаются доступны
    // старому ISR и открытым вкладкам; v9 загружает полный словарь одним сжатым ответом; опубликованные v1–v8 неизменяемы.
    // Адрес с отпечатком сборки приходит со страницы: оба обращения к движку
    // должны идти по одному адресу, иначе браузер скачает его дважды.
    const moduleURL = runtimeUrl;
    import(/* webpackIgnore: true */ moduleURL)
      .then(m => {
        // Поздний import старого effect не должен отменять новый effect того же DOM.
        if (cancelled) { if (!root.isConnected) m.stop(root); return; }
        const active = m.boot(root);
        session = active;
        active.attachTrack(
          // Явный allowlist: номера, аэропорты, даты, ID и содержимое файлов
          // не попадают в аналитику даже при расширении клиентского модуля.
          (event: keyof typeof events, data?: Record<string, string>) => {
            if (!events[event]) return;
            track(events[event], {
              locale, release: process.env.NEXT_PUBLIC_RUM_RELEASE || 'unknown',
              ...(data?.export_kind && ['map', 'year', 'flight'].includes(data.export_kind) ? { export_kind: data.export_kind } : {}),
              ...(data?.format && ['story', 'square'].includes(data.format) ? { format: data.format } : {}),
            });
          }
        );
      })
      .catch(() => {
        if (cancelled) return;
        root.removeAttribute('aria-busy');
        // Кнопку «Добавить перелёт» runtime включает до загрузки каталога,
        // чтобы она не моргала. Раз загрузка не удалась, открывать нечего —
        // гасим её обратно, иначе нажатие молча не делало бы ничего.
        root.querySelectorAll('[data-action="add"]').forEach(b => {
          (b as HTMLButtonElement).disabled = true;
          b.removeAttribute('aria-busy');
        });
        const status = root.querySelector('#storageStatus');
        if (status) {
          status.textContent = String(messages.loadError);
          // До первого перелёта служебные строки спрятаны стилем, а про сбой
          // человеку сказать обязаны: по этой пометке правило перестаёт совпадать.
          (status as HTMLElement).dataset.error = 'true';
        }
        const retry = document.createElement('a');
        retry.href = `/${locale}/flight-map`;
        retry.dataset.retry = 'true';
        retry.textContent = String(messages.retry);
        status?.after(retry);
      });
    return () => { cancelled = true; session?.dispose(); };
  }, [locale, messages]);
  return <div ref={ref} suppressHydrationWarning lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="flight-map-root ym-hide-content" aria-busy="true"
    data-flight-map-version="9" data-map-config={JSON.stringify({ locale, messages })}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
