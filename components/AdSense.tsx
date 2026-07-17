import { adsenseClient } from '@/lib/adsense';

// Google AdSense loader. Rendered server-side (present in the SSR HTML, like
// YandexMetrica) so AdSense's verification and Auto ads work without depending on
// client hydration. React 19 hoists this async src <script> into <head> and dedupes it.
//
// Renders NOTHING until NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXXXXXXXXXXXXXX) is set at
// build time, so the live site is unchanged until you flip the env and redeploy.
// With the loader present and Auto ads enabled in the AdSense console, no manual
// <ins class="adsbygoogle"> units are required.
export function AdSense() {
  if (!adsenseClient) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
    />
  );
}
