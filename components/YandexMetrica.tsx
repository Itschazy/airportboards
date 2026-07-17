import { YandexMetricaRouteTracker } from './YandexMetricaRouteTracker';

// Yandex Metrica counter id. Not secret (it's visible in page source anyway),
// so it lives in code — no build-time env wiring needed.
// 0 = disabled (renders nothing).
export const YM_ID = 110112198;

// The counter bootstrap is rendered as a plain inline <script> from this SERVER component,
// so it lands in the initial SSR HTML instead of being injected client-side after hydration
// (as next/script `afterInteractive` did). Two reasons:
//   1. Metrika's automated "verify counter code" check reads the raw HTML — with a
//      client-injected counter it reported CS_ERR_UNKNOWN. Server-rendered code passes it.
//   2. Board pages are heavy SSR; firing the hit on page parse (not after the client bundle
//      hydrates) means visitors who leave quickly are still counted.
// SPA route-change hits are handled by the small client child below.
export function YandexMetrica() {
  if (!YM_ID) return null;

  const bootstrap =
    `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};` +
    `m[i].l=1*new Date();for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return;}}` +
    `k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})` +
    `(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}","ym");` +
    `ym(${YM_ID},"init",{ssr:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:true});`;

  return (
    <>
      <script id="yandex-metrica" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <noscript>
        <div><img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div>
      </noscript>
      <YandexMetricaRouteTracker ymId={YM_ID} />
    </>
  );
}
