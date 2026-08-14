import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WidgetBuilder } from '@/components/WidgetBuilder';
import { locales } from '@/lib/i18n';
import { assertLocale } from '@/lib/locale-guard';

const BASE = 'https://airportsboard.live';

/**
 * The hub of the widget programme: pick an airport, copy the embed code.
 *
 * This page carries the whole outreach motion — every conversation with a hotel, transfer
 * service or travel blog ends with this URL, so it has to work as a landing page: one
 * sentence of what it is, the generator, the licence note, nothing else. avionio links its
 * equivalent from every airport page and has been earning links with it since 2019; ours is
 * linked from the footer of every page for the same reason.
 */

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations({ locale, namespace: 'home' });
  const canonical = `${BASE}/${locale}/widgets`;
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/widgets`;
  languages['x-default'] = `${BASE}/en/widgets`;
  return {
    title: t('widgets_title'),
    description: t('widgets_meta'),
    alternates: { canonical, languages },
    robots: { index: true, follow: true },
  };
}

export default async function WidgetsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations({ locale, namespace: 'home' });

  /**
   * Единственная страница в карте сайта, у которой не было НИКАКОЙ разметки.
   *
   * WebApplication здесь не украшение и не натяжка: страница отдаёт работающий инструмент —
   * выбрал аэропорт, скопировал код, вставил к себе, — а не рассказывает о нём. Тип описывает
   * ровно это. Цена бесплатная и сказана прямо, потому что для встраиваемого виджета это
   * первое, что спрашивают.
   *
   * Имя и описание берутся ИЗ ТЕХ ЖЕ ключей, что заголовок вкладки и h1 — новых строк не
   * заводится ни одной, и разметка не может разойтись с тем, что на экране.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: t('widgets_title'),
    description: t('widgets_meta'),
    url: `${BASE}/${locale}/widgets`,
    inLanguage: locale,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'AirportsBoard', url: BASE },
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: 0 }}>
        {t('widgets_title')}
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: '#B4B4B4', margin: '12px 0 6px' }}>
        {t('widgets_intro')}
      </p>
      <WidgetBuilder locale={locale} />
      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#8A8A8A', marginTop: 26 }}>
        {t('widgets_note')}
      </p>
    </main>
  );
}
