import airportsRaw from '@/data/airports.json';
import fs from 'fs';
import path from 'path';

export type AirportType = 'large_airport' | 'medium_airport' | 'small_airport';

export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  iso2: string;
  lat: number;
  lon: number;
  elev: number;
  /** IANA zone, or null when the source dump had no usable value (see scripts/fix-airport-tz.mjs). */
  tz: string | null;
  /** Year the airport stopped handling commercial traffic. Absent for operating airports. */
  closed?: number;
  /** IATA of the airport that took the traffic over, when one did. */
  successor?: string;
}

const airports = airportsRaw as Airport[];

const byIata = new Map<string, Airport>(airports.map(a => [a.iata, a]));

// Popularity bonus so major hubs beat obscure same-score airports
const HUB_WEIGHT = new Map<string, number>([
  ...(['LHR','CDG','DXB','JFK','LAX','HND','NRT','PEK','PVG','HKG','SIN','ICN','FRA','AMS','IST'] as string[]).map(c => [c, 25] as [string, number]),
  ...(['SVO','ORD','ATL','EWR','LGA','BOS','SFO','MIA','DFW','DEN','SEA','LGW','FCO','BCN','MAD','MUC','ZRH','CPH','BRU','VIE','HEL','LIS','ARN','OSL','GVA','LED','SYD','MEL','BOM','DEL','BKK','KUL','CGK','GRU','GIG','MEX','BOG','LIM'] as string[]).map(c => [c, 15] as [string, number]),
  ...(['MAN','BHX','EDI','LCY','LTN','STN','PMI','AGP','NCE','MRS','TLS','BOD','NTE','OPO','BRE','HAM','DUS','CGN','STR','MXP','LIN','VCE','NAP','BLQ','PMO','ATH','SAW','ADB','AYT','DLM','BGY','CIA','LPA','TFS','ACE'] as string[]).map(c => [c, 8] as [string, number]),
  // Target markets (US/UK/CA/AU/DE) were badly under-weighted: there were no Canadian
  // airports here at all, so /airports/canada fell back to alphabetical-by-official-name
  // and listed Toronto 338th. TXL and SXF were removed above — both closed in 2020.
  ...(['YYZ','YVR','YUL','YYC','YEG','YOW','YHZ'] as string[]).map(c => [c, 12] as [string, number]),
  ...(['BNE','PER','ADL','OOL','CNS'] as string[]).map(c => [c, 12] as [string, number]),
  ...(['LAS','PHX','MCO','MSP','DTW','IAH','CLT','BWI','SLC','SAN','TPA','PDX'] as string[]).map(c => [c, 10] as [string, number]),
  ...(['BRS','NCL','GLA','BFS'] as string[]).map(c => [c, 8] as [string, number]),
  ...(['BER','NUE','LEJ'] as string[]).map(c => [c, 10] as [string, number]),
]);

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

export function getAllIataCodes(): string[] {
  return airports.map(a => a.iata);
}

// Airports per child sitemap. Each airport emits 3 page types × N locales
// URLs; 1000 × 3 × 12 = 36,000, safely under Google's 50,000-URL cap.
// Shared by app/sitemap.ts (children) and app/sitemap.xml (index).
export const AIRPORTS_PER_SITEMAP = 1000;

export function getSitemapCount(): number {
  return Math.ceil(getAllIataCodes().length / AIRPORTS_PER_SITEMAP);
}

