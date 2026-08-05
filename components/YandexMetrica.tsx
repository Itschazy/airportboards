import { YandexMetricaRouteTracker } from './YandexMetricaRouteTracker';
import { metricaSnippet } from '@/lib/metrica-snippet';

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

  // The bootstrap string lives in lib/metrica-snippet.ts, not here: it has shipped a
  // SyntaxError to production twice, and a string embedded in JSX is a string nothing can
  // test. As its own module it is parsed and executed against stubbed time zones by
  // `npm run check:metrica`. Read the rules at the top of that file before editing it.
  return (
    <>
      <script id="yandex-metrica" dangerouslySetInnerHTML={{ __html: metricaSnippet(YM_ID) }} />
      <noscript>
        <div><img src={`https://mc.yandex.ru/watch/${YM_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="" /></div>
      </noscript>
      <YandexMetricaRouteTracker ymId={YM_ID} />
    </>
  );
}
