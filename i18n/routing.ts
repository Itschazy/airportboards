import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@/lib/i18n';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // We emit the authoritative hreflang cluster in <head> via generateMetadata. Disable
  // next-intl's auto `Link` response header: it advertised an x-default pointing at the
  // locale-less /airport/X URL, which 307-redirects — an invalid hreflang annotation.
  alternateLinks: false,
});
