import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { FlightMap } from '@/components/FlightMap';
import shell from '@/lib/flight-map/shell-i18n.json';
import { flightMapCopy, flightMapMessages, locales, escapeHTML } from '@/lib/flight-map/localization';
import { renderInfo } from '@/lib/flight-map/content';
import './flight-map.css';

type Props = { params: Promise<{ locale: string }> };
const base = 'https://airportsboard.live';
async function content(params: Props['params']) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  const [copy, messages] = await Promise.all([flightMapCopy(locale), flightMapMessages(locale)]);
  return { locale, copy, messages, url: `${base}/${locale}/flight-map` };
}
/** Все 12 страниц содержат переведённый инструмент и помощь в исходном HTML.
 * Личный журнал не участвует в SSR, canonical, JSON-LD или публичной OG-картинке.
 * Языки ссылаются друг на друга; x-default, как в sitemap проекта, ведёт на EN.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, copy, url } = await content(params);
  const image = { url: `${base}/images/flight-map-${locale}.jpg`, width: 1200, height: 630, alt: copy.imageAlt };
  return {
    title: copy.title, description: copy.description, robots: { index: true, follow: true },
    alternates: { canonical: url, languages: { ...Object.fromEntries(locales.map(l => [l, `${base}/${l}/flight-map`])), 'x-default': `${base}/en/flight-map` } },
    openGraph: { type: 'website', url, title: copy.title, description: copy.description, locale, images: [image] },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description, images: [image] },
  };
}
export default async function FlightMapPage({ params }: Props) {
  const { locale, copy, messages, url } = await content(params);
  setRequestLocale(locale);
  const data = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#page', url, name: copy.heading, description: copy.intro, inLanguage: locale, breadcrumb: { '@id': url + '#breadcrumb' }, mainEntity: { '@id': url + '#app' }, hasPart: { '@id': url + '#faq' } },
    // Только работающие функции. FAQ дословно совпадает с доступным HTML;
    // разметка не обещает ни отслеживания самолётов, ни расширенного сниппета.
    { '@type': 'WebApplication', '@id': url + '#app', url, name: copy.heading,
      description: copy.intro, applicationCategory: 'TravelApplication', operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript', inLanguage: locale, isAccessibleForFree: true,
      featureList: [messages.m005, messages.m026, messages.m074, messages.m075, messages.m053],
    },
    { '@type': 'FAQPage', '@id': url + '#faq', inLanguage: locale, mainEntity: copy.faq.map((item, i) => ({
      '@type': 'Question', '@id': url + '#flight-map-question-' + (i + 1), name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })) },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AirportsBoard', item: `${base}/${locale}` },
      { '@type': 'ListItem', position: 2, name: copy.heading, item: url },
    ] },
  ] };
  const html = shell.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHTML(key === 'locale' ? locale : messages[key]))
    .replace(/<!-- flight-map-seo:start -->[\s\S]*?<!-- flight-map-seo:end -->/, renderInfo(copy));
  return <>
    <FlightMap key={locale} html={html} locale={locale} messages={messages} />
    <noscript><p style={{ textAlign: 'center', padding: 16 }}>{String(messages.noscript)}</p></noscript>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  </>;
}
