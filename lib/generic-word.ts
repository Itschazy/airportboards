/**
 * Should the title append a generic word like "airport" after the name, and which one?
 *
 * Native evaluation found that searchers in several markets attach it — 인천공항, 羽田空港,
 * İstanbul Havalimanı — while our stored names are bare. But a blanket rule is wrong twice over:
 *
 *   - a name that already carries the word would double it ("공항공항"), and Arabic already has
 *     مطار in its template, so appending there would have produced مطار مطار دبي on 6,041 pages;
 *   - 40 of our records are not airports. Calling a heliport or a seaplane base an "airport" is a
 *     false statement about a real place, and the challenge pass caught it precisely because it
 *     counted the unserved long tail that the first evaluation had skipped.
 *
 * So the decision needs the facility type, which now lives in data/airports.json (absent means an
 * ordinary airport — the common case, kept out of the file to save bytes).
 */
/** English names that say outright this is not an ordinary airport. */
const NOT_AN_AIRPORT = /\b(heliport|seaplane|balloonport|helipad)\b/i;

export type Facility = 'heliport' | 'seaplane' | 'balloonport' | 'closed' | undefined;

/** Words that already mean "airport" in this locale, in the scripts the data actually uses. */
const ALREADY: Record<string, RegExp> = {
  ko: /공항|비행장|기지|헬기장/,
  ja: /空港|飛行場|基地|ヘリポート/,
  zh: /机场|機場|直升机场/,
  tr: /Havaliman|Havaalan|Hava Üss/i,
  de: /Flughafen|Flugplatz|Landeplatz|Airport/i,
  es: /Aeropuerto|Aeródromo|Airport/i,
  hi: /एयरपोर्ट|हवाई ?अड्डा|Airport/i,
};

/** Locales whose NAMES already carry the generic word, so surrounding copy must not repeat it. */
export const GENERIC_LOCALES = new Set(['ko']);

/** The generic word itself, per locale. Only locales where a native pass approved one. */
const WORD: Record<string, string> = {
  ko: '공항',
};

/**
 * The word to append, or '' to append nothing.
 *
 * Returns '' for a name that already says it, for a locale with no approved word, and for any
 * facility that is not an ordinary airport — those keep their bare name, which is exactly what
 * they render today, so there is no regression and no false claim.
 */
export function genericWord(
  locale: string,
  name: string,
  facility?: Facility,
  opts?: { served?: boolean; englishName?: string },
): string {
  if (facility) return '';                       // heliport, seaplane base, balloonport, closed
  // Scheduled service is the load-bearing condition, and it does more work than the facility
  // flag ever could. It removes the word from 3,051 records with no flights — which is also
  // where the tautology lived, because the no-service notice already says "havalimanından" /
  // "공항" in its own sentence — and it cuts the non-airports that slip past the facility data
  // from ~100 to a handful, without needing that data to be complete.
  if (opts?.served !== true) return '';
  // The facility field comes from OurAirports, which does not know about every heliport either:
  // AEI (Algeciras Heliport), KQA (Akutan Seaplane Base) and XRH (RAAF Base Richmond) all
  // reached production as "공항". The English name we always have says so plainly.
  if (opts.englishName && NOT_AN_AIRPORT.test(opts.englishName)) return '';
  const word = WORD[locale];
  if (!word) return '';
  const already = ALREADY[locale];
  if (already && already.test(name)) return '';
  return word;
}
