import sameAsRaw from '@/data/airport-sameas.json';

// Wikidata entity + English Wikipedia URLs per IATA code, built once by
// scripts/gen-sameas.mjs from the Wikidata Query Service (property P238).
//
// This is what turns an Airport node from a string into a resolved entity: an answer engine
// deciding whether "Heathrow", "LHR" and "London Heathrow Airport" are the same place — and
// whether this site is talking about the thing it already knows — keys on exactly this.
//
// Codes Wikidata maps to more than one entity are absent by design. A wrong sameAs merges two
// different airports in the graph, which is worse than having none: it would, for example,
// fuse Tegel into Brandenburg and make every fact about one apply to the other.
const MAP = sameAsRaw as Record<string, string[]>;

/** Wikidata/Wikipedia URLs for an airport, or an empty array when unmapped or ambiguous. */
export function sameAsFor(iata: string): string[] {
  return MAP[iata.toUpperCase()] ?? [];
}

/** Stable graph identifier for an airport, shared by every page that talks about it. */
export function airportNodeId(base: string, iata: string): string {
  return `${base}/en/airport/${iata.toUpperCase()}#airport`;
}
