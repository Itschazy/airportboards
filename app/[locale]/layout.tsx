import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { YandexMetrica } from '@/components/YandexMetrica';
import '../globals.css';

// viewportFit:'cover' activates the env(safe-area-inset-*) padding used across the board
// and bottom-sheet so content clears the iPhone home indicator / notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US', ru: 'ru_RU', zh: 'zh_CN', ar: 'ar_AR', de: 'de_DE', ko: 'ko_KR',
  ja: 'ja_JP', fr: 'fr_FR', es: 'es_ES', it: 'it_IT', hi: 'hi_IN', tr: 'tr_TR',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL('https://airportsboard.live'),
    verification: { yandex: 'ea6daa0845815656' },
    // Site-wide social defaults — every page inherits these (og:image/twitter:image come
    // automatically from app/opengraph-image.tsx); child pages add their own title/desc.
    openGraph: {
      type: 'website',
      siteName: 'AirportsBoard.live',
      locale: OG_LOCALE[locale] || 'en_US',
      alternateLocale: locales.filter(l => l !== locale).map(l => OG_LOCALE[l]),
    },
    twitter: { card: 'summary_large_image' },
  };
}

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const dir = rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <YandexMetrica />
        <NextIntlClientProvider messages={messages}>
          <SiteHeader locale={locale as Locale} />
          <main style={{ flex: '1 0 auto', width: '100%' }}>{children}</main>
          <SiteFooter locale={locale as Locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
