import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude app-root metadata routes (no file extension, so the default dot-rule misses
  // them) — otherwise next-intl prefixes them with a locale (/opengraph-image →
  // /en/opengraph-image) which doesn't exist → 404, breaking OG images, icons, manifest.
  matcher: ['/((?!api|_next|_vercel|opengraph-image|icon|apple-icon|manifest|sitemap|robots|.*\\..*).*)'],
};
