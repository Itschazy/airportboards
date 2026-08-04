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
export function YandexMetrica({ locale }: { locale: string }) {
  // Russian-locale visitors only. tag.js is ~93 KB gzip — roughly 70% of the site's entire
  // first-party JS — and Metrica measures a market that AdSense cannot monetise, so loading
  // it for a reader in Germany or Canada is a pure cost. Google Analytics covers those.
  if (!YM_ID || locale !== 'ru') return null;

  // ── EEA/UK/CH: do not load at all ────────────────────────────────────────────────────
  //
  // Metrica never took part in the consent system. Its only gate was the locale check above,
  // so a European reading a /ru page got _ym_uid, _ym_d and a hit before any consent surface
  // existed. That was already true; removing the cookie bar (see app/[locale]/layout.tsx)
  // makes it the ONLY unconsented storage on the site, so it has to go.
  //
  // Google's tags solve this with Consent Mode's server-resolved region. Metrica has no such
  // mechanism, and asking a geo-IP service would be a network call on every page. The time
  // zone is already in the browser, costs nothing, needs no permission and no storage — and
  // over-blocking is the safe direction: the worst case is a Russian-speaking reader in
  // Europe going unmeasured, which is a rounding error against 77% of traffic being in
  // Russia and a legal exposure being closed.
  //
  // Bare IIFE rather than a hook so this stays a server component: the string below must be
  // in the SSR HTML (Metrica's own verification reads the raw response), and the guard has
  // to run in the browser, so it wraps the bootstrap instead of gating the render.
  const regionGuard =
    `try{var tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'');` +
    `if(/^(Europe|Atlantic\/(Canary|Madeira|Azores|Faroe|Reykjavik))/.test(tz)` +
    `&&!/^Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Astrakhan|Ulyanovsk|Kirov|Minsk|Kiev|Kyiv|Chisinau|Istanbul)$/.test(tz)){return}}catch(e){}`;

  // SINGLE quotes throughout, and no quote character adjacent to an interpolation.
  //
  // This was written with double quotes and shipped broken to production for nine days. In a
  // `next build` — but never in `next dev` — the compiler folding
  // `...tag.js?id=${YM_ID}","ym");` dropped everything after the interpolation, emitting
  //
  //   ...,"script","https://mc.yandex.ru/metrika/tag.js?id=110112198ym(110112198,"init",{…});
  //
  // The `","ym");` is simply gone: the IIFE never closes, quotes are unbalanced (five of them),
  // parens are 13 open against 12 close. That is a hard SyntaxError, so the counter never ran
  // at all on any /ru page — which is the only traffic the site actually has. Metrika's own API
  // reported code_status CS_ERR_UNKNOWN and 18 visits for the month, and it was read as "the
  // verification check is flaky" rather than "the script does not parse".
  //
  // Reproduced deliberately before fixing: `rm -rf .next && npm run build` puts the mangled
  // form into .next/server/app/ru.html and into the RSC payload, so the damage happens at
  // compile time, not in transit. Single quotes need no escaping and leave nothing next to a
  // `}` for the folder to trip over. If this file is ever edited, verify against a real BUILD —
  // dev mode renders it correctly and will tell you it is fine.
  const bootstrap =
    // Wrapped in a function so the guard's `return` aborts before anything is created.
    `(function(){` + regionGuard +
    `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};` +
    `m[i].l=1*new Date();for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return;}}` +
    `k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})` +
    `(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=` + YM_ID + `','ym');` +
    // webvisor (full session recording — DOM mirroring, mouse, keystrokes) is deliberately
    // OFF. It is the single most invasive thing the counter can do, the privacy policy never
    // disclosed it, and it was running before any consent was asked for. Do not re-enable it
    // without disclosing it in data/legal/privacy.json and gating it behind consent.
    `ym(` + YM_ID + `,'init',{ssr:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});` +
    `})();`;

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
