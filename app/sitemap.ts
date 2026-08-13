import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes, getCities, getAirportsByCountry, getAirportsByCity } from '@/lib/airports';
import { getEventSlugs } from '@/lib/event-content';
import { isUnfillable, serviceLevel, splitByService, hasNoService } from '@/lib/warm';
import { getTopRoutes } from '@/lib/top-routes';
import { getRoute, getBoard } from '@/lib/flights';
import { locales } from '@/lib/i18n';
import { LEGAL_LOCALES } from '@/lib/legal-content';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher priority than obscure airfields (priority is relative).
const HUBS = new Set(getStaticIataCodes());
// /arrivals subpages are advertised down to the major tier (>=40 scheduled departures a
// day: mega + hub + major, ~460 airports), not just the ~68 mega ones. "X arrivals" is the
// exact query shape of the money markets — five live SERP probes (Antalya/Palma/Barajas in
// en, de, es) returned 8-10 sources each, every one an arrivals/Ankünfte/llegadas page, and
// this domain in none of them; the incumbents there are eoob.de and easyflycheck.com class
// sites, so the authority bar is on the floor. The tier threshold keeps the long tail out:
// below ~40 departures a day an arrivals board is often empty at crawl time, and the page
// then declares noindex — advertising it would be the sitemap/page contradiction that fed
// the 4,035-page exclusion wave.
const ARRIVALS_MIN_DAILY = 40;

type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

// One entry per PAGE, carrying every language version as an hreflang alternate
// (incl. x-default). Search engines learn the full 12-language cluster at discovery
// time — far better for multilingual indexing than 12 unrelated URLs, and far
// smaller files, so we can list every page type.
//
// No `lastModified`: it was `new Date()` (build time) on every URL, so each deploy
// claimed the entire site changed "just now" — a signal engines learn to ignore.
// Omitting it is better than a lie.
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
): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const loc of langs) languages[loc] = `${BASE}/${loc}${path}`;
  languages['x-default'] = `${BASE}/en${path}`;
  return { url: `${BASE}/en${path}`, changeFrequency, priority, alternates: { languages } };
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
     * /hi/airport/EIN/arrivals — мелкие аэропорты в языках без аудитории. Разбор схожести
     * подтвердил: 2 160 страниц «рейсов нет» похожи друг на друга на 0.975 при 0.42–0.44 у
     * остальных классов сайта, видимого текста 2 400–2 900 знаков против 9 700 у JFK.
     * Ровно за это же AdSense отклонил сайт 03.08 с формулировкой «бесполезный контент».
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
    entries.push(entry(`/airport/${iata}`, cf, hub ? 1.0 : 0.6));
    // Only hubs advertise arrivals/departures subpages. For the long tail these are
    // usually empty "No flights" near-dupes; listing them wasted crawl budget and fed
    // the mass-exclusion wave. They stay reachable (footer/board links) and indexable
    // when they DO have flights (robots gate in each subpage) — just not in the sitemap.
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
          entries.push(entry(`/airport/${iata}/arrivals`, cf, 0.9));
        }
      } catch { /* empty or unreadable board — simply not advertised */ }
    }
  }

  return entries;
}