// Airports pre-rendered at build time (instant load + crawled first).
// Everything else renders on-demand via ISR and is cached after first hit.
// Keeps the build fast instead of generating ~164k pages every deploy.
export function getStaticIataCodes(): string[] {
  // Prerender only the top ~30 hubs at BUILD time — each page now SSR-fetches its
  // flight board, and the small VDS runs low on disk/time. The rest render on-demand
  // via ISR (still fully indexable, just generated on first hit).
  const top = [...HUB_WEIGHT.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const ordered = [...new Set([...POPULAR_AIRPORTS, ...top])].filter(iata => byIata.has(iata));
  return ordered.slice(0, 30);
}

// Multilingual search aliases (city/airport names in 12 languages), loaded
// once from the generated index. Server-only (fs) — lib/airports reaches
// client components only as a type import, so this never hits the browser.
let ALIASES: Record<string, string[]> | null = null;
function aliasesOf(iata: string): string[] {
  if (!ALIASES) {
    try {
      ALIASES = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/airport-aliases.json'), 'utf8'));
    } catch { ALIASES = {}; }
  }
  return ALIASES![iata] || [];
}

/**
 * The localised city and airport names, for the search index.
 *
 * Read with fs rather than imported, exactly like the aliases above, and for a hard reason:
 * `getAirportName` lives in lib/airport-names, which imports lib/warm, which imports this file.
 * Importing it here closes the cycle and the module graph breaks at build time.
 *
 * Why this is needed at all: the search index was built only from the English source fields,
 * while every page PRINTS the localised name. Measured on production against 60 served airports
 * per locale, searching for the exact name the site had just displayed failed in hi 53%, ko 48%,
 * ja 40%, zh 38%, ar 38%, ru 13%, de 7% of cases — "अरखांगेल्स्क", "아르한겔스크", "アルハンゲリスク" and
 * "أرخانغلسك" all returned nothing for Arkhangelsk. The aliases file covers the big airports
 * well (16.5 entries each) but is not a substitute for the names the site itself renders.
 */
/**
 * Сколько вылетов в сутки измерено у аэропорта. Нужен как ВТОРОЙ ключ сортировки выдачи.
 *
 * До этого ничью разрешал `a.city.localeCompare(b.city)`, а у аэропортов одного города он
 * возвращает 0 — и порядок доставался позиции строки в data/airports.json. Замер на запросе
 * «москва»: BKA и OSF (по нулю рейсов) стояли ВЫШЕ Домодедова (51) и Внукова (89). Человек,
 * ищущий московский аэропорт, первыми видел два аэродрома без единого рейса.
 */
let SERVICE: Record<string, number> | null = null;
function serviceOf(iata: string): number {
  if (!SERVICE) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/airport-service.json'), 'utf8'));
      SERVICE = (raw.airports ?? raw) as Record<string, number>;
    } catch { SERVICE = {}; }
  }
  return SERVICE[iata] ?? 0;
}

let LOCAL_NAMES: { city: Record<string, Record<string, string>>; air: Record<string, Record<string, string>> } | null = null;
function localNames() {
  if (!LOCAL_NAMES) {
    const read = (f: string) => {
      try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', f), 'utf8')); }
      catch { return {}; }
    };
    LOCAL_NAMES = { city: read('city-names.json'), air: read('airport-names.json') };
  }
  return LOCAL_NAMES;
}

// Cyrillic → Latin fallback so a Russian-typed name can also match EN data.
const CYR: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y',
  'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
  'х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
};
const translit = (s: string) => s.split('').map(c => CYR[c] ?? c).join('');
const hasCyrillic = (s: string) => /[а-яё]/i.test(s);

// Generic "airport" / filler words across languages — dropped from queries so
// "Dubai airport" or "aéroport de Roissy" still match by the meaningful words.
const STOP = new Set([
  'airport','airfield','aerodrome','intl','international','air','field',
  'aeroport','aeropuerto','aeroporto','flughafen','havalimani','lufthavn','luchthaven',
  'аэропорт','аэропорта','аэропорту','аэропорты','مطار','हवाई','अड्डा','विमानतल','공항','空港',
  'de','del','la','le','el','les','du','des','the','of','und','and','y','di','da','do','dos','en','het',
]);

// Levenshtein/Damerau distance ≤ 1 (one insert/delete/substitution/swap) — for typos.
function within1edit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) { // substitution or adjacent transposition
    let diff = -1, n = 0;
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) { if (++n > 2) return false; if (diff < 0) diff = i; }
    if (n <= 1) return true;
    return n === 2 && diff >= 0 && a[diff] === b[diff + 1] && a[diff + 1] === b[diff];
  }
  const s = la < lb ? a : b, l = la < lb ? b : a; // s shorter by 1
  let i = 0, j = 0, skipped = false;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; }
    else { if (skipped) return false; skipped = true; j++; }
  }
  return true;
}
/**
 * Strip diacritics so "aéroport"/"Dubái"/"Düsseldorf" fold to plain ASCII.
 *
 * The range is the whole point. This stripped U+0300–U+036F alone — the COMBINING
 * DIACRITICAL MARKS block, which is Latin. Every other script keeps its marks somewhere
 * else, so an Arabic reader who types the damma they were taught to write got nothing:
 * measured on a built server, "دبي" returned DXB DWC ADU NUW and "دُبي" returned an empty
 * list. The mark survived folding and no needle in the index carries one.
 *
 * Two other classes are folded away because no search box distinguishes them:
 *   - hamza seats and the like — أ إ آ ؤ ئ decompose under NFD and lose their hamza with
 *     the marks above; ٱ has no decomposition, so it is mapped by hand;
 *   - alef maksura ى → ي and ta marbuta ة → ه, which are spelling variants of the same
 *     word ("القاهرة"/"القاهره"), plus tatweel, which is decoration and carries no sound.
 *
 * Index and query both pass through this function, so it cannot drift out of agreement
 * with itself — a wrong rule here loses recall, it never splits the two sides apart.
 */
