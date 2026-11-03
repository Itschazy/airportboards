import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LocaleLinks } from '@/components/LocaleLinks';
import { locales, type Locale } from '@/lib/i18n';
import { assertLocale } from '@/lib/locale-guard';
import { ldScript } from '@/lib/json-ld';
import { flightMapCopy } from '@/lib/flight-map/localization';
import type source from '@/lib/flight-map/help/ru.json';

const BASE = 'https://airportsboard.live';
const PATH = '/flight-map/help';
type Props = { params: Promise<{ locale: string }> };

async function content(params: Props['params']) {
  const { locale: requestedLocale } = await params;
  const locale = assertLocale(requestedLocale) as Locale;
  const [helpModule, map] = await Promise.all([
    import(`@/lib/flight-map/help/${locale}.json`),
    flightMapCopy(locale),
  ]);
  return { locale, copy: helpModule.default as typeof source, map, url: `${BASE}/${locale}${PATH}` };
}

/** Отдельная справка отвечает на задачи восстановления, импорта и публикации,
 * а не повторяет посадочную страницу инструмента. Все 12 переводов доступны
 * в исходном HTML без запуска карты или чтения личного журнала. Поэтому здесь
 * WebPage, а не фиктивный FAQPage/HowTo: разделы — обычная инструкция, и обещать
 * поисковику вопросы или специальные результаты, которых нет, нельзя.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, copy, map, url } = await content(params);
  const image = { url: `${BASE}/images/flight-map-${locale}.jpg`, width: 1200, height: 630, alt: map.imageAlt };
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(locales.map(language => [language, `${BASE}/${language}${PATH}`])),
        'x-default': `${BASE}/en${PATH}`,
      },
    },
    openGraph: { type: 'website', url, title: copy.title, description: copy.description, locale, images: [image] },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.description, images: [image] },
  };
}

export default async function FlightMapHelpPage({ params }: Props) {
  const { locale, copy, map, url } = await content(params);
  setRequestLocale(locale);
  const mapUrl = `${BASE}/${locale}/flight-map`;
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: copy.heading,
      description: copy.intro, inLanguage: locale, breadcrumb: { '@id': `${url}#breadcrumb` },
      isPartOf: { '@type': 'WebSite', '@id': `${BASE}/#website`, url: BASE, name: 'AirportsBoard' },
      about: { '@type': 'WebApplication', '@id': `${mapUrl}#app`, url: mapUrl, name: map.heading },
    },
    { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AirportsBoard', item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: map.heading, item: mapUrl },
      { '@type': 'ListItem', position: 3, name: copy.heading, item: url },
    ] },
  ] };
  // Размеры, цвета и типографика взяты из LegalArticle. Новая справка не меняет
  // стили общих страниц и не тянет runtime карты. Обычные ссылки/якоря работают
  // без JavaScript; перенос длинных технических заголовков сохраняет 320 px.
  const link = { color: 'var(--ab-0a84ff)', textDecoration: 'underline', overflowWrap: 'anywhere' } as const;
  return <>
    <article style={{ maxWidth: 760, width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '36px 18px 64px', overflowWrap: 'anywhere' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(graph)} />
      <p style={{ color: 'var(--ab-8a8a8a)', fontSize: 13, lineHeight: 1.6, margin: '0 0 10px' }}>
        <a href={`/${locale}`} style={link}>AirportsBoard</a>
        {' · '}<a href={`/${locale}/flight-map`} style={link}>{map.heading}</a>
      </p>
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', margin: '0 0 20px' }}>{copy.heading}</h1>
      <p style={{ color: 'var(--ab-d0d0d4)', fontSize: 16, lineHeight: 1.72, margin: '0 0 14px' }}>{copy.intro}</p>
      <nav aria-label={copy.heading}>
        <ul style={{ margin: '12px 0 24px', paddingInlineStart: 22 }}>
          {copy.sections.map(section => <li key={section.id} style={{ marginBottom: 8, lineHeight: 1.6 }}>
            <a href={`#${section.id}`} style={{ ...link, display: 'inline-block', paddingBlock: 8 }}>{section.title}</a>
          </li>)}
        </ul>
      </nav>
      {copy.sections.map(section => <section key={section.id} id={section.id} aria-labelledby={`help-${section.id}`} style={{ marginTop: 28, scrollMarginTop: 96 }}>
        <h2 id={`help-${section.id}`} style={{ fontSize: 18, fontWeight: 700, color: 'var(--ab-ffffff)', letterSpacing: '-0.01em', margin: '0 0 10px' }}>{section.title}</h2>
        {section.paragraphs.map((paragraph, index) => <p key={index} style={{ color: 'var(--ab-bfbfc4)', fontSize: 15.5, lineHeight: 1.72, margin: '0 0 12px' }}>{paragraph}</p>)}
      </section>)}
      <p style={{ marginTop: 28 }}><a href={`/${locale}/flight-map`} style={{ ...link, display: 'inline-block', paddingBlock: 12 }}>{copy.backLabel}</a></p>
    </article>
    <LocaleLinks locale={locale} path={PATH} />
  </>;
}
