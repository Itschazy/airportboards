import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes, getCities, getAirportsByCountry, getAirportsByCity } from '@/lib/airports';
import { getEventSlugs } from '@/lib/event-content';
import { isUnfillable, serviceLevel, splitByService, hasNoService } from '@/lib/warm';
import { getTopRoutes } from '@/lib/top-routes';
import { getRoute, getBoard, getBoardStampWithRows } from '@/lib/flights';
import { locales } from '@/lib/i18n';
import { LEGAL_LOCALES } from '@/lib/legal-content';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher priority than obscure airfields (priority is relative).
const HUBS = new Set(getStaticIataCodes());
/**
 * Нижняя граница яруса, у которого подстраница прилётов попадает в карту.
 *
 * «X arrivals» — точная форма денежного запроса: пять живых проб выдачи (Анталья/Пальма/
 * Барахас на en, de, es) вернули по 8–10 источников, и каждый был страницей прилётов, а этого
 * домена не было ни в одной. Порог задумывался как защита от пустых бортов внизу хвоста.
 *
 * ПОРОГ 40 ОТРЕЗАЛ РОВНО ТЕХ, КТО ЗАРАБАТЫВАЕТ. Замер Вебмастера 14.08 по 500 запросам
 * (108 896 показов): класс «прилёт» даёт CTR 3.0% — лучший из всех классов сайта (вылет 2.6%,
 * «табло» без направления 1.5%). А подстраница прилётов не была заявлена у:
 *
 *     KZN  29 вылетов/сут  30 266 показов      CEK  15   3 683
 *     UFA  25              28 320              MRV  19   3 204
 *     SUI   5               4 648              OSS  10     335
 *     AER  39               4 418
 *
 * Проверено на проде: все семь отвечают 200, объявляют index, follow, на борту 19–39 строк.
 * Страницы есть и они хорошие — поисковику про них просто не сказано.
 *
 * ПОЧЕМУ 10, А НЕ 3 И НЕ 40. Порог тут не единственная защита: ниже стоит второй гейт —
 * «на борту есть строки прямо сейчас», тот же предикат, которым сама страница ставит robots.
 * Он проверяет пустоту в момент генерации карты (revalidate = 86400), а порог хеджирует
 * пустоту в момент ОБХОДА, то есть они закрывают разные окна и порог не избыточен. Замер
 * долей пустых бортов по ярусам (см. airportDescription в airport/[iata]/page.tsx):
 *
 *     1-2 рейса/сут  71% пусто      10-49  14% пусто
 *     3-4            14%            50+     0% пусто
 *     5-9            21%
 *
 * На ярусе 10–49 пусто в 14% случаев, и эти 14% ловит гейт по строкам. Ниже десяти доля
 * растёт до 71%, и там уже никакой гейт по одному снимку не спасает — потому 10.
 *
 * SUI (5 рейсов/сут, 4 648 показов) в порог не проходит и остаётся снаружи осознанно: сначала
 * ему нужен борт, который не пустеет, а не строка в карте.
 */
const ARRIVALS_MIN_DAILY = 10;

type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

// One entry per PAGE, carrying every language version as an hreflang alternate
// (incl. x-default). Search engines learn the full 12-language cluster at discovery
// time — far better for multilingual indexing than 12 unrelated URLs, and far
// smaller files, so we can list every page type.
/**
 * lastModified СТАВИТСЯ ТОЛЬКО ТАМ, ГДЕ ЕСТЬ НАСТОЯЩАЯ ОТМЕТКА ВРЕМЕНИ, и это главное здесь.
 *
 * Раньше поле было `new Date()`, то есть время СБОРКИ на каждом адресе: любой выкат заявлял,
 * что изменился весь сайт разом. Такой сигнал поисковик перестаёт читать целиком, и поле убрали.
 * Но отсутствие — тоже не сигнал, а Яндекс планирует переобход по lastmod, и переобход тут
 * единственный канал: 99.7% показов приходят оттуда.
 *
 * Источник значения — время, когда изменились ДАННЫЕ, а не когда отрисовалась страница:
 * getBoardFetchedAt читает отметку хранилища, ту же самую, которую страница публикует как
 * dateModified и как «обновлено N назад». ISR-перегенерация, отдающая тот же шестичасовой борт,
 * не имеет права заявлять свежесть, и не заявляет.
 *
 * Где отметки нет — поля нет. Страны, города, указатель A–Z, правовые документы и главная
 * меняются по своим законам, и придумывать им дату означало бы вернуться ровно к тому, из-за
 * чего поле и выкинули. Пустой борт при живой отметке тоже не считается: прогрев штампует
 * хранилище даже когда провайдер ответил пустым списком, так что «есть отметка» ≠ «есть борт».
 *
 * Значение может отставать на сутки — карта перегенерируется раз в 86400 с. Это честное
 * «изменилось не позже, чем», а не ложное «изменилось только что».
 */
