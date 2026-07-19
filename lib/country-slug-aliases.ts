/**
 * Country slugs that used to exist and no longer do, mapped to their successor.
 *
 * Country slugs are derived from the display name, so correcting a name silently changes a
 * URL. When "Burma" became "Myanmar", /en/airports/burma — a page that answers 200 today and
 * is listed in the sitemap — would have started 404ing, taking whatever it had earned with it.
 *
 * Netherlands Antilles is the awkward one: it dissolved into three territories, so there is no
 * single successor. It points at Curaçao, which holds the largest airport of the three (CUR);
 * the other two are one hop away from there.
 *
 * Redirects are permanent (308) so engines replace the old URL rather than keeping both.
 */
export const COUNTRY_SLUG_ALIASES: Record<string, string> = {
  'burma': 'myanmar',
  'macedonia': 'north-macedonia',
  'netherlands-antilles': 'curacao',
};
