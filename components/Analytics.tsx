import Script from 'next/script';
import { adsenseClient } from '@/lib/adsense';

// Google Analytics 4 + Google Consent Mode v2.
//
// The consent defaults MUST be emitted before any Google tag (gtag.js, adsbygoogle) parses,
// which is why this is a plain inline <script> in the server-rendered HTML rather than a
// next/script with a strategy. If a tag loads first it has already decided what to store.
//
// Why consent mode at all: the target markets include Germany, France, Italy and Spain, so a
// large share of the audience is covered by the EU/UK GDPR and the ePrivacy rules. Consent
// mode lets Google resolve the visitor's region server-side from their IP, so we do not need
// geo-detection of our own — we simply declare "denied by default in the EEA/UK/CH, granted
// elsewhere" and let the tags behave accordingly until the visitor chooses.
//
// A visitor who has already chosen is restored from localStorage inside the same inline
// script, so their answer applies to the very first tag on the page rather than only after
// React hydrates.

export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? '').trim();

// EEA + UK + Switzerland. Consent mode matches these against the visitor's resolved region.
const RESTRICTED = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE',
  'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'GB', 'CH',
];

/** localStorage key holding the visitor's choice; shared with components/CookieNotice.tsx. */
export const CONSENT_KEY = 'ab_consent_v1';

export function Analytics() {
  if (!GA_ID && !adsenseClient) return null;

  const bootstrap = [
    'window.dataLayer=window.dataLayer||[];',
    'function gtag(){dataLayer.push(arguments)}',
    'window.gtag=gtag;',
    // Everywhere except the restricted region: analytics and ads allowed unless the visitor
    // opts out. security_storage is always granted — it is strictly necessary.
    `gtag('consent','default',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',personalization_storage:'granted',security_storage:'granted'});`,
    // Restricted region wins over the line above regardless of order (most specific region
    // takes precedence). wait_for_update gives the notice time to restore a stored choice.
    `gtag('consent','default',{region:${JSON.stringify(RESTRICTED)},ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});`,
    // Re-apply a previous answer before the first tag runs, so returning visitors are not
    // treated as undecided for the length of one page view.
    `try{var c=localStorage.getItem('${CONSENT_KEY}');if(c==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',personalization_storage:'granted'})}else if(c==='denied'){gtag('consent','update',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied'})}}catch(e){}`,
    `gtag('js',new Date());`,
    // send_page_view stays on: App Router route changes are reported by GaRouteTracker.
    GA_ID ? `gtag('config','${GA_ID}',{send_page_view:true});` : '',
  ].join('');

  return (
    <>
      <script id="ga-consent" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      {GA_ID && (
        <Script
          id="ga-lib"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}