function entry(
  path: string,
  changeFrequency: Freq,
  priority: number,
  // Which languages this page genuinely exists in. Defaults to all of them, but the legal
  // documents are written only in en and ru — components/legal-page.tsx already advertises
  // just those two, while this helper was claiming all twelve. The sitemap and the page were
  // therefore contradicting each other about the same URLs, in hreflang, which is precisely
  // where an engine checks before trusting either.
  langs: readonly string[] = locales,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const loc of langs) languages[loc] = `${BASE}/${loc}${path}`;
  languages['x-default'] = `${BASE}/en${path}`;
  return { url: `${BASE}/en${path}`, changeFrequency, priority, alternates: { languages }, ...(lastModified ? { lastModified } : {}) };
}

/**
 * Отметка времени борта, годная для lastmod, или undefined.
 *
 * Два условия, и оба обязательны. Отметка должна существовать — иначе врать нечем и незачем.
 * И она должна лежать В ПРОШЛОМ: часы сервера уходили вперёд достаточно, чтобы это стоило
 * проверки, а lastmod из будущего поисковик отбрасывает вместе с доверием к остальным.
 */
function boardStamp(iata: string, direction: 'departures' | 'arrivals'): Date | undefined {
  const ts = getBoardStampWithRows(iata, direction);
  if (ts == null || !Number.isFinite(ts)) return undefined;
  if (ts > Date.now()) return undefined;
  return new Date(ts);
}

// Regenerate daily: the route list is refreshed in the background by the warmer (see
// lib/top-routes.ts), and a fully static sitemap would freeze whatever was true at build.
export const revalidate = 86400;

// Only the ids generateSitemaps() returns may be rendered. Without this, /sitemap/999.xml and
// /sitemap/abc.xml answered 200 with an empty urlset, and /sitemap/0.5.xml answered 200 with
// 1,038 <loc> from a slice straddling two children — each probed id minting a fresh ISR entry
// on disk with revalidate=86400, on a VDS that has run out of disk before.
export const dynamicParams = false;

