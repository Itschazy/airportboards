import type { Metadata } from 'next';
import { withBrand } from '@/lib/title';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirport, distanceKm } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getCityName } from '@/lib/places';
import { localAirlineName } from '@/lib/airline-ru';
import { getRoute, getRouteStats, airlineName } from '@/lib/flights';
import { locales, forwardArrow, numLocale } from '@/lib/i18n';
import { joinList } from '@/lib/list-separator';
import { routeFacts } from '@/lib/route-facts';
import { assertLocale } from '@/lib/locale-guard';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; pair: string }> };

// On-demand only (the route space is huge); discovered via PopularRoutes links + ISR.
export const dynamicParams = true;
export const revalidate = 600;

function parsePair(pair: string): { from: string; to: string } | null {
  const m = pair.toUpperCase().match(/^([A-Z]{3})-([A-Z]{3})$/);
  if (!m || m[1] === m[2]) return null;
  return { from: m[1], to: m[2] };
}

const STATUS_COLOR: Record<string, string> = {
  ontime: 'var(--ab-8a8a8a)', scheduled: 'var(--ab-8a8a8a)', boarding: 'var(--ab-0a84ff)', finalcall: 'var(--ab-ff453a)',
  delayed: 'var(--ab-ff9f0a)', departed: 'var(--ab-48484a)', baggage: 'var(--ab-0a84ff)', arrived: 'var(--ab-48484a)', cancelled: 'var(--ab-ff453a)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  setRequestLocale(assertLocale(locale));
  const p = parsePair(pair);
  if (!p) return {};
  const a = getAirport(p.from), b = getAirport(p.to);
  if (!a || !b) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const from = getCityName(a.city, locale), to = getCityName(b.city, locale);
  const title = t('route_title', { from, to, iata1: p.from, iata2: p.to });
  const slug = `${p.from}-${p.to}`;
  // Only index a route that actually has flights — avoids soft-404s on the huge
  // pair space. Shared fetch is cache-deduped with the page render.
  let hasFlights = false;
  try { hasFlights = (await getRoute(p.from, p.to, locale)).length > 0; } catch {}
  const canonical = `${BASE}/${locale}/route/${slug}`;
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/route/${slug}`;
  languages['x-default'] = `${BASE}/en/route/${slug}`;
  return {
    title: withBrand(title),
    description: t('route_desc', { from, to, iata1: p.from, iata2: p.to }),
    alternates: hasFlights ? { canonical, languages } : { canonical },
    robots: { index: hasFlights, follow: true },
  };
}

export default async function RoutePage({ params }: Props) {
  const { locale, pair } = await params;
  setRequestLocale(assertLocale(locale));
  const p = parsePair(pair);
  if (!p) notFound();
  const a = getAirport(p.from), b = getAirport(p.to);
  if (!a || !b) notFound();

  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const from = getCityName(a.city, locale), to = getCityName(b.city, locale);
  const fromName = getAirportName(a.iata, locale, a.name), toName = getAirportName(b.iata, locale, b.name);

  let flights: Awaited<ReturnType<typeof getRoute>> = [];
  try { flights = await getRoute(p.from, p.to, locale); } catch {}

  // Перевозчика русский читатель знает по-русски: под этим же маршрутом табло
  // аэропорта печатает «Россия» и «Аэрофлот», а страница маршрута печатала
  // «Rossiya Airlines» — справочник data/airlines.json латиницей. Разнобой
  // виден на одном экране, и ищут по-русски именно «Россию».
  const airlines = [...new Set(flights.map(f => f.airlineIata).filter(Boolean))]
    .map(code => localAirlineName(airlineName(code), locale));

  /**
   * Измеримые ответы вместо пустоты.
   *
   * До этого страница маршрута была самым тонким из заявленных в карте типов: 1 012 знаков,
   * НОЛЬ заголовков второго уровня, из разметки один BreadcrumbList — при двенадцати h2 и
   * четырёх типах разметки у страницы аэропорта. Таких страниц 454, и все они в карте, то
   * есть ровно тот класс, за который Google пометил 5 324 адреса «просканирована, не
   * проиндексирована».
   *
   * Всё, что добавлено, вычисляется: медиана времени в пути — из отметок вылета и прибытия
   * тех же записей хранилища, что рисуют список ниже; расстояние — тем же haversine, которым
   * считаются «соседние аэропорты». Ни одного утверждения, которого нельзя проверить по
   * данным. Единицы («ч», «мин», «км», «Std.», «시간») выдаёт Intl по локали, вручную не
   * переводится ни одна.
   *
   * Обращений к провайдеру нет: getRouteStats читает хранилище с live = false.
   */
  const stats = await getRouteStats(p.from, p.to);
  const facts = routeFacts({
    locale,
    fromCity: from, toCity: to, fromIata: p.from, toIata: p.to,
    durationMin: stats.durationMin,
    km: a.lat != null && b.lat != null ? distanceKm(a, b) : null,
    airlines,
    airlineList: joinList(airlines, locale),
  });
  // Вопросы для FAQPage — только настоящие пары. У строки про авиакомпании вопросом служит
  // существующий заголовок каталога, и попади она в разметку с пустым name, вся сущность
  // стала бы невалидной.
  const faq = facts.filter(f => f.q);
  const stamp = stats.fetchedAtMs;
  // Часы строк — вылет, не прилёт. Показываем рядом аэропорт и дату снимка,
  // чтобы часовые пояса/вчерашний кэш не превращались в ложное «сегодня».
  const stampLabel = stamp ? (() => {
    try { return new Intl.DateTimeFormat(numLocale(locale), {
      timeZone: a.tz || 'UTC', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
    }).format(new Date(stamp)); } catch { return new Date(stamp).toISOString(); }
  })() : null;

  // Нет подтверждённого IANA-пояса — не выдаём дату UTC за местную.
  // Форматтер один на страницу, не на каждую строку; битая зона не ломает SSR.
  let departureDateFormatter: Intl.DateTimeFormat | null = null;
  try {
    if (a.tz) departureDateFormatter = new Intl.DateTimeFormat(numLocale(locale), {
      timeZone: a.tz, day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { /* неизвестный пояс: строка остаётся без предполагаемой даты */ }

  const canonicalUrl = `${BASE}/${locale}/route/${p.from}-${p.to}`;
  /* Крошки — только разметкой, без своего ряда внизу (30.10.2026, решение владельца:
     ряд убран со страницы маршрута).

     Расхождения между заявленным и показанным это не создаёт, и вот почему. В списке
     два звена: «Главная» и сама страница. Первое — живая видимая ссылка в шапке сайта
     (логотип ведёт на /{locale}, см. SiteHeader), второе — страница, на которой читатель
     уже стоит. Заявлять нечего сверх того, что на экране и так есть; отдельная капсула
     повторяла бы эти два звена третий раз подряд под именем маршрута.

     Массив по-прежнему один: если звеньев станет больше, разметка и вид разойтись не
     смогут — расходиться будет нечему. */
  const crumbs = [
    { name: tNav('home'), item: `${BASE}/${locale}` },
    { name: t('route_h1', { from, to, iata1: p.from, iata2: p.to }), item: canonicalUrl },
  ];
  const jsonLd: object[] = [{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((cr, i) => ({ '@type': 'ListItem', position: i + 1, name: cr.name, item: cr.item })),
  }, {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('route_h1', { from, to, iata1: p.from, iata2: p.to }),
    description: t('route_desc', { from, to, iata1: p.from, iata2: p.to }),
    url: canonicalUrl,
    inLanguage: locale,
    publisher: { '@type': 'Organization', name: 'AirportsBoard', url: BASE },
    // Свежесть берётся из возраста ДАННЫХ, а не из времени отрисовки, и только когда на борту
    // есть строки: отметка хранилища существует и после пустого ответа провайдера, а заявлять
    // свежесть про «прямых рейсов не найдено» не о чем.
    ...(stamp && flights.length ? { dateModified: new Date(stamp).toISOString() } : {}),
  }];
  if (faq.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  // Standalone navigation, not links inside a sentence, so WCAG 2.5.8's inline exception does
  // not apply. The taller box grows into the paragraph margins that are already there.
  const link: React.CSSProperties = { color: 'var(--ab-0a84ff)', textDecoration: 'none', display: 'inline-block', minHeight: 24 };

  /* Страница маршрута — в общем стиле сайта (30.10.2026, решение владельца). Прежде весь
     её текст лежал прямо на обоях: заголовок, две ссылки, три абзаца и список. На пёстром
     фоне серые вторичные строки читались плохо, а у страницы не было ни одной границы —
     ровно та же беда, из-за которой шапку аэропорта когда-то убрали под стекло.

     Теперь то же самое, что на странице аэропорта: стеклянная панель с именем маршрута и
     его данными, карточки «вопрос — ответ», стеклянные строки рейсов, пилюли ссылок и
     крошки внизу. Ни одного нового текста: переставлены только оболочки. */
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '10px 16px 48px' }}>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      {/* Шапка маршрута — та же стеклянная панель и те же поля, что у .ap-head. */}
      <div className="glass" style={{ borderRadius: 'var(--r-panel)', padding: '16px 20px 15px' }}>
        <h1 style={{ fontSize: 'clamp(23px, 5.6vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', margin: 0, lineHeight: 1.12 }}>
          {t('route_h1', { from, to, iata1: p.from, iata2: p.to })}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ab-8a8a8a)', margin: '8px 0 0' }}>
          <Link href={`/${locale}/airport/${a.iata}/departures`} style={link}>{fromName}</Link>
          {` ${forwardArrow(locale)} `}
          <Link href={`/${locale}/airport/${b.iata}/arrivals`} style={link}>{toName}</Link>
        </p>

        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ab-8a8a8a)', margin: '8px 0 0' }}>
          {t('route_departure_time', { iata1: p.from })}
        </p>
        {/* Возраст данных — точкой и мелкой строкой, как на шапке аэропорта. Живой
            точки здесь нет: страница показывает снимок, а не опрашивает борт. */}
        {stamp && stampLabel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}>
            <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ab-8a8a8a)', opacity: 0.7, flexShrink: 0 }} />
            <time dateTime={new Date(stamp).toISOString()} style={{ fontSize: 12, color: 'var(--ab-8a8a8a)', opacity: 0.85 }}>{t('route_updated', { date: stampLabel })}</time>
          </div>
        )}
      </div>

      {/* Вопросы, на которые страница отвечает. Заголовок обязан быть ВОПРОСОМ, а
          ответ — целым предложением: отвечающая машина цитирует фрагмент, и «357 км» вне
          контекста не значит ничего, тогда как «Расстояние от AMS до LHR — 357 км по прямой»
          значит. Ровно та же конструкция, что у FAQ страницы аэропорта, и теперь те же
          карточки: подложка стеклянная, вопрос — пятнадцатым кеглем обычным регистром,
          ответ — мелкой строкой под ним.

          Пара без вопроса — строка про авиакомпании. Её заголовок берётся из существующего
          ключа каталога и стоит ТУТ ЖЕ, в той же карточке. Прежде он печатался отдельным
          абзацем наверху страницы («Авиакомпании на маршруте: Turkish Airlines»), а сам
          ответ — внизу, среди фактов («В сохранённом табло CEK — IST указаны авиакомпании:
          Turkish Airlines»), и читатель видел одно и то же дважды в разных местах. */}
      {facts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {facts.map((f, i) => (
            <div key={i} style={{ background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 'var(--r-card)', padding: '14px 16px' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ab-ffffff)', lineHeight: 1.35 }}>{f.q || t('route_airlines')}</h2>
              <p style={{ margin: '7px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--ab-8a8a8a)' }}>{f.a}</p>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: '26px 0 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ab-8a8a8a)' }}>
        {t('route_flights_today')}
      </h2>

      {flights.length === 0 ? (
        <div style={{ fontSize: 15, color: 'var(--ab-8a8a8a)', background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 'var(--r-card)', padding: '18px 16px' }}>{t('route_none')}</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {flights.map((f, i) => {
            // Дата снимка не является датой каждого рейса: после полуночи HH:MM
            // неоднозначно. Подписываем дату вылета в существующей строке номера,
            // в том же поясе отправления, без новых блоков или клиентского JS.
            const departureDate = departureDateFormatter && f.departureDateTs && f.departureDateTs > 0 ? new Date(f.departureDateTs * 1000) : null;
            const departureLabel = departureDate ? departureDateFormatter?.format(departureDate) : null;
            return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 'var(--r-card)', padding: '14px 16px', overflow: 'hidden' }}>
              <span style={{ width: 4, alignSelf: 'stretch', background: STATUS_COLOR[f.status] || 'var(--ab-48484a)', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: f.actual ? 'var(--ab-ff9f0a)' : 'var(--ab-ffffff)', fontVariantNumeric: 'tabular-nums', width: 64, flexShrink: 0 }}>{f.actual || f.scheduled}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 15, color: 'var(--ab-e4e4e7)', fontWeight: 600 }}>{localAirlineName(f.airline, locale)}</span>
                {/* The flight number used to link to /flight/<CODE>. getFlightByNumber() reads
                    a store key ("flight_iata=") the warmer never writes, so that page always
                    answered 200 with "not found" under noindex — a soft-404, for humans as
                    much as crawlers, since the page has no client-side refresh either.
                    ~13,000 such links across 484 route pairs and 12 locales. */}
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ab-6a6a6a)', marginTop: 2 }}><bdi>{f.flight}</bdi>{departureDate && departureLabel && <> · <time dateTime={departureDate.toISOString()}>{departureLabel}</time></>}</span>
              </span>
            </li>
            );
          })}
        </ul>
      )}

      {/* Два аэропорта маршрута — пилюлями, как ссылки в подвале: строка
          «ссылка · ссылка» серым по обоям была наименее заметным элементом
          страницы, хотя ведёт она в самое полезное её продолжение. Теперь это
          и последнее, что на странице есть: ни крошек, ни языкового ряда под
          ними больше нет. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 26 }}>
        <Link href={`/${locale}/airport/${a.iata}`} className="foot-chip">{fromName} ({a.iata})</Link>
        <Link href={`/${locale}/airport/${b.iata}`} className="foot-chip">{toName} ({b.iata})</Link>
      </div>

    {/* Языкового ряда (LocaleLinks) на странице маршрута НЕТ — снят 30.10.2026 по решению
        владельца: язык меняется в подвале, под «Дополнительно».

        Чем это оплачено и почему здесь допустимо. Ряд заведён 28.10 потому, что после
        переезда выбора языка на /settings внутренние страницы перестали ссылаться на свои
        же одиннадцать переводов, а hreflang — не средство обнаружения. Для ЭТОГО типа
        страниц обнаружение закрыто иначе: app/sitemap.ts печатает ОТДЕЛЬНЫЙ <loc> на
        каждый язык каждого пути, включая /route/{pair} (см. там же «ОДНА ЗАПИСЬ НА КАЖДЫЙ
        ЯЗЫК»), а generateMetadata ниже отдаёт полный набор alternates. Теряется внутренний
        вес ссылки, а не видимость — на классе страниц, который даёт 42 визита в месяц из
        всех двенадцати языков.

        На остальных типах страниц ряд остаётся. Если снимать и там — сначала проверить,
        что карта заявляет их так же подробно. */}
    </div>
  );
}
