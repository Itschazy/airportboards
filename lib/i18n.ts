export const locales = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ar'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
  zh: '中文',
  ar: 'العربية',
  de: 'Deutsch',
  ko: '한국어',
  ja: '日本語',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  hi: 'हिन्दी',
  tr: 'Türkçe',
};

/**
 * Стрелка «оттуда — туда» по ходу чтения.
 *
 * У U+2192 «→» свойство Bidi_Mirrored=No: алгоритм двунаправленного письма её НЕ разворачивает,
 * и на арабской странице она продолжает указывать вправо, то есть назад. В подвале, в заголовке
 * маршрута и на странице рейса она была вписана прямо в разметку.
 */
export const forwardArrow = (locale: string): string =>
  rtlLocales.includes(locale as Locale) ? '←' : '→';
