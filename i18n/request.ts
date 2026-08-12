import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { baseLocale, numLocale } from '@/lib/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  // baseLocale снимает расширение -u-nu-… : его возвращает getLocale() (см. ниже), и если
  // такое значение придёт сюда обратно — а оно приходит, next-intl прокидывает локаль по
  // кругу, — то проверка по списку не пройдёт и страница молча уедет на английский.
  let locale = baseLocale((await requestLocale) ?? '');
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  return {
    // Каталог берётся по ЧИСТОМУ коду, а форматирование — по локали с явной системой
    // счисления. Разделение существенно: messages/ar-u-nu-latn.json не существует, а
    // Intl.NumberFormat('ar') без расширения даёт разный результат на разных хостах
    // (см. NUMERAL_SYSTEM в lib/i18n.ts).
    locale: numLocale(locale),
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
