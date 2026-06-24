import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { YandexMetrica } from '@/components/YandexMetrica';
import '../globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://airportsboard.live'),
  verification: { yandex: 'ea6daa0845815656' },
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
    <html lang={locale} dir={dir} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <YandexMetrica />
        <NextIntlClientProvider messages={messages}>
          <SiteHeader locale={locale as Locale} />
          {children}
          <footer style={{
            borderTop: '1px solid #1A1A1A',
            padding: '1.25rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.6875rem',
            color: '#3A3A3C',
            letterSpacing: '0.02em',
          }}>
            airportsboard.live · © 2026
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
