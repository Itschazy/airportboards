import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
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
