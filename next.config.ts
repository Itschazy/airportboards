import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
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
