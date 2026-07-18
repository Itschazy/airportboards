import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { locales, defaultLocale } from '@/lib/i18n';

const intlMiddleware = createMiddleware(routing);
const LOCALES = locales as readonly string[];

export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const seg1 = pathname.split('/')[1] ?? '';
  const hasLocale = LOCALES.includes(seg1.toLowerCase());

  // A DEEP locale-less page URL (e.g. /airport/BZK) is permanent-redirected (308) to the
  // default locale, so search engines consolidate it into the /en/ URL and drop the
  // duplicate. next-intl otherwise issues a 307 (temporary) here, which let Google keep
  // the locale-less URL as its chosen canonical → GSC "Duplicate, Google chose different
  // canonical than user". The target is ALWAYS the default locale (not the detected one)
  // so the permanent redirect is deterministic and consolidates to the x-default /en/ URL
  // however a crawler fetches it. The root "/" is deliberately excluded — it keeps
  // next-intl's language-detecting temporary redirect so real visitors land in their own
  // language and can still switch it.
  if (!hasLocale && pathname !== '/') {
    const url = req.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(req) as NextResponse;
}

export const config = {
  // Exclude app-root metadata routes (no file extension, so the default dot-rule misses
  // them) — otherwise next-intl prefixes them with a locale (/opengraph-image →
  // /en/opengraph-image) which doesn't exist → 404, breaking OG images, icons, manifest.
  matcher: ['/((?!api|_next|_vercel|opengraph-image|icon|apple-icon|manifest|sitemap|robots|.*\\..*).*)'],
};
