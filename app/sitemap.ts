import type { MetadataRoute } from 'next';
import { getAllIataCodes, AIRPORTS_PER_SITEMAP, getSitemapCount, getCountries, getStaticIataCodes, getCities } from '@/lib/airports';
import { getEventSlugs } from '@/lib/event-content';
import { getMegaIataCodes } from '@/lib/warm';
import { getTopRoutes } from '@/lib/top-routes';
import { locales } from '@/lib/i18n';
import { LEGAL_LOCALES } from '@/lib/legal-content';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
// Major hubs get higher priority than obscure airfields (priority is relative).
const HUBS = new Set(getStaticIataCodes());
// Arrivals/departures subpages are advertised for the whole mega tier (~68 warmed-hot
// airports), not just the 30 prerendered ones — "X arrivals" is a huge query family and
// these boards always have rows. Kept separate from HUBS on purpose: HUBS also controls
// prerendering, and coupling the two would balloon the build.
const SUBPAGE_HUBS = new Set(getMegaIataCodes());

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

export default function sitemap({ id }: { id: number | string }): MetadataRoute.Sitemap {
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
    for (const c of getCountries()) entries.push(entry(`/airports/${c.slug}`, 'weekly', 0.6));
    for (const c of getCities()) if (c.count > 1) entries.push(entry(`/city/${c.slug}`, 'weekly', 0.6));
    // Event guides (World Cup final etc.) — small, high-intent, freshness matters.
    entries.push(entry('/events', 'weekly', 0.6));   // permanent hub
    for (const s of getEventSlugs()) entries.push(entry(`/event/${s}`, 'daily', 0.8));
    // Airline pages are noindex (thin across ~976 codes) — intentionally not listed.

    // Top routes out of mega airports, harvested from the live boards and cross-confirmed
    // on both ends (scripts/harvest-top-routes.mjs). Only pairs with repeated evidence are
    // listed, so a route that fades from the boards stops being advertised instead of
    // pointing the crawler at a noindexed page. "Flights X to Y today" is the highest-intent
    // query family the site can answer.
    const seenPair = new Set<string>();
    for (const [origin, pairs] of Object.entries(getTopRoutes())) {
      void origin;
      for (const pair of pairs) {
        if (seenPair.has(pair)) continue;
        seenPair.add(pair);
        entries.push(entry(`/route/${pair}`, 'daily', 0.7));
      }
    }
  }

  for (const iata of slice) {
    const hub = HUBS.has(iata);
    const cf: Freq = hub ? 'hourly' : 'daily';
    entries.push(entry(`/airport/${iata}`, cf, hub ? 1.0 : 0.6));
    // Only hubs advertise arrivals/departures subpages. For the long tail these are
    // usually empty "No flights" near-dupes; listing them wasted crawl budget and fed
    // the mass-exclusion wave. They stay reachable (footer/board links) and indexable
    // when they DO have flights (robots gate in each subpage) — just not in the sitemap.
    if (SUBPAGE_HUBS.has(iata)) {
      entries.push(entry(`/airport/${iata}/arrivals`, cf, 0.9));
      entries.push(entry(`/airport/${iata}/departures`, cf, 0.9));
    }
  }

  return entries;
}
