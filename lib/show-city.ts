/**
 * Fold a place name to its bare letters, so two spellings of the same place compare equal.
 *
 * NFKD splits accented letters into base + combining mark and folds full-width forms; stripping
 * everything that is not a letter or digit then removes the marks along with spaces, hyphens and
 * punctuation. "Ålesund" and "Alesund", "Алма‑Ата" (non-breaking hyphen) and "Алма-Ата",
 * "エルアリシュ" and "エル＝アリシュ" all land on the same string.
 */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
}

/**
 * Should the title append the city after the airport name?
 *
 * "no" when the name already contains it — "Sochi Airport, Sochi" is noise.
 *
 * Two things defeated the naive substring test, and both shipped as duplicated place names in
 * live titles:
 *
 *   1. Comparing the LOCALISED name against the LOCALISED city broke when 238 corrupted localised
 *      names were deleted and began falling back to English — an English name cannot contain a
 *      Hindi city, so the check appended one: "Václav Havel Airport Prague, प्राग".
 *   2. Even when both are in the same script, they are independently transliterated and differ by
 *      a hyphen, a space or a diacritic. Measured across all twelve locales: 2,716 titles printed
 *      the same place twice — hi 1,188, ar 269, en 252, ja 214, ko 213, ru 135.
 *
 * Folding both sides and testing the English city as well closes both.
 */
export function showCityFlag(name: string, localisedCity: string, englishCity?: string | null): 'yes' | 'no' {
  const n = fold(name);
  if (!n) return 'yes';
  for (const city of [localisedCity, englishCity]) {
    const c = city ? fold(city) : '';
    if (c && n.includes(c)) return 'no';
  }
  return 'yes';
}