const MARKS = /[̀-ًͯ-ٰٟۖ-ۭ]/g;
const fold = (s: string) => s.normalize('NFD')
  .replace(MARKS, '')
  .replace(/ـ/g, '')          // tatweel — a stretched joining line, not a letter
  .replace(/ٱ/g, 'ا')    // alef wasla → alef
  .replace(/ى/g, 'ي')    // alef maksura → ya
  .replace(/ة/g, 'ه');   // ta marbuta → ha
const splitWords = (s: string) =>
  fold(s.toLowerCase()).split(/[\s,.'/()\-_:;]+/).filter(Boolean);

// Generic "airport" words in non-spaced scripts — removed from the query so a
// CJK/Arabic/Hindi search keeps only the meaningful city/airport part.
const NATIVE_AIRPORT = [
  '国际机场','國際機場','机场','機場','国际','國際','空港','国際','공항','국제공항','국제',
  'مطار الدولي','المطار','مطار','हवाई अड्डा','हवाईअड्डा','हवाई','अड्डा','विमानतल',
].map(fold);

/**
 * Both lists above are compared against a string that has ALREADY been folded, so they have
 * to be folded too — otherwise they only match the inputs folding happens to leave alone.
 * Korean was the casualty: NFD decomposes 공항 into jamo, the literal '공항' stays composed,
 * and `cleaned.includes('공항')` was therefore false for every Korean query ever typed.
 */
const STOP_FOLDED = new Set([...STOP].map(fold));

// Per-airport "needles": every searchable token (iata, name/city words, country,
// whole city, and all multilingual aliases + their words). Built once, cached.
let NEEDLES: Map<string, string[]> | null = null;
/**
 * Страна — ОТДЕЛЬНЫЙ и намеренно слабый признак.
 *
 * Раньше она лежала в том же наборе, что и город, то есть весила ровно столько же: префикс
 * 40 очков. Посимвольный прогон показал, чем это кончается: по запросам «к», «ка», «каз»,
 * «каза» аэропорта Казани в выдаче НЕТ вовсе — на «каз» совпал 31 аэропорт, 22 из них
 * казахстанские, и все с теми же сорока очками, а разрешал ничью алфавит. KZN появлялся
 * только с пятого символа. При этом «Казань» — вторая по посещаемости страница сайта
 * (2095 визитов за 30 дней).
 *
 * Убирать страну целиком нельзя: запрос «Казахстан» — законный и должен что-то находить.
 * Поэтому она осталась, но её вклад ограничен COUNTRY_MAX и считается ТОЛЬКО когда по
 * основным признакам не совпало ничего, — так совпадение по городу всегда впереди.
 */
let COUNTRY_NEEDLES: Map<string, string[]> | null = null;
function countryNeedlesOf(a: Airport): string[] {
  if (!COUNTRY_NEEDLES) COUNTRY_NEEDLES = new Map();
  let n = COUNTRY_NEEDLES.get(a.iata);
  if (n) return n;
  const set = new Set<string>();
  if (a.country) {
    set.add(fold(a.country.toLowerCase()));
    for (const w of splitWords(a.country)) if (w.length >= 2) set.add(w);
  }
  n = [...set].filter(Boolean);
  COUNTRY_NEEDLES.set(a.iata, n);
  return n;
}

/**
 * Потолок вклада страны.
 *
 * Сначала я поставил 8 — ниже подстроки в названии города, — и получил обратную беду:
 * по-английски «india» перестала находить индийские аэропорты (10 из 10 в топе → 0),
 * «russia» дала 1 из 10. Причина не в самом потолке, а в том, что он убрал противовес
 * мусорным алиасам: в data/airport-aliases.json лежали 94 строки вида «Altoona (in other
 * languages omitted)» и «Dalanzadgad (note: do not include English per instructions)», и
 * запрос «russia» цеплялся ПРЕФИКСОМ за слово «Russian» внутри них, получая 40 очков
 * против восьми у настоящей страны. Мусор вычищен, а потолок поднят до 24: страна
 * по-прежнему слабее точного совпадения (100) и префикса в названии города (40), но
 * сильнее случайной подстроки (12).
 *
 * ТОЧНОЕ совпадение со страной под этот потолок НЕ попадает — см. COUNTRY_EXACT. Запрос
 * «india» дословно равен названию страны, и человек имеет в виду именно её; при потолке
 * 24 он проигрывал префиксу «Indianapolis» (40) и индийских аэропортов в выдаче не было
 * вовсе. То же с «russia» и «france».
 */
const COUNTRY_MAX = 24;

/**
 * Вес ТОЧНОГО совпадения со страной: выше префикса в названии города (40), ниже точного
 * совпадения с городом или кодом (100). «india» находит Индию, «Казань» — Казань.
 */
const COUNTRY_EXACT = 60;

function needlesOf(a: Airport): string[] {
  if (!NEEDLES) NEEDLES = new Map();
  let n = NEEDLES.get(a.iata);
  if (n) return n;
  const set = new Set<string>();
  set.add(a.iata.toLowerCase());
  if (a.icao) set.add(a.icao.toLowerCase());
  set.add(fold(a.city.toLowerCase()));
  for (const w of splitWords(a.name)) set.add(w);
  for (const w of splitWords(a.city)) set.add(w);
  for (const al of aliasesOf(a.iata)) {
    const l = fold(al.toLowerCase());
    set.add(l);
    for (const w of splitWords(al)) if (w.length >= 2) set.add(w);
  }
  // Every localised name the site can print for this airport. Whole name and words, so both
  // "аэропорт Архангельск" and "Архангельск" hit. Deduped by the Set, and the whole index only
  // grows about 1.4x because most localisations share tokens with the English source.
  const ln = localNames();
  for (const src of [ln.city[a.city], ln.air[a.iata]]) {
    if (!src) continue;
    for (const value of Object.values(src)) {
      if (typeof value !== 'string' || !value) continue;
      const f = fold(value.toLowerCase());
      if (f) set.add(f);
      for (const w of splitWords(value)) if (w.length >= 2) set.add(w);
    }
  }
  n = [...set].filter(Boolean);
  NEEDLES.set(a.iata, n);
  return n;
}

// How strongly a query token matches an airport's needles (0 = no match).
// Recomposed first: the token arrives folded, i.e. NFD, and a Hangul syllable in NFD is a run
// of jamo outside every range below — Korean would never be recognised as CJK.
const isCJK = (s: string) => /[　-鿿가-힯぀-ヿ]/.test(s.normalize('NFC'));

// Match strength of a query token against an airport's needles.
// 100 exact · 40 prefix · 12 substring/CJK-part · 5 fuzzy(1 typo) · 0 none.
function tokenScore(tok: string, needles: string[]): number {
  const cjk = isCJK(tok);
  const cands = hasCyrillic(tok) ? [tok, translit(tok)] : [tok];
  let best = 0;
  for (const nd of needles) {
    for (const c of cands) {
      if (nd === c) return 100;
      if (c.length >= 2 && nd.startsWith(c)) best = Math.max(best, 40);
      else if ((c.length >= 3 || (cjk && c.length >= 2)) && nd.includes(c)) best = Math.max(best, 12);
      else if (cjk && c.length >= 2 && nd.length >= 2 && c.includes(nd)) best = Math.max(best, 12); // CJK concat
    }
  }
  if (best > 0) return best;
  for (const c of cands) {            // typo tolerance
    if (c.length < 4 || cjk) continue;
    for (const nd of needles) {
      if (nd.length >= 4 && Math.abs(nd.length - c.length) <= 1 && within1edit(c, nd)) return 5;
    }
  }
  return 0;
}

export function searchAirports(query: string, limit = 10): Airport[] {
  const raw = fold(query.trim().toLowerCase());
  if (!raw) return POPULAR_AIRPORTS.map(iata => byIata.get(iata)!).filter(Boolean);

  // Drop generic non-spaced "airport" words (CJK/Arabic/Hindi) before tokenizing
  let cleaned = raw;
  for (const w of NATIVE_AIRPORT) if (cleaned.includes(w)) cleaned = cleaned.split(w).join(' ');

  let tokens = splitWords(cleaned).filter(t => !STOP_FOLDED.has(t));
  if (tokens.length === 0) tokens = [cleaned.trim() || raw]; // all-stopword or CJK (no spaces)

  // Require most tokens to match (allow one descriptive extra to miss).
  const needed = Math.max(1, tokens.length - 1);

  const results: Array<Airport & { _score: number }> = [];
  for (const a of airports) {
    const needles = needlesOf(a);
    let sum = 0, matched = 0, strong = false;
    for (const tok of tokens) {
      const m = tokenScore(tok, needles);
      if (m > 0) { matched++; sum += m; if (m >= 40) strong = true; }
      else {
        // Запасной путь: по городу, названию и кодам не совпало — пробуем страну, но с
        // потолком и БЕЗ права считаться сильным совпадением.
        const cm = tokenScore(tok, countryNeedlesOf(a));
        if (cm > 0) { matched++; sum += cm >= 100 ? COUNTRY_EXACT : Math.min(cm, COUNTRY_MAX); }
      }
    }
    if (matched < needed) continue;
    if (matched < tokens.length && !strong) continue; // a token was skipped → need a strong anchor

    let score = sum + (HUB_WEIGHT.get(a.iata) ?? 0);
    if (a.iata.toLowerCase() === raw)            score = 100000;
    else if (fold(a.city.toLowerCase()) === raw) score += 30;
    results.push({ ...a, _score: score });
  }
  return results
    // Ничья разрешается по РАЗМЕРУ, а не по алфавиту: сначала вес хаба, затем измеренное
    // число вылетов в сутки, и только третьим ключом — алфавит. Иначе у аэропортов одного
    // города localeCompare возвращает 0 и порядок решает позиция строки в JSON.
    .sort((a, b) => b._score - a._score
      || (HUB_WEIGHT.get(b.iata) ?? 0) - (HUB_WEIGHT.get(a.iata) ?? 0)
      || serviceOf(b.iata) - serviceOf(a.iata)
      || a.city.localeCompare(b.city))
    .slice(0, limit)
    .map(({ _score, ...a }) => a);
}

// Seeds the homepage block AND, via getStaticIataCodes(), the top prerender/sitemap tier.
// Weighted to the markets that can actually be monetised — AdSense does not serve in
// Russia, so SVO/LED earn nothing here and gave up their slots to Toronto and Sydney.
export const POPULAR_AIRPORTS = [
  'JFK', 'LHR', 'CDG', 'DXB', 'YYZ', 'SIN', 'HND', 'LAX',
  'FRA', 'AMS', 'IST', 'ICN', 'PEK', 'ORD', 'ATL', 'SYD',
];

// Curated cities for the homepage SEO block (city → its primary airport).
export const POPULAR_CITIES: { name: string; code: string; iata: string }[] = [
  { name: 'New York', code: 'NYC', iata: 'JFK' },
  { name: 'London', code: 'LON', iata: 'LHR' },
  { name: 'Paris', code: 'PAR', iata: 'CDG' },
  { name: 'Dubai', code: 'DXB', iata: 'DXB' },
  { name: 'Istanbul', code: 'IST', iata: 'IST' },
  { name: 'Singapore', code: 'SIN', iata: 'SIN' },
  { name: 'Tokyo', code: 'TYO', iata: 'HND' },
  { name: 'Moscow', code: 'MOW', iata: 'SVO' },
  { name: 'Hong Kong', code: 'HKG', iata: 'HKG' },
  { name: 'Los Angeles', code: 'LAX', iata: 'LAX' },
  { name: 'Bangkok', code: 'BKK', iata: 'BKK' },
  { name: 'Frankfurt', code: 'FRA', iata: 'FRA' },
];

// ── Geolocation: nearest airports ──────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad, dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestAirports(lat: number, lon: number, n = 8): (Airport & { km: number })[] {
  return airports
    .map(a => ({ ...a, km: Math.round(haversine(lat, lon, a.lat, a.lon)) }))
    .sort((x, y) => x.km - y.km)
    .slice(0, n);
}

// ── Countries (for /airports/[country] SEO pages + homepage block) ──────────
export const slugify = (s: string) =>
  fold(s.toLowerCase()).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export interface CountryInfo { country: string; iso2: string; slug: string; count: number }
let COUNTRIES: CountryInfo[] | null = null;
export function getCountries(): CountryInfo[] {
  if (!COUNTRIES) {
    const m = new Map<string, CountryInfo>();
    for (const a of airports) {
      if (!a.country) continue;
      const e = m.get(a.country) || { country: a.country, iso2: a.iso2, slug: slugify(a.country), count: 0 };
      e.count++;
      m.set(a.country, e);
    }
    COUNTRIES = [...m.values()].sort((x, y) => y.count - x.count);
  }
  return COUNTRIES;
}
export function getCountryBySlug(slug: string): CountryInfo | undefined {
  return getCountries().find(c => c.slug === slug);
}
export function getAirportsByCountry(slug: string): Airport[] {
  const c = getCountryBySlug(slug);
  if (!c) return [];
  return airports
    .filter(a => a.country === c.country)
    .sort((a, b) => (HUB_WEIGHT.get(b.iata) ?? 0) - (HUB_WEIGHT.get(a.iata) ?? 0) || a.city.localeCompare(b.city));
}

// ── Cities (for /city/[slug] SEO pages — "аэропорты Москвы", multi-airport) ──
export interface CityInfo { city: string; country: string; iso2: string; slug: string; count: number }
let CITIES: CityInfo[] | null = null;
export function getCities(): CityInfo[] {
  if (!CITIES) {
    // Group by city slug, then keep ONE country per slug — the dominant one (biggest
    // hub weight, then most airports). Same-named cities across countries (Athens US
    // vs Athens GR, Barcelona VE vs ES, Naples US vs IT) previously merged into a
    // single mixed-country page listing both; now the page belongs to the dominant
    // city and the minor namesakes simply have no city page (their single airports
    // are still fully reachable via country/A–Z).
    const bySlug = new Map<string, Map<string, { city: string; country: string; iso2: string; count: number; weight: number }>>();
    for (const a of airports) {
      if (!a.city) continue;
      const slug = slugify(a.city);
      if (!slug) continue;
      const countries = bySlug.get(slug) || new Map();
      const e = countries.get(a.country) || { city: a.city, country: a.country, iso2: a.iso2, count: 0, weight: 0 };
      e.count++;
      e.weight = Math.max(e.weight, HUB_WEIGHT.get(a.iata) ?? 0);
      countries.set(a.country, e);
      bySlug.set(slug, countries);
    }
    CITIES = [...bySlug.values()].map(countries => {
      const dom = [...countries.values()].sort((x, y) => y.weight - x.weight || y.count - x.count)[0];
      const slug = slugify(dom.city);
      return { city: dom.city, country: dom.country, iso2: dom.iso2, slug, count: dom.count };
    }).sort((x, y) => y.count - x.count);
  }
  return CITIES;
}
export function getCityBySlug(slug: string): CityInfo | undefined {
  return getCities().find(c => c.slug === slug);
}
export function getAirportsByCity(slug: string): Airport[] {
  // Restrict to the slug's dominant country (see getCities) so same-named cities in
  // other countries don't leak onto the page (Athens page = Greek airports only).
  const info = getCityBySlug(slug);
  return airports
    .filter(a => a.city && slugify(a.city) === slug && (!info || a.country === info.country))
    .sort((a, b) => (HUB_WEIGHT.get(b.iata) ?? 0) - (HUB_WEIGHT.get(a.iata) ?? 0) || a.name.localeCompare(b.name));
}

// ── A-Z index ───────────────────────────────────────────────────────────────
export function getAirportsByLetter(letter: string): Airport[] {
  const L = fold(letter.toLowerCase());
  return airports
    .filter(a => fold((a.name || '').toLowerCase()).startsWith(L))
    .sort((a, b) => a.name.localeCompare(b.name));
}
