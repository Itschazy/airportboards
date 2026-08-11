import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { clientMessages } from '@/lib/client-messages';
import { notFound } from 'next/navigation';
import { locales, rtlLocales, type Locale } from '@/lib/i18n';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { YandexMetrica } from '@/components/YandexMetrica';
import { Analytics, GA_ID } from '@/components/Analytics';
import { GaRouteTracker } from '@/components/GaRouteTracker';
import { AdSense } from '@/components/AdSense';
import { CookieNotice } from '@/components/CookieNotice';
import { InstallPrompt } from '@/components/InstallPrompt';
import { adsenseClient } from '@/lib/adsense';
import '../globals.css';

// viewportFit:'cover' activates the env(safe-area-inset-*) padding used across the board
// and bottom-sheet so content clears the iPhone home indicator / notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Blend the mobile browser chrome into the site's dark background.
  themeColor: '#050505',
};

const OG_LOCALE: Record<string, string> = {
  en: 'en_US', ru: 'ru_RU', zh: 'zh_CN', ar: 'ar_AR', de: 'de_DE', ko: 'ko_KR',
  ja: 'ja_JP', fr: 'fr_FR', es: 'es_ES', it: 'it_IT', hi: 'hi_IN', tr: 'tr_TR',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL('https://airportsboard.live'),
    // Манифест на локаль. Без этого Next подставляет корневой — один английский на двенадцать
    // языков и со start_url: '/', а корень редиректит по Accept-Language, то есть установленное
    // приложение открывалось в языке БРАУЗЕРА, а не в выбранном перед установкой.
    manifest: `/${locale}/manifest.webmanifest`,
    // Site ownership proofs. `other` is where Next puts arbitrary verification meta tags;
    // Bing's must stay in place permanently — removing it un-verifies the site, not just
    // during the initial check.
    verification: { yandex: 'ea6daa0845815656', other: { 'msvalidate.01': 'B98E7EB91E5D0100462CA06CD39AA4D7' } },
    // AdSense site-verification meta tag (Google reads <meta name="google-adsense-account">
    // in <head>). Emitted only when the publisher id is configured.
    ...(adsenseClient ? { other: { 'google-adsense-account': adsenseClient } } : {}),
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
        {/* React hoists resource links into <head>. Browsers honour only a handful of
            preconnects, so they go to the origins that actually run on every locale: the
            Google tag and the ad server. Metrica's origin is warmed only where it loads. */}
        {/* The one language signal Bing actually reads (it ignores hreflang for ranking and
            uses content-language / URL / visible text). React 19 hoists meta tags rendered
            anywhere into <head>. Google ignores this tag — it costs nothing there. */}
        <meta httpEquiv="content-language" content={locale} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        {/* The ad server's preconnect is tied to the ad tag, not hardcoded: with AdSense off
            it opened a TLS connection to an origin nothing would ever request. */}
        {adsenseClient && <link rel="preconnect" href="https://pagead2.googlesyndication.com" />}
        {locale === 'ru' && <link rel="preconnect" href="https://mc.yandex.ru" />}
        {/* Consent defaults first — every Google tag below reads them as it parses. */}
        <Analytics />
        <YandexMetrica locale={locale} />
        <AdSense />
        <NextIntlClientProvider messages={clientMessages(messages)}>
          <SiteHeader locale={locale as Locale} />
          <main style={{ flex: '1 0 auto', width: '100%' }}>{children}</main>
          <SiteFooter locale={locale as Locale} />
          {/* Both overlays are OFF while AdSense review is pending (2026-08-03 rejection:
              "low value content"). Nothing may cover the content a reviewer came to read.

              The cookie bar is not merely hidden — it is not NEEDED any more. Its job was
              advertising consent, and with NEXT_PUBLIC_ADSENSE_CLIENT unset there is no ad
              tag and no Funding Choices wall. What remains is analytics, and the Consent
              Mode defaults in <Analytics/> already deny storage across the EEA, UK and CH
              by default; with no bar there is no path to grant, so a European visitor is
              measured cookielessly and has nothing to consent to. Everyone else keeps the
              granted default, exactly as before.

              Restore both together when the review passes — the bar must come back in the
              same deploy as the ad tag, or EEA visitors would get ads with no way to refuse.
          <CookieNotice locale={locale as Locale} />
          <InstallPrompt />
          */}
          {GA_ID && <GaRouteTracker gaId={GA_ID} />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