export async function generateSitemaps() {
  return Array.from({ length: getSitemapCount() }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number | string }): Promise<MetadataRoute.Sitemap> {
  // Next passes `id` as a STRING — coerce, or `id === 0` fails (statics dropped) and
  // `(id + 1)` string-concats ("1"+1 = "11" → slice(1000,11000), overlapping children).
  const sid = Number(id);
  const iataCodes = getAllIataCodes();
  const slice = iataCodes.slice(sid * AIRPORTS_PER_SITEMAP, (sid + 1) * AIRPORTS_PER_SITEMAP);
  const entries: MetadataRoute.Sitemap = [];

  // Hubs / index / country / city / airline pages live only in the first child.
  if (sid === 0) {
    entries.push(entry('', 'daily', 0.8));               // home
    entries.push(entry('/airports', 'weekly', 0.7));     // countries index
    // Legal / info pages — low priority but crawlable (AdSense reviewers & Googlebot
    // must be able to reach the Privacy Policy et al.).
    for (const p of ['/privacy', '/terms', '/about', '/contact']) entries.push(entry(p, 'yearly', 0.3, LEGAL_LOCALES));
    for (const L of LETTERS) entries.push(entry(`/az/${L}`, 'weekly', 0.4));
    // Only countries with at least one served airport. A sitemap entry for a page that
    // renders noindex is a contradiction the crawler has to resolve, and it is the same
    // predicate the page itself uses (airports/[country]/page.tsx) — one source, not two.
    for (const c of getCountries()) {
      if (!splitByService(getAirportsByCountry(c.slug)).served.length) continue;
      entries.push(entry(`/airports/${c.slug}`, 'weekly', 0.6));
    }
    // Same predicate as the page's own robots.index — a city where nothing has a board is
    // noindex, so declaring it here would ask Google to crawl what we just told it to skip.
    for (const c of getCities()) {
      if (c.count <= 1) continue;
      if (!getAirportsByCity(c.slug).some(a => !hasNoService(a.iata))) continue;
      entries.push(entry(`/city/${c.slug}`, 'weekly', 0.6));
    }
    // Event guides (World Cup final etc.) — small, high-intent, freshness matters.
    entries.push(entry('/events', 'weekly', 0.6));   // permanent hub
    entries.push(entry('/widgets', 'monthly', 0.5)); // widget generator (the link programme)
    for (const s of getEventSlugs()) entries.push(entry(`/event/${s}`, 'daily', 0.8));
    // Airline pages are noindex (thin across ~976 codes) — intentionally not listed.

    // Top routes out of mega airports, harvested from the live boards and cross-confirmed
    // on both ends (scripts/harvest-top-routes.mjs). Only pairs with repeated evidence are
    // listed, so a route that fades from the boards stops being advertised instead of
    // pointing the crawler at a noindexed page. "Flights X to Y today" is the highest-intent
    // query family the site can answer.
    // Advertise a route only if its page will actually index — the SAME predicate the page
    // uses (route/[pair]/page.tsx sets robots.index from getRoute().length > 0), not a
    // separate one that can disagree with it.
    //
    // It did disagree: 71 of the 484 seeded routes rendered "No direct flights found today"
    // under noindex while this file listed them. data/top-routes.json was built by the manual
    // harvest without the MIN_SNAPSHOTS gate — all 673 of its pairs carry seen: 1 — and
    // getTopRoutes() returns SEED.top verbatim, so the gate never applied to it. Running the
    // seed through rank() instead would drop all 484, including the 413 that work.
    //
    // getRoute reads the store with live:false and never contacts airlabs. This runs once per
    // sitemap regeneration (revalidate = 86400), not per request.
    const seenPair = new Set<string>();
    const pairList: string[] = [];
    for (const pairs of Object.values(getTopRoutes())) {
      for (const pair of pairs) {
        if (seenPair.has(pair)) continue;
        seenPair.add(pair);
        pairList.push(pair);
      }
    }
    const resolvable = await Promise.all(pairList.map(async pair => {
      const [from, to] = pair.split('-');
      if (!from || !to) return null;
      try { return (await getRoute(from, to, 'en')).length > 0 ? pair : null; } catch { return null; }
    }));
    for (const pair of resolvable) if (pair) entries.push(entry(`/route/${pair}`, 'daily', 0.7));
  }

  for (const iata of slice) {
    // Not listed at all: the page declares noindex (lib/warm.ts isUnfillable), and a sitemap
    // entry for a noindexed URL is the contradiction that fed the mass-exclusion wave.
    if (isUnfillable(iata)) continue;
    /**
     * Не рекламируем страницу, которой нечего показать.
     *
     * Замер Search Console 13.08: из 6 630 известных Google адресов проиндексировано 1 070,
     * а **5 324 помечены «просканирована, не проиндексирована»** — то есть он их скачал,
     * посмотрел и отказал. Бюджета ему хватало с запасом: 37 700 запросов и 448 МБ за 90
     * дней. Это вердикт по содержимому, а не очередь на обход, и ожиданием он не меняется.
     * Средняя позиция у взятых — 41.3, кликов за квартал двенадцать.
     *
     * Что именно он отвергал, видно по его же примерам: /de/airport/APN, /ar/airport/BBK,
     * /hi/airport/EIN/arrivals — мелкие аэропорты в языках без аудитории. Видимого текста у
     * них 2 400–2 900 знаков против 9 700 у JFK. Ровно за это же AdSense отклонил сайт 03.08
     * с формулировкой «бесполезный контент».
     *
     * ОДНО ЧИСЛО ЗДЕСЬ БЫЛО НЕВЕРНЫМ, и это стоит знать, потому что оно выглядело решающим.
     * Комментарий утверждал схожесть 0.975 у страниц «рейсов нет» при 0.42–0.44 у остальных
     * классов. Повторный замер 14.08 по 40 снятым страницам даёт медиану 0.305 при максимуме
     * 0.400, а по 276 оставшимся в карте — 0.11–0.27 по ярусам. Похоже на замер по ПОЛНОМУ
     * HTML вместе с RSC-нагрузкой, которая почти одинакова на любых двух страницах, — ту самую
     * ловушку, в которую здесь попадали уже дважды. Рез при этом остаётся правильным, но
     * опирается он на прямой отказ Google по 5 324 адресам, а не на эту схожесть.
     *
     * До этой строки карта заявляла 7 327 страниц × 12 языков = 87 924 URL, из них 3 143
     * страницы аэропортов (43% корпуса) — измеренный ноль вылетов. После: 50 208.
     *
     * ПРЕДИКАТ ВЗЯТ ГОТОВЫЙ, а не написан заново, и это существенно. hasNoService не трогает
     * аэропорты с рейсами и, главное, не трогает те, у кого есть опубликованные маршруты из
     * вики: там странице есть что ответить на вопрос «кто летает и куда», и она перестаёт
     * быть страницей об отсутствующем. Тот же предикат карта уже применяет к городам выше.
     *
     * ЯНДЕКСУ ЭТО НИЧЕГО НЕ СТОИТ, и это проверено, а не предположено. Страницы остаются
     * живыми, связанными и объявляют `index, follow` — карта отвечает за обнаружение, не за
     * удержание, а Яндекс их уже проиндексировал. Их доля трафика — 1.3% (133 визита за 30
     * дней) при 43.6% отказов, вдвое хуже среднего по сайту.
     */
    if (hasNoService(iata)) continue;
    const hub = HUBS.has(iata);
    const cf: Freq = hub ? 'hourly' : 'daily';
    entries.push(entry(`/airport/${iata}`, cf, hub ? 1.0 : 0.6, locales, boardStamp(iata, 'departures')));
    // Подстраница прилётов заявляется от яруса ARRIVALS_MIN_DAILY и ниже — не только у хабов
    // (см. разбор у самой константы). Хвост ниже порога остаётся достижимым по ссылкам из
    // подвала и с табло и индексируемым, когда рейсы ЕСТЬ (гейт robots на самой подстранице),
    // просто не рекламируется картой.
    // /departures is NOT listed: it canonicalises to the airport page (see the note in
    // departures/page.tsx — the parent opens on the departures board, so the two are the same
    // document, measured at 92-96% identical). A sitemap entry whose canonical points at a
    // different URL is a contradiction an engine checks for, and it spends crawl budget
    // arriving at a page that only forwards the credit. Arrivals stays: different flights,
    // different routes section, self-canonical, and the subpage that actually earns
    // impressions in Search Console.
    //
    // Advertised only when the arrivals board ACTUALLY has rows right now — the same
    // predicate the page's robots gate uses (arrivals/page.tsx: index iff board non-empty),
    // not a parallel one that can disagree with it. getBoard reads the in-process store with
    // live:false and never contacts airlabs; this runs once per sitemap regeneration
    // (revalidate = 86400), not per request. The list therefore grows with warm coverage
    // instead of promising pages that would answer noindex today.
    if ((serviceLevel(iata) ?? 0) >= ARRIVALS_MIN_DAILY) {
      try {
        if ((await getBoard(iata, 'arrivals', 'en')).length > 0) {
          entries.push(entry(`/airport/${iata}/arrivals`, cf, 0.9, locales, boardStamp(iata, 'arrivals')));
        }
      } catch { /* empty or unreadable board — simply not advertised */ }
    }
  }

  return entries;
}
