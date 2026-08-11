import { getTranslations } from 'next-intl/server';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';

/**
 * Манифест приложения — на каждую локаль свой.
 *
 * Их было ноль: один манифест на двенадцать языков, целиком по-английски, и со `start_url: '/'`.
 * Из этого следовали две вещи, которые видит именно установивший приложение — то есть самый
 * лояльный читатель:
 *
 *   1. приглашение «установить» было переведено, а имя на домашнем экране оставалось
 *      «AirportsBoard.live — Live flight boards» на любом языке;
 *   2. корень отдаёт 307 по заголовку Accept-Language, поэтому запуск с домашнего экрана уводил
 *      в язык БРАУЗЕРА, а не в тот, который человек выбрал перед установкой. Замерено:
 *      Accept-Language «ja» → /ja, «ar» → /ar. Для читателя, поставившего арабскую версию на
 *      англоязычном телефоне, приложение открывалось по-английски каждый раз.
 *
 * `scope` остаётся корневым: переход по ссылке в другую локаль не должен выбрасывать человека
 * из приложения в браузер. Стартовая точка при этом своя.
 *
 * Значки не дублируются по локалям — они одинаковые, и два из них отвечают за саму
 * устанавливаемость (Chromium требует значок не меньше 192px, иначе beforeinstallprompt не
 * срабатывает и подсказка об установке не показывается на Android вовсе).
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ui' });

  const manifest = {
    name: t('pwa_app_name'),
    short_name: 'AirportsBoard',
    description: t('pwa_app_desc'),
    lang: locale,
    dir: rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr',
    start_url: `/${locale}`,
    scope: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      { src: '/icon', sizes: '48x48', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/icon1', sizes: '192x192', type: 'image/png' },
      { src: '/icon2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
