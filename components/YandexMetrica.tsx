'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Yandex Metrica counter id. Not secret (it's visible in page source anyway),
// so it lives in code — no build-time env wiring needed.
// 0 = disabled (renders nothing).
export const YM_ID = 110112198;

declare global {
  interface Window { ym?: (...args: unknown[]) => void }
}

export function YandexMetrica() {
  const pathname = usePathname();
  const first = useRef(true);

  // SPA route changes don't reload the page, so send a manual hit on each
  // navigation. `init` already counts the first page, so skip it once.
  useEffect(() => {
    if (!YM_ID) return;
    if (first.current) { first.current = false; return; }
    window.ym?.(YM_ID, 'hit', window.location.href);
  }, [pathname]);

  if (!YM_ID) return null;

  return (
    <>
      <Script id="yandex-metrica" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
        ym(${YM_ID}, "init", { ssr:true, clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
      `}} />
      <noscript>
        <div><img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div>
      </noscript>
    </>
  );
}
