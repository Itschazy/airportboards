/**
 * Should the title append the city after the airport name?
 *
 * "no" when the name already contains it — "Sochi Airport, Sochi" is noise.
 *
 * The naive test compares the LOCALISED name against the LOCALISED city, and that broke the
 * moment 238 corrupted localised names were deleted and started falling back to English: the
 * English name no longer matches a Hindi city, so the check said "append" and produced
 * "Václav Havel Airport Prague, प्राग (PRG)" — the same place twice, in two scripts. 36 titles
 * across hi, ko and ru.
 *
 * Testing the English city too closes it, because whichever way the name resolved, one of the
 * two comparisons lines up. Both are already on hand at every call site.
 */
export function showCityFlag(name: string, localisedCity: string, englishCity?: string | null): 'yes' | 'no' {
  const n = name.toLowerCase();
  if (localisedCity && n.includes(localisedCity.toLowerCase())) return 'no';
  if (englishCity && n.includes(englishCity.toLowerCase())) return 'no';
  return 'yes';
}
