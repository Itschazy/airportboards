/**
 * IATA codes that an airport used to hold, mapped to the code it holds now.
 *
 * This is deliberately NOT the `closed` / `successor` mechanism in data/airports.json. That
 * one describes a real airport that shut and handed its traffic to a different airport
 * (Tegel → Brandenburg): two places, two sets of runways, and the old page stays up to say
 * so. A code change is the opposite situation — one airport, one set of runways, a new
 * label. Modelling it as a closure would publish a false statement ("Astana International
 * Airport closed"), so these redirect instead.
 *
 * ASTANA: the source airport list carried the airport under `TSE`, with its city recorded as
 * "Tselinograd" — the name the city lost in 1961. The live code has been `NQZ` since 2020.
 * The damage was not cosmetic: /airport/NQZ answered 404 for the code every traveller and
 * every airline actually uses, while /airport/TSE was in the sitemap announcing
 * "No scheduled flights" for an airport with roughly a hundred daily departures — a
 * categorically false claim on an indexed page, and one an AI crawler will quote verbatim.
 *
 * A permanent redirect keeps whatever authority the indexed TSE URL accumulated and moves it
 * onto the live code, which is exactly what 308 is for.
 */
export const IATA_ALIASES: Record<string, string> = {
  TSE: 'NQZ',   // Astana International — code retired 2020, city name stale since 1961
};

/** The current code for a possibly-retired one, or null if this code is not an alias. */
export function currentIata(code: string): string | null {
  return IATA_ALIASES[code.toUpperCase()] ?? null;
}
