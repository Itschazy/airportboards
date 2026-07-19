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
export function genericWord(locale: string, name: string, facility?: Facility): string {
  if (facility) return '';                       // heliport, seaplane base, balloonport, closed
  const word = WORD[locale];
  if (!word) return '';
  const already = ALREADY[locale];
  if (already && already.test(name)) return '';
  return word;
}
