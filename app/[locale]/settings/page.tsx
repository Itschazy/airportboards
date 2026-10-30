import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SettingsControls } from '@/components/SettingsControls';
import { assertLocale } from '@/lib/locale-guard';
import type { Locale } from '@/lib/i18n';

type Props = { params: Promise<{ locale: string }> };

const BASE = 'https://airportsboard.live';

/**
 * Настройки: тема и язык. Прежде обе кнопки стояли в шапке, теперь у них своя страница,
 * а в шапке осталось только название сайта.
 *
 * noindex, follow. Смотреть здесь роботу нечего: вся страница — два переключателя, и во
 * всех двенадцати локалях она одна и та же. Двенадцать тонких одинаковых адресов в
 * индексе — ровно тот «бесполезный контент», за который сайт уже получил отказ 03.08.2026.
 * follow оставлен, чтобы ссылки на другие языки отсюда обходились.
 *
 * Ссылки на языки при этом НИЧЕГО не теряют: те же двенадцать адресов лежат в подвале
 * каждой страницы сайта обычными server-rendered ссылками — именно они и держат обход
 * одиннадцати неродных локалей (см. комментарий к языковому ряду в SiteFooter).
 *
 * В карту сайта не заявляется: `advertisedInSitemap` в lib/warm.ts перечисляет разделы
 * поимённо, и звать робота на noindex-адрес незачем.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  return {
    title: `${tNav('settings')} — AirportsBoard`,
    description: `${tNav('theme')} · ${tNav('language')}`,
    alternates: { canonical: `${BASE}/${locale}/settings` },
    robots: { index: false, follow: true },
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // Сверху 6, а не 18: заголовок страницы скрыт, поэтому под шапкой не стоит ни
  // строки — весь отступ читается как пустая полоса между пилюлей шапки и
  // плитками. На других страницах те же 18px держат первый заголовок.
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '6px 16px 40px', width: '100%' }}>
      {/* Скрыт визуально, но остался в разметке — см. тот же приём на /favorites. */}
      <h1 className="sr-only">{tNav('settings')}</h1>
      <SettingsControls locale={locale as Locale} />
    </main>
  );
}
