const BRAND = 'AirportsBoard';
const SUFFIX = ` — ${BRAND}`;

/**
 * Roughly how wide a title renders, in units of one Latin character.
 *
 * A search result truncates on PIXELS, not characters, so counting characters over-states how
 * much fits in CJK and under-states it for wide Latin. Full-width CJK, kana and Hangul take
 * about twice the width of a Latin letter; everything else is close enough to one.
 */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const wide =
      (c >= 0x1100 && c <= 0x115F) ||    // Hangul jamo
      (c >= 0x2E80 && c <= 0xA4CF) ||    // CJK radicals, kana, CJK ideographs
      (c >= 0xAC00 && c <= 0xD7A3) ||    // Hangul syllables
      (c >= 0xF900 && c <= 0xFAFF) ||    // CJK compatibility
      (c >= 0xFF00 && c <= 0xFF60);      // full-width forms
    w += wide ? 2 : 1;
  }
  return w;
}

/** About what a search result shows before it truncates, in the same units. */
const BUDGET = 60;

/**
 * Append the site name — but only when it does not cost a keyword its place.
 *
 * The suffix was hardcoded in seven files and applied by page type rather than by fit, which
 * got it exactly backwards. Measured across five locales: route titles run to a median of 66
 * and a maximum of 77, with 20 of 25 over budget, and every one of them carried the brand;
 * city, country and A–Z titles sit at 34–45, where the brand costs nothing because the space
 * is empty anyway. So the brand was being paid for precisely where it could not be afforded.
 *
 * Airport pages — the bulk of the site — never had it and still do not; their titles are the
 * ones already using the full budget on intent keywords.
 *
 * Dropping it entirely would be the wrong trade: Google shows a site name beside the title and
 * derives it from the Organization/WebSite markup, so brand recall is worth having when it is
 * free. This keeps it whenever it is.
 */
export function withBrand(title: string): string {
  return displayWidth(title + SUFFIX) <= BUDGET ? title + SUFFIX : title;
}

export { BRAND, displayWidth, BUDGET };
