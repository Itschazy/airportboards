import { getLocale, getTranslations } from 'next-intl/server';
import { baseLocale } from '@/lib/i18n';
import Link from 'next/link';
import { NotFoundSearch } from '@/components/NotFoundSearch';
import { POPULAR_AIRPORTS, getAirport } from '@/lib/airports';
import { getCityName } from '@/lib/places';

// Localized 404 — replaces Next's English default. Renders inside the [locale] layout
// (header/footer), so it just supplies helpful body content: a search box, popular
// airports, and a home link, in the visitor's language.
//
// Вид — тот же, что у пустых страниц избранного и карты перелётов: круг со
// значком, заголовок, строка объяснения, одно синее действие. Разметка целиком
// в классах (.nf-*), а не в inline-стилях: правки размеров идут в одном месте с
// остальными пустыми страницами, иначе они снова разъедутся.
export default async function NotFound() {
  let locale = 'en';
  try { locale = baseLocale(await getLocale()); } catch { /* fall back to en */ }
  const t = await getTranslations({ locale, namespace: 'notfound' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const popular = POPULAR_AIRPORTS.slice(0, 8).map(i => getAirport(i)).filter(Boolean) as NonNullable<ReturnType<typeof getAirport>>[];

  return (
    <div className="nf-page">
      <span className="nf-ico" aria-hidden="true">404</span>
      <h1 className="nf-t">{t('title')}</h1>
      <p className="nf-p">{t('text')}</p>

      <div className="nf-search">
        <NotFoundSearch locale={locale} placeholder={tNav('search_placeholder')} />
      </div>

      <div className="nf-pop-t">{tNav('popular')}</div>
      <div className="nf-chips">
        {popular.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} className="nf-chip">
            <b>{a.iata}</b>
            {/* Город ПЕРЕВЕДЁННЫЙ: на русской странице чипы были подписаны «New York»,
                «London», «Paris», хотя переводы в data/city-names.json есть и главная
                со внутренним поиском их применяют. */}
            <span>{getCityName(a.city, locale)}</span>
          </Link>
        ))}
      </div>

      <Link href={`/${locale}`} className="nf-go">{t('home')}</Link>
    </div>
  );
}
