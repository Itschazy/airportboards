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
