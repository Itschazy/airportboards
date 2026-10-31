import { LocaleLinks } from '@/components/LocaleLinks';
import type { Locale } from '@/lib/i18n';
import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCities, getCityBySlug, getAirportsByCity } from '@/lib/airports';
import { hasNoService } from '@/lib/warm';
import { getCityName, getCountryName } from '@/lib/places';
import { Breadcrumb } from '@/components/Breadcrumb';
import { deName as withDe } from '@/lib/fr-elision';
import { getAirportName } from '@/lib/airport-names';
import { locales } from '@/lib/i18n';
import { assertLocale } from '@/lib/locale-guard';
import { ldScript } from '@/lib/json-ld';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; slug: string }> };

// Pre-render multi-airport cities (highest value); the rest render on-demand via ISR.
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  // Prerender only the top multi-airport cities; the rest render on-demand via ISR.
  // (A small VDS can't prerender thousands of extra pages without OOM during build.)
  return getCities().filter(c => c.count > 1).slice(0, 20).map(c => ({ slug: c.slug }));
}

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(assertLocale(locale));
  const c = getCityBySlug(slug);
  if (!c) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const city = getCityName(c.city, locale);
  const deCity = withDe(city, locale);
  // Вебмастер 23.10: город Columbia и страна Colombia имеют один русский title.
  // Страна уточняет сущность города, не меняя H1, URL и оформление страницы.
  const title = `${t('city_title', { city, deCity })} · ${getCountryName(c.country, locale)}`;
  /** Does anything on this page actually have a board? */
  const hasBoard = getAirportsByCity(slug).some(a => !hasNoService(a.iata));
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/city/${c.slug}`;
  languages['x-default'] = `${BASE}/en/city/${c.slug}`;
  const canonical = `${BASE}/${locale}/city/${c.slug}`;
  return {
    title: withBrand(title),
    // 28 city pages list only airports with no scheduled service, and every one of them
    // promised "arrivals and departures, flight status" over a list where nothing has a board.
    // Same defect the country pages carried for Ukraine and 18 others, and the same repair:
    // say what the page actually holds, and stop competing in search as if it were a board.
    description: hasBoard
      ? t('city_desc', { city, deCity, count: c.count })
      : t('city_none', { city, deCity, count: c.count }),
    // A single-airport "city" page is near-duplicate of that airport — don't index it,
    // and don't advertise an hreflang cluster for a noindex page.
    alternates: c.count > 1 && hasBoard ? { canonical, languages } : { canonical },
    robots: { index: c.count > 1 && hasBoard, follow: true },
  };
}

export default async function CityPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(assertLocale(locale));
  const c = getCityBySlug(slug);
  if (!c) notFound();
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const airports = getAirportsByCity(slug);
  const city = getCityName(c.city, locale);
  const deCity = withDe(city, locale);
  const country = getCountryName(c.country, locale);

  const crumbs = [
    { name: tNav('home'), item: `${BASE}/${locale}` },
    { name: t('sec_countries'), item: `${BASE}/${locale}/airports` },
    { name: t('city_title', { city, deCity }), item: `${BASE}/${locale}/city/${c.slug}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    // Разметка строится из ТОГО ЖЕ массива, что и видимый след. Раньше она заявляла
    // «Главная → Аэропорты: Казань», а на экране стояло «airportsboard · Аэропорты по
    // странам» — не совпадали ни имена, ни число уровней, ни адреса.
    itemListElement: crumbs.map((cr, i) => ({ '@type': 'ListItem', position: i + 1, name: cr.name, item: cr.item })),
  };
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('city_title', { city, deCity }),
    numberOfItems: airports.length,
    itemListElement: airports.map((a, i) => ({
      '@type': 'ListItem', position: i + 1,
      name: getAirportName(a.iata, locale, a.name),
      item: `${BASE}/${locale}/airport/${a.iata}`,
    })),
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(jsonLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(itemList)} />
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', margin: '0 0 6px' }}>
        <span className="locale-flag">{flag(c.iso2)}</span> {t('city_title', { city, deCity })}
      </h1>
      {/* The honest variant was applied to the <meta> only, so the page carried both claims at
          once: a description saying we have no scheduled-service data, above a paragraph
          promising "arrivals and departures, flight status". Same predicate as the metadata. */}
      <p style={{ fontSize: 15, color: 'var(--ab-8a8a8a)', margin: '0 0 28px' }}>
        {airports.some(a => !hasNoService(a.iata))
          ? t('city_desc', { city, deCity, count: c.count })
          : t('city_none', { city, deCity, count: c.count })}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {airports.map(a => (
          <li key={a.iata}>
            <Link href={`/${locale}/airport/${a.iata}`} style={{
              display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
              background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 16, padding: '14px 18px',
            }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--ab-0a84ff)', width: 48, flexShrink: 0, letterSpacing: '-0.02em' }}>{a.iata}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, color: 'var(--ab-e4e4e7)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getAirportName(a.iata, locale, a.name)}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ab-6a6a6a)', marginTop: 2 }}>{country}</span>
              </span>
              <svg data-flip width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ flexShrink: 0 }}><path d="M1 1L7 7L1 13" stroke="var(--ab-3a3a3c)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    <Breadcrumb label={tNav('aria_breadcrumb')} trail={crumbs} foot />
    {/* Эта же страница на остальных одиннадцати языках. Ряд стоит в странице,
        а не в подвале, потому что подвал рисует раскладка, а она своего адреса
        не знает: узнать его можно только заголовком из middleware, и тогда
        каждая страница сайта стала бы динамической. Подробности — в LocaleLinks. */}
    <LocaleLinks locale={locale as Locale} path={`/city/${c.slug}`} />
    </div>
  );
}
