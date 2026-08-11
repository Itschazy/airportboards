import fs from 'fs';
import path from 'path';
import { genericWord, type Facility } from '@/lib/generic-word';
import { serviceLevel } from '@/lib/warm';

// Localized airport names (data/airport-names.json) so /ru shows "Шереметьево",
// /zh "谢列梅捷沃" etc. in titles, H1 and the board header. Server-only (fs).
const FILE = path.join(process.cwd(), 'data/airport-names.json');
let NAMES: Record<string, Record<string, string>> | null = null;
function ensureNames(): Record<string, Record<string, string>> {
  if (!NAMES) {
    try { NAMES = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { NAMES = {}; }
  }
  return NAMES!;
}

type AirportRecord = { iata: string; facility?: string };
let FACILITY: Map<string, string> | null = null;
function facilityOf(iata: string): Facility {
  if (!FACILITY) {
    FACILITY = new Map();
    try {
      const rows = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/airports.json'), 'utf8')) as AirportRecord[];
      for (const r of rows) if (r.facility) FACILITY.set(r.iata, r.facility);
    } catch { /* absent means ordinary airport, which is the common case anyway */ }
  }
  return FACILITY.get(iata.toUpperCase()) as Facility;
}


/**
 * Airports whose localised name is indistinguishable from a neighbour's in the same city.
 *
 * Houston has three served airports and every locale called all three of them "Houston" —
 * "Хьюстон", "休斯顿", "ヒューストン" — so the only thing telling them apart on the page was the
 * three-letter code. Measured across 73 cities with more than one served airport: 50 airports
 * affected in de/fr/es/it/tr, 48 in zh/ko, 47 ja, 44 ar, 41 ru, 35 hi.
 *
 * Where that happens the English name is used instead, because it is the one that actually
 * distinguishes: "William P Hobby Airport" and "George Bush Intercontinental" beat a second
 * and third "Хьюстон". Coining Russian names for fifty airports is exactly the kind of
 * invention this project has been removing all week.
 *
 * Deliberately narrow. It fires ONLY on an identical collision between siblings — not on "the
 * airport is named after its city", which is usually correct and would have replaced a perfectly
 * good "Брисбен" with "Brisbane International Airport". Grouping is by city AND country, because
 * grouping by name alone merges Aberdeen in South Dakota with Aberdeen in Scotland and invents a
 * collision that does not exist.
 *
 * Read with fs rather than imported: lib/airports imports lib/warm, which imports this file.
 */
let AMBIGUOUS: Set<string> | null = null;
function isAmbiguous(iata: string, locale: string): boolean {
  if (!AMBIGUOUS) {
    AMBIGUOUS = new Set();
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/airports.json'), 'utf8'));
      const rows = (raw.airports ?? raw) as Array<{ iata: string; city?: string; country?: string }>;
      const byCity = new Map<string, string[]>();
      for (const r of rows) {
        if (!r.city || serviceLevel(r.iata) === null || (serviceLevel(r.iata) ?? 0) <= 0) continue;
        const key = `${r.city}|${r.country ?? ''}`;
        byCity.set(key, [...(byCity.get(key) ?? []), r.iata]);
      }
      const names = ensureNames();
      for (const codes of byCity.values()) {
        if (codes.length < 2) continue;
        for (const loc of Object.keys(names[codes[0]] ?? {})) {
          const seen = new Map<string, string[]>();
          for (const code of codes) {
            const n = names[code]?.[loc];
            if (n) seen.set(n, [...(seen.get(n) ?? []), code]);
          }
          for (const [, group] of seen) {
            if (group.length > 1) for (const code of group) AMBIGUOUS!.add(`${code}|${loc}`);
          }
        }
      }
    } catch { /* no data means no ambiguity we can detect */ }
  }
  return AMBIGUOUS.has(`${iata.toUpperCase()}|${locale}`);
}

/**
 * The airport's name in this locale.
 *
 * Some locales store a bare short form where the language expects the generic word attached —
 * Korean searchers type 인천공항, not 인천 — so genericWord() appends it where a native pass
 * approved one and the name does not already carry it. Applied HERE rather than in the title
 * template on purpose: the name appears in roughly twenty places on a page, including the h1,
 * the FAQ answers and Airport.name in the JSON-LD that Google reads as the entity's name.
 * Fixing only the <title> would leave the other nineteen disagreeing with it.
 */
export function getAirportName(iata: string, locale: string, fallback: string): string {
  const n = isAmbiguous(iata, locale) ? undefined : ensureNames()[iata.toUpperCase()]?.[locale];
  const name = n && n.length > 0 ? n : fallback;
  // The fallback is the English name, which already ends in "Airport" — never suffix that.
  if (!n || n.length === 0) return name;
  return name + genericWord(locale, name, facilityOf(iata), {
    served: (serviceLevel(iata) ?? 0) > 0,
    englishName: fallback,
  });
}

/**
 * The stored name WITHOUT any generic word.
 *
 * showCityFlag decides whether to append the city by looking for it inside the name, and the
 * suffix can contain a city as a substring — Turkish "Havalimanı" contains "lima", which would
 * have silently dropped "Lima" from Jorge Chávez's title. The decision belongs to the bare name.
 */
export function getAirportNameBare(iata: string, locale: string, fallback: string): string {
  if (!NAMES) {
    try { NAMES = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { NAMES = {}; }
  }
  const n = NAMES![iata.toUpperCase()]?.[locale];
  return n && n.length > 0 ? n : fallback;
}
