import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { YandexMetrica } from '@/components/YandexMetrica';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://airportsboard.live'),
  verification: { yandex: 'ea6daa0845815656' },
  // Site-wide social defaults — every page inherits these (og:image/twitter:image come
  // automatically from app/opengraph-image.tsx); child pages add their own title/desc.
  openGraph: { type: 'website', siteName: 'AirportsBoard.live' },
  twitter: { card: 'summary_large_image' },
};

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
          {children}
          <SiteFooter locale={locale as Locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
