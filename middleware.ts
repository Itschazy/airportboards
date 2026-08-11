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
    const res = NextResponse.redirect(url, 308);
    // Этот редирект ДЕТЕРМИНИРОВАН — цель всегда локаль по умолчанию, от языка браузера он
    // не зависит (см. выше), поэтому кэшировать его можно жёстко и общим кэшем в том числе.
    res.headers.set('Cache-Control', 'public, max-age=86400');
    return res;
  }

  const res = intlMiddleware(req) as NextResponse;

  // А вот корень — НАОБОРОТ: next-intl выбирает язык по Accept-Language и cookie NEXT_LOCALE,
  // то есть на один и тот же URL «/» отвечает по-разному разным людям. Заголовков кэша у
  // этого ответа не было вовсе, и Vary тоже, а значит первый же CDN запомнил бы редирект
  // первого зашедшего и отдал бы его всем: москвич увёл бы японца на /ru, японец москвича
  // на /ja. Пока общего кэша нет, это ничего не стоит и ничего не чинит — но поставить его
  // перед сайтом, не закрыв эту дыру, нельзя, а закрывать её надо ДО, а не после.
  //
  // no-store, а не один Vary: Accept-Language — заголовок длинный и почти уникальный у
  // каждого браузера, так что вариантов в кэше было бы столько же, сколько посетителей, а
  // попаданий ноль. Проще не кэшировать: корень видят 0.48% хитов (~80 в месяц), и каждый
  // из них всё равно уезжает редиректом на страницу, которая кэшируется нормально.
  if (pathname === '/') {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Vary', 'Accept-Language, Cookie');
  }

  return res;
}

export const config = {
  // Exclude app-root metadata routes (no file extension, so the default dot-rule misses
  // them) — otherwise next-intl prefixes them with a locale (/opengraph-image →
  // /en/opengraph-image) which doesn't exist → 404, breaking OG images, icons, manifest.
  matcher: ['/((?!api|_next|_vercel|embed|opengraph-image|icon|apple-icon|manifest|sitemap|robots|.*\\..*).*)'],
};
