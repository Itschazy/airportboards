import { getTranslations , setRequestLocale } from 'next-intl/server';
import { DisclosureArrow } from '@/components/DisclosureArrow';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  POPULAR_AIRPORTS, POPULAR_AIRPORTS_RU, POPULAR_CITIES, getAirport, getCountries, slugify,
} from '@/lib/airports';
import { numLocale, locales } from '@/lib/i18n';
import { getCityName, getCountryName } from '@/lib/places';
import { getAirportName } from '@/lib/airport-names';
import { worldServiceCounts } from '@/lib/warm';
import { AirportSearch } from '@/components/AirportSearch';

// The homepage promised "6,000+ airports" in the headline, the subline, the footer tagline, the
// OG image and the manifest — fifteen occurrences in the HTML of every locale — while /airports
// said in plain words that only about 2,800 of them have scheduled passenger service. The site
// contradicted itself on its own front door, which is the first thing a policy reviewer opens.
// The number now comes from the same measurement /airports uses, so the two cannot drift apart.
const worldCounts = () => {
  const w = worldServiceCounts();
  return { served: w.withService, tracked: w.probed };
};
import { StandaloneResume } from '@/components/StandaloneResume';
import { PopularList } from '@/components/PopularList';
import { assertLocale } from '@/lib/locale-guard';

type Props = { params: Promise<{ locale: string }> };

