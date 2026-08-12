import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { locales } from '@/lib/i18n';
import { assertLocale } from '@/lib/locale-guard';

/**
 * Любой несуществующий адрес внутри локали — на локализованную страницу 404.
 *
 * Без этого сегмента `/de/nope` не совпадал НИ С ОДНИМ маршрутом, и Next показывал свою
 * встроенную заглушку: «404: This page could not be found» чёрным по белому, по-английски, без
 * шапки и подвала — на немецкой, арабской, японской версии одинаково. Причём соседний
 * `/de/airport/ZZZ` уже отдавал нормальную немецкую страницу, потому что там notFound()
 * вызывается из кода маршрута. Разница читателю необъяснима.
 *
 * Сегмент ловит только то, что не подошло ни к чему другому: в Next более конкретный сегмент
 * всегда выигрывает у catch-all, поэтому ни /de/airport/FRA, ни /de/manifest.webmanifest сюда
 * не попадают.
 *
 * Статус остаётся 404, так что поисковику ничего не меняется — он и раньше читал код ответа,
 * а не текст.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale, rest: ['404'] }));
}

export default async function CatchAll({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locales.includes(locale as (typeof locales)[number])) setRequestLocale(assertLocale(locale));
  notFound();
}
