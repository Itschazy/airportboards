// The Yandex Metrica inline bootstrap, as a pure string.
//
// This lives apart from the component for one reason: it is the third time a change to this
// snippet has shipped a SyntaxError to production, and a string that nothing can execute is a
// string nothing can test. As its own module it is importable by scripts/check-metrica.mjs,
// which parses it, runs it against stubbed time zones, and fails the check before deploy.
//
// History, because both failures looked like "the counter is flaky" rather than "the script
// does not parse", and both cost real days of measurement:
//
//   1. Double quotes around the interpolation. In `next build` — never in `next dev` — the
//      compiler folded `...tag.js?id=${YM_ID}","ym");` and dropped everything after the
//      interpolation, leaving an unclosed IIFE. Nine days with no counter on /ru, which is
//      the only traffic the site has.
//   2. A regex written as `/^Europe\/(Moscow|…)$/` inside a TS string literal. `\/` in a
//      string literal is an escape that resolves to a plain `/`, and a bare `/` CLOSES the
//      regex literal — so the browser received an unterminated group. Shipped 2026-08-04,
//      killed the whole <script> block, counter dead for everyone including Russia.
//
// Rules for editing, all three learned the hard way:
//   - SINGLE quotes throughout, never a quote adjacent to an interpolation;
//   - no regex literals — split and compare strings instead, so nothing needs escaping;
//   - run `npm run check:metrica` after ANY edit. Dev mode renders this correctly and will
//     happily tell you a broken snippet is fine.

/** Atlantic zones that belong to the EEA (Spain, Portugal, Denmark, Iceland). */
const EEA_ATLANTIC = 'Canary Madeira Azores Faroe Reykjavik';

/** `Europe/*` zones that are NOT in the EEA/UK/CH, i.e. the ones we still measure. */
const NON_EEA_EUROPE = 'Moscow Kaliningrad Samara Volgograd Saratov Astrakhan Ulyanovsk '
  + 'Kirov Minsk Kiev Kyiv Chisinau Istanbul';

/**
 * Client-side region gate.
 *
 * Metrica never took part in the consent system: its only gate was the locale check in the
 * component, so a European reading a /ru page got _ym_uid, _ym_d and a hit before any consent
 * surface existed. Removing the cookie bar made it the only unconsented storage on the site.
 *
 * Google's tags solve this with Consent Mode's server-resolved region; Metrica has no such
 * mechanism, and a geo-IP lookup would be a network call on every page. The time zone is
 * already in the browser, costs nothing, needs no permission and no storage. Over-blocking is
 * the safe direction — the worst case is a Russian speaker in Europe going unmeasured, a
 * rounding error against ~75% of traffic being in Russia.
 *
 * Zones are compared whole, space-delimited on both sides, so no name can match as a
 * substring of another.
 */
// `+ CONST +`, never `${CONST}`. Template interpolation is the third failure mode of this
// file and it is a compiler bug, not a typo: when a quote character sits next to an
// interpolation, `next build` — and only `next build` — folds the literal and DROPS the rest
// of that fragment. Written as `(' ${EEA_ATLANTIC} ').indexOf(zone)>=0);` it shipped as
// `(' Canary Madeira Azores Faroe Reykjavikvar keep=…`: the closing quote, the `.indexOf`
// call and the `;` simply gone. Plain `+` concatenation is not folded and is what the
// counter id below has always used.
/**
 * Production host only.
 *
 * The counter fires wherever the page is rendered, including a developer's machine, and those
 * visits land in the same production report: measured 2026-08-09, 19 visits and 89 pageviews
 * from localhost:3001, :3020, :3031 and :60984. Volume is trivial; the damage is to the
 * averages, because a dev session sits open — two of those visits are 668 and 956 seconds
 * against a site average of 173, and they inflate depth the same way. Analytics that quietly
 * measures its own author is worse than no analytics.
 *
 * Matched on the END of the hostname, not anywhere inside it. `indexOf` was the first version
 * and it is subtly wrong: `airportsboard.live.evil.com` contains the domain and would have been
 * counted, so anyone proxying the site would land in our numbers. Comparing the tail keeps
 * www and any future subdomain working while a lookalike fails.
 */
const HOST_GUARD =
  `try{var hn=(location.hostname||'');`
  + `if(hn!=='airportsboard.live'&&hn.slice(-19)!=='.airportsboard.live'){return}}catch(e){}`;

export const REGION_GUARD =
  `try{var tz=(Intl.DateTimeFormat().resolvedOptions().timeZone||'');`
  + `var p=tz.split('/'),area=p[0],zone=' '+(p[1]||'')+' ';`
  + `var eea=(area==='Europe')||(area==='Atlantic'&&(' ` + EEA_ATLANTIC + ` ').indexOf(zone)>=0);`
  + `var keep=(area==='Europe')&&(' ` + NON_EEA_EUROPE + ` ').indexOf(zone)>=0;`
  + `if(eea&&!keep){return}}catch(e){}`;

/**
 * The full inline bootstrap for a counter id.
 *
 * Server-rendered into the initial HTML rather than injected after hydration: Metrica's own
 * "verify counter code" check reads the raw response (a client-injected counter reported
 * CS_ERR_UNKNOWN), and board pages are heavy enough that firing on parse rather than after
 * hydration is the difference between counting a quick visit and losing it.
 */
export function metricaSnippet(ymId: number): string {
  return (
    // Wrapped in a function so the guard's `return` aborts before anything is created.
    `(function(){` + HOST_GUARD + REGION_GUARD
    + `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};`
    + `m[i].l=1*new Date();for(var j=0;j<e.scripts.length;j++){if(e.scripts[j].src===r){return;}}`
    + `k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})`
    + `(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=` + ymId + `','ym');`
    // webvisor (full session recording — DOM mirroring, mouse, keystrokes) is deliberately
    // OFF. It is the single most invasive thing the counter can do, the privacy policy never
    // disclosed it, and it was running before any consent was asked for. Do not re-enable it
    // without disclosing it in data/legal/privacy.json and gating it behind consent.
    + `ym(` + ymId + `,'init',{ssr:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});`
    + `})();`
  );
}
