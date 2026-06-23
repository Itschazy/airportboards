import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@/lib/i18n';

export const routing = defineRouting({ locales, defaultLocale });
