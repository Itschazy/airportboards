import fs from 'fs';
import path from 'path';
import { genericWord, type Facility } from '@/lib/generic-word';

// Localized airport names (data/airport-names.json) so /ru shows "Шереметьево",
// /zh "谢列梅捷沃" etc. in titles, H1 and the board header. Server-only (fs).
const FILE = path.join(process.cwd(), 'data/airport-names.json');
let NAMES: Record<string, Record<string, string>> | null = null;

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
  if (!NAMES) {
    try { NAMES = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { NAMES = {}; }
  }
  const n = NAMES![iata.toUpperCase()]?.[locale];
  const name = n && n.length > 0 ? n : fallback;
  // The fallback is the English name, which already ends in "Airport" — never suffix that.
  if (!n || n.length === 0) return name;
  return name + genericWord(locale, name, facilityOf(iata));
}
