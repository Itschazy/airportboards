import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/i18n';

/**
 * Проверяет, что сегмент [locale] — действительно одна из наших двенадцати локалей, и
 * отдаёт 404, если нет. Возвращает её же, чтобы вызов композировался:
 *
 *     setRequestLocale(assertLocale(locale));
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ПРОВЕРКА, ЕСЛИ ОНА УЖЕ ЕСТЬ В LAYOUT.
 *
 * Сайт отдавал HTTP 500 вместо 404 на любой путь с точкой:
 *
 *     /apple-touch-icon.png   /site.webmanifest   /browserconfig.xml
 *     /wp-login.php           /foo.bar/airports   /foo.bar/airport/JFK
 *
 * Матчер middleware намеренно пропускает пути с точкой (`.*\..*`), чтобы не префиксовать
 * локалью метаданные вроде /favicon.ico. Такой путь доходит до маршрутизатора, совпадает с
 * `/[locale]`, и локалью становится сама строка «apple-touch-icon.png». Проверка в
 * app/[locale]/layout.tsx есть, но layout и page рисуются ПАРАЛЛЕЛЬНО, и
 * `Number.toLocaleString('apple-touch-icon.png')` на главной успевает бросить
 * `RangeError: Incorrect locale information provided` раньше, чем сработает notFound().
 *
 * Неверная локаль БЕЗ точки этого не вызывает: её ловит middleware и уводит редиректом
 * (`/zz` → 308). Поэтому дефект не показывался при обычной проверке — он живёт ровно в той
 * щели, которую middleware обходит намеренно.
 *
 * Кому это стоило. Перечисленные пути — типовые пробы: apple-touch-icon запрашивает iOS,
 * browserconfig.xml — Windows, wp-login.php — сканеры. Каждый такой ответ Google засчитывает
 * как отказ сервера, и в Search Console горит ровно этот флаг: «Server connectivity —
 * высокий процент отказов за неделю». Отказ хоста тормозит обход ВСЕГО сайта, а не одной
 * страницы, — на домене, у которого и так проиндексирована шестая часть, это дорого.
 *
 * ЧЕГО ЗДЕСЬ НЕ СДЕЛАНО И ПОЧЕМУ. Напрашивается `export const dynamicParams = false` в
 * layout — одна строка вместо шестнадцати вызовов. Я так и сделал, собрал и проверил:
 * ограничение КАСКАДИРУЕТ на вложенные динамические сегменты. `/ru/airport/AAF` стал 404,
 * `/en/airport/AAO` — 404, и даже `/ru/airport/KZN/arrivals` — 404, то есть подстраница
 * самой посещаемой страницы сайта. Уцелело бы только то, что попало в generateStaticParams
 * верхнего яруса. Откачено.
 */
export function assertLocale(locale: string): string {
  if (!locales.includes(locale as Locale)) notFound();
  return locale;
}
