/**
 * Which message namespaces travel to the browser.
 *
 * next-intl serialises whatever `NextIntlClientProvider` is handed into the page — twice, in
 * the HTML and again in the RSC payload — and the layout was handing it the entire catalogue.
 * Six of the ten namespaces are read only by Server Components, which resolve translations on
 * the server and never touch the client provider, so they were being shipped to every reader
 * on every page for nothing.
 *
 * The cost is not shared evenly, which is why this is an internationalisation fix and not a
 * performance one. Measured on the catalogues alone, gzip -6: en 5,186 B, ru 6,936 B, ar
 * 6,506 B, hi 7,054 B. A language written outside Latin-1 pays two to three bytes per
 * character before compression, so the reader who most needs the translation is the one
 * charged most for the part of it nobody renders.
 *
 * The four kept here are every namespace reached from a `'use client'` file through the import
 * graph — FlightBoard and SiteHeader take `ui` and `nav`, CookieNotice takes `legal`,
 * WidgetBuilder takes `home`. That set is re-derived from the source and asserted by
 * scripts/check-client-messages.mjs, because the failure mode is silent: a missing namespace
 * does not throw in production, it renders the key, and it would do so in twelve languages
 * at once while English — the one an author is most likely to open — kept working.
 */
export const CLIENT_NAMESPACES = ['home', 'legal', 'nav', 'ui'] as const;

export function clientMessages(all: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const ns of CLIENT_NAMESPACES) if (ns in all) out[ns] = all[ns];
  return out;
}
