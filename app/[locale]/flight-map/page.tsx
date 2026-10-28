import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { FlightMap } from '@/components/FlightMap';
import shell from '@/lib/flight-map/shell.json';
import copy from '@/lib/flight-map/ru.json';
import { renderInfo } from '@/lib/flight-map/content';
import './flight-map.css';

const url = 'https://airportsboard.live/ru/flight-map';
const image = { url: 'https://airportsboard.live/images/flight-map-demo.jpg', width: 1200, height: 630, alt: copy.imageAlt };
type Props = { params: Promise<{ locale: string }> };

/** Выпускаем только работающий русский инструмент. Переводы описания в ops
 * ещё не являются переводом интерфейса: 11 пустых локализованных страниц
 * нельзя объявлять в hreflang. Личная история никогда не участвует в SSR,
 * JSON-LD, canonical или картинке для поисковиков и социальных сетей.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if ((await params).locale !== 'ru') notFound();
  return {
    title: copy.title, description: copy.description, robots: { index: true, follow: true },
    alternates: { canonical: url, languages: { ru: url, 'x-default': url } },
    openGraph: { type: 'website', url, title: copy.title, description: copy.description, locale: 'ru_RU', images: [image] },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description, images: [image] },
  };
}

export default async function FlightMapPage({ params }: Props) {
  if ((await params).locale !== 'ru') notFound();
  setRequestLocale('ru');
  const data = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#page', url, name: copy.heading, description: copy.intro, inLanguage: 'ru', breadcrumb: { '@id': url + '#breadcrumb' }, mainEntity: { '@id': url + '#app' }, hasPart: { '@id': url + '#faq' } },
    // Только фактически работающие возможности. FAQ берётся из того же объекта,
    // что видимый HTML: разметка не обещает live tracking или облачную историю.
    // FAQ полезен для связности данных, но не обещает расширенный сниппет Google.
    { '@type': 'WebApplication', '@id': url + '#app', url, name: copy.heading,
      description: copy.intro, applicationCategory: 'TravelApplication', operatingSystem: 'Any',
      browserRequirements: 'Requires JavaScript', inLanguage: 'ru', isAccessibleForFree: true,
      featureList: ['Личная карта прошлых перелётов', 'История в браузере без регистрации', 'Резервная копия и восстановление JSON', 'Экспорт карты в PNG'],
    },
    { '@type': 'FAQPage', '@id': url + '#faq', inLanguage: 'ru', mainEntity: copy.faq.map((item, i) => ({
      '@type': 'Question', '@id': url + '#flight-map-question-' + (i + 1), name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })) },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AirportsBoard', item: 'https://airportsboard.live/ru' },
      { '@type': 'ListItem', position: 2, name: copy.heading, item: url },
    ] },
  ] };
  return <>
    <FlightMap html={shell.replace(/<!-- flight-map-seo:start -->[\s\S]*?<!-- flight-map-seo:end -->/, renderInfo(copy))} />
    <noscript><p style={{ textAlign: 'center', padding: 16 }}>Для карты и сохранения перелётов включите JavaScript. Описание и ответы доступны ниже карты.</p></noscript>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
  </>;
}
