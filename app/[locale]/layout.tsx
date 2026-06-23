import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import '../globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://airportboards.live'),
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) notFound();
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale as Locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body>
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
            airportboards.live · © 2026
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
