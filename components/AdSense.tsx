import { adsenseClient } from '@/lib/adsense';

// Google AdSense loader. Rendered server-side (present in the SSR HTML, like YandexMetrica)
// so AdSense's verification and Auto ads work without depending on client hydration.
//
// `defer`, not `async`, and that is load-bearing. React 19 hoists `async` src scripts into
// <head>; this inline consent script in components/Analytics.tsx is not hoisted and stays in
// <body>. Measured on /de/airport/MUC: the async tag landed at byte 840 (head) and the consent
// defaults at 5172 (body), so adsbygoogle.js could execute before consent mode was configured
// and would then be free to store and personalise for an EEA visitor who never agreed.
// A `defer` script is not hoisted, stays in document order after <Analytics />, and runs once
// parsing is done — which also keeps ad injection out of the critical render path.
//
// Renders NOTHING until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXXXXXXXXXXXXXX) is set at
// build time, so the live site is unchanged until you flip the env and redeploy.
// With the loader present and Auto ads enabled in the AdSense console, no manual
// <ins class="adsbygoogle"> units are required.
export function AdSense() {
  if (!adsenseClient) return null;
  return (
    <script
      defer
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
    />
  );
}
