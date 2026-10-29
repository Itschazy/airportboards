import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FavoriteList } from '@/components/FavoriteList';
import { assertLocale } from '@/lib/locale-guard';

type Props = { params: Promise<{ locale: string }> };

const BASE = 'https://airportsboard.live';

/**
 * Личный список аэропортов читателя.
 *
 * noindex, follow — и это НЕ осторожность, а единственно верное описание страницы: её
 * содержимое лежит в localStorage устройства, то есть у робота она пуста всегда и во всех
 * двенадцати локалях одинаково. Двенадцать одинаковых пустых адресов в индексе — ровно тот
 * «бесполезный контент», за который сайт уже получил отказ 03.08.2026. follow оставлен:
 * ссылки отсюда (хлебные крошки на главную) обходить можно.
 *
 * В карту сайта страница не заявляется: `advertisedInSitemap` в lib/warm.ts перечисляет
 * разделы поимённо, и добавлять сюда нечего — заявлять в карте noindex-адрес значит просить
 * робота прийти туда, откуда его же и выгоняют.
 *
 * hreflang-кластера тоже нет: он сообщает поиску, какую из версий показать человеку, а
 * показывать здесь нечего ни в одной. По той же причине на странице нет и ряда
 * межъязыковых ссылок, который стоит на остальных внутренних страницах.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  return {
    title: `${tNav('favorites')} — AirportsBoard`,
    description: tNav('favorites_hint'),
    alternates: { canonical: `${BASE}/${locale}/favorites` },
    robots: { index: false, follow: true },
  };
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHome = await getTranslations({ locale, namespace: 'home' });

  return (
    <main className="fav-page">
      {/* Заголовок остался в разметке, но не на виду: страница служебная и noindex,
          поэтому для поиска он не значит ничего, а для программы чтения с экрана
          остаётся единственной точкой входа в документ — без h1 она объявляет
          страницу безымянной. Раздел человеку называет подсвеченный пункт нижней
          панели и заголовок вкладки. */}
      <h1 className="sr-only">{tNav('favorites')}</h1>
      {/* Подпись «как добавить» живёт внутри списка, а не здесь: у пустого списка она
          стоит в самой заглушке, у непустого — тихой строкой под плитками. Наверху она
          объясняла бы устройство страницы человеку, который уже всё понял. */}
      <FavoriteList
        locale={locale}
        title={tNav('favorites_title')}
        empty={tNav('favorites_empty')}
        find={tNav('favorites_find')}
        depLabel={tHome('departures_short')}
        arrLabel={tHome('arrivals_short')}
      />
    </main>
  );
}
