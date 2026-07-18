import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Drop the `X-Powered-By: Next.js` header — leaks the stack, no benefit.
  poweredByHeader: false,
  // Force blocking (non-streaming) metadata for EVERY user-agent. Next 15 streams
  // <head> metadata into the <body> for non-bot UAs (and even the main Googlebot,
  // which it trusts to hoist via JS). On a cache-miss/dynamic render of our SSR
  // flight pages that pushes canonical + hreflang + title out of <head> — where
  // crawlers that don't run JS (and Google's first indexing wave) simply ignore them.
  // generateMetadata on the high-traffic airport pages only does fs reads, so blocking
  // it is essentially free. `/./` matches any non-empty UA → metadata always in <head>.
  htmlLimitedBots: /./,
  // www is a full duplicate of the site (nginx serves the app on both hosts). Send a
  // single permanent redirect www.* → apex so crawlers don't split signals / waste budget.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.airportsboard.live' }],
        destination: 'https://airportsboard.live/:path*',
        permanent: true,
      },
    ];
  },
  // HSTS — pin HTTPS for a year (http→https already 301s at nginx).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Cheap, no-downside hardening. Deliberately NO Content-Security-Policy: AdSense
          // moderation is pending and an enforced policy is the classic way to break ad
          // script injection right when it matters.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // Boards now state how old their data is, so they must not be served from cache for
        // months. `revalidate = 300` makes Next derive stale-while-revalidate=31535700 —
        // just under a YEAR — which means an infrequent AI crawler can be handed HTML whose
        // "Updated 4 minutes ago" and dateModified were true last winter. Cap the stale
        // window at one revalidate period: still absorbs a thundering herd, cannot lie.
        source: '/:locale/airport/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
    ];
  },
  // The small prod VDS runs low on disk during build (webpack PackFileCache churn +
  // SSR-embedded flight data → "ENOENT pages-manifest.json"). Disable the webpack
  // filesystem cache: useless here anyway (deploy does `rm -rf node_modules` each
  // build, so the cache is always cold) and it's the main disk hog during build.
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