const BASE = 'https://airportsboard.live';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const flag = (iso2: string) =>
  iso2 && iso2.length === 2
    ? [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
    : '🌍';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations({ locale, namespace: 'home' });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}`;
  languages['x-default'] = `${BASE}/en`;
  return {
    title: `AirportsBoard — ${t('hero1')} ${t('hero2')}`,
    description: t('subline', worldCounts()),
    alternates: { canonical: `${BASE}/${locale}`, languages },
  };
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--ab-8a8a8a)', marginBottom: 10 }}>
      {children}
    </div>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(assertLocale(locale));
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

  // Localise the labels. The front page was the only surface in the project that did not:
  // every card read "New York", "London", "Paris" on all twelve locales, directly under a
  // heading that said "当前热门" or "人気の空港" and above a footer that printed
  // "Соединённые Штаты". The data to do it right has been there all along — the same tables
  // every airport page uses.
  const popularList = (locale === 'ru' ? POPULAR_AIRPORTS_RU : POPULAR_AIRPORTS).map(iata => {
    const a = getAirport(iata);
    return a ? {
      iata,
      city: getCityName(a.city, locale, a.city),
      name: getAirportName(iata, locale, a.name),
    } : null;
  }).filter(Boolean) as { iata: string; city: string; name: string }[];

  const countries = getCountries().slice(0, 16);
  const totalCountries = getCountries().length;

  const depShort = t('departures_short');
  const arrShort = t('arrivals_short');

  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: 'AirportsBoard', url: `${BASE}/${locale}`, inLanguage: locale,
      description: t('subline', worldCounts()),
    },
    {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: 'AirportsBoard', url: BASE, logo: `${BASE}/apple-icon`,
    },
  ];

  return (
    <div className="home-search-page" data-home-page>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* По просьбе владельца главная стала поисковым входом: бренд, короткий
          смысловой H1 и поле. Системный шрифт и палитра сайта сохранены.
          Большой каталог ниже раскрывается без JS; его ссылки не удалены. */}
      <div className="home-search-heading">
        <div className="home-wordmark" aria-hidden="true">
          <span className="home-wordmark-plane">✈</span>airportsboard
        </div>
        <h1>{t('hero1')} {t('hero2')}</h1>
      </div>
      <div className="home-search-input">
        <AirportSearch locale={locale} placeholder={tNav('search_placeholder')} />
        <StandaloneResume locale={locale} />
      </div>

      {/* Вся справка находится ПОСЛЕ поиска, в одном нативном аккордеоне.
          Текст, метрики и каталоги входят в исходный серверный HTML и одинаковы
          для читателей и роботов. Не используем lazy-render или display:none
          без доступной кнопки. Недавние аэропорты уже есть при фокусе поиска. */}
      <details className="airport-disclosure home-reference" data-home-intro>
        <summary>
          <span className="disclosure-more">{t('read_more')}</span><span className="disclosure-less">{t('read_less')}</span>
          <DisclosureArrow />
        </summary>

      {/* Один полный список вместо двух пересекающихся: сохраняем все ссылки,
          но не заставляем посетителя дважды просматривать первые восемь аэропортов. */}
      {/* Первой секции хватает 6. Сорок четыре задумывались как расстояние
          между разделами каталога; сразу под «Свернуть» к ним добавлялись ещё
          13 пустых пикселей внутри самой подписи — её высота 44 держит цель
          нажатия, а текст в ней всего 17. Вместе это читалось как провал. */}
      <section style={{ marginTop: 6 }}>
        {/* Описание спрятано под значком «i» у заголовка: это
            справка о охвате, а не то, за чем человек пришёл. Остаются в
            серверном HTML — <details> ничего не удаляет из разметки. */}
        <details className="pop-info">
          <summary>
            <span className="pop-info-title">{t('sec_airports')}</span>
            <span className="pop-info-badge" aria-hidden="true">i</span>
            <span className="sr-only">{t('read_more')}</span>
          </summary>
          <p className="home-intro-card" style={{ fontSize: 16, color: 'var(--ab-8a8a8a)', lineHeight: 1.5, overflowWrap: 'break-word' }}>
            {t('subline', worldCounts())}
          </p>
        </details>

        {/* TRUST METRICS — на виду, а не под значком: это не справка, а
            характеристика охвата, ради которой блок и существует. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 14, marginBottom: 18 }}>
          {[
            // The tile used to read "6,000+ airports", which is true about coverage and false about
            // boards — and next to a headline promising live boards it reads as the latter. It now
            // shows the same number the headline does, from the same measurement.
            { art: 'plane', value: worldCounts().served.toLocaleString(numLocale(locale)),
              // Подпись согласуется с числом над ней. Была статичной строкой в родительном
              // множественного, и на 2801 выходило «2 801 аэропортов» вместо «2 801 аэропорт»:
              // русское числительное на 1 (кроме 11) требует единственного числа. Само число
              // в подписи не печатается — оно стоит выше, — поэтому «#» в шаблоне нет.
              label: t('m_airports_served', { count: worldCounts().served }) },
            // Число через toLocaleString, а не через шаблонную строку: у арабского по CLDR
            // восточноарабские цифры, и соседняя плитка печатала «٢٬٨٠١», а эта — «237+»,
            // западными, в одном ряду. Смешение систем счисления заметнее любой опечатки.
            { art: 'globe', value: `${totalCountries.toLocaleString(numLocale(locale))}+`, label: t('m_countries') },
            { art: 'clock', value: t('m_updates_v'), label: t('m_updates_l') },
          ].map((m, i) => (
            <div key={i} className="home-metric">
              <div className="home-metric-value">{m.value}</div>
              <div className="home-metric-label">{m.label}</div>
              {/* Крупный рисунок в нижнем углу — водяной знак плитки, а не
                  значок перед числом: мелкий символ слева от цифры терялся,
                  а эмодзи-глобус ещё и выбивался цветом из тонкой графики. */}
              <svg className="home-metric-art" width="62" height="62" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {m.art === 'plane' && <path d="M12 2.2c.9 0 1.4 1 1.4 2.4v3.3l6.8 4v1.6l-6.8-2v4l2.2 1.8v1.2l-3.6-1-3.6 1v-1.2l2.2-1.8v-4l-6.8 2v-1.6l6.8-4V4.6c0-1.4.5-2.4 1.4-2.4z" />}
                {m.art === 'globe' && <><circle cx="12" cy="12" r="9.2" /><path d="M2.8 12h18.4" /><path d="M12 2.8c-2.9 3-4.4 6-4.4 9.2s1.5 6.2 4.4 9.2" /><path d="M12 2.8c2.9 3 4.4 6 4.4 9.2s-1.5 6.2-4.4 9.2" /></>}
                {m.art === 'clock' && <><circle cx="12" cy="12" r="9.2" /><path d="M12 6.6v5.6l3.6 2.2" /></>}
              </svg>
            </div>
          ))}
        </div>
        <PopularList airports={popularList} locale={locale} depLabel={depShort} arrLabel={arrShort} />
      </section>

      {/* SECTION 2 — BY COUNTRY */}
      <section style={{ marginTop: 30 }}>
        <Title>{t('sec_countries')}</Title>
        <div className="scroll-row">
          {countries.map(c => (
            <Link key={c.slug} href={`/${locale}/airports/${c.slug}`} style={{
              width: 186, height: 64, textDecoration: 'none', color: 'inherit',
              background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 16, padding: '0 14px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 14, color: 'var(--ab-e4e4e7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {/* Localised: c.country is the English source name, and printing it raw put
                    "🇷🇺 Russia" on the Russian homepage directly above a correctly declined
                    "178 аэропортов", with "Россия" in the footer of the same page. The anchor
                    also has to match the target page's own title ("Aeroporti: Germania"), or
                    the biggest navigation block on the site links by a name the destination
                    never uses. data/country-names.json covers all 235 countries in 12 locales,
                    so this needs no new data. */}
                <span className="locale-flag" style={{ marginInlineEnd: 7, fontSize: 15 }}>{flag(c.iso2)}</span>{getCountryName(c.country, locale)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ab-6a6a6a)', marginTop: 3 }}>{t('airports_count', { count: c.count })}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 3 — POPULAR CITIES */}
      <section style={{ marginTop: 30 }}>
        <Title>{t('sec_cities')}</Title>
        <div className="scroll-row">
          {POPULAR_CITIES.map(c => (
            <Link key={c.code} href={`/${locale}/city/${slugify(getAirport(c.iata)?.city || c.name)}`} style={{
              width: 148, height: 66, textDecoration: 'none', color: 'inherit',
              background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 16, padding: '0 14px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, color: 'var(--ab-e4e4e7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{getCityName(getAirport(c.iata)?.city || c.name, locale, c.name)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ab-6a6a6a)', marginTop: 5, letterSpacing: '0.06em' }}>{c.code}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION 6 — A-Z */}
      <section style={{ marginTop: 30 }}>
        <Title>{t('sec_az')}</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LETTERS.map(L => (
            <Link key={L} href={`/${locale}/az/${L.toLowerCase()}`} style={{
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 999, background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)',
              textDecoration: 'none', color: 'var(--ab-e4e4e7)', fontSize: 15, fontWeight: 600,
            }}>
              {L}
            </Link>
          ))}
        </div>
      </section>

      </details>
    </div>
  );
}
