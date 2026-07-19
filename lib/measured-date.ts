/**
 * Render the schedule-measurement date the way a reader of this locale writes dates.
 *
 * serviceMeasuredOn() returns a bare "YYYY-MM-DD", and it was being interpolated straight into
 * translated prose: "…bieten 461 mit Stand 2026-07-18 planmäßigen Passagierverkehr", "2026-07-18
 * 現在、461か所で…", "截至2026-07-18". That sentence is the site's one exclusive, quotable fact,
 * and it appears in the meta description, in the visible answer paragraph and inside FAQPage
 * JSON-LD — so the raw ISO string was showing up on all three surfaces across ~30,000 pages.
 *
 * The server has full ICU (node reports icu 75.1), so this costs nothing.
 *
 * For MACHINE-readable fields — dateModified, temporalCoverage, <time datetime> — keep passing
 * the raw ISO value. Those want a parseable date, not a human one.
 */
export function localizedMeasuredOn(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' })
      .format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;   // unparseable or unknown locale — the ISO string is still true
  }
}
