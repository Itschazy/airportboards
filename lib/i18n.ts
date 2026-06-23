export const locales = ['en', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const rtlLocales: Locale[] = ['ar'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  de: 'Deutsch',
  ko: '한국어',
  ja: '日本語',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  hi: 'हिन्दी',
};
