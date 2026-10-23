import type { Airport } from '@/lib/airports';
import { airportNodeId, sameAsFor } from '@/lib/airport-sameas';

/**
 * Раньше полная сущность Airport была только на родительском табло; прилёты
 * отдавали голую ссылку @id. Читателю отдельной страницы приходилось обходить
 * другой URL, чтобы связать название с IATA/ICAO и координатами. Используем один
 * источник проверенных фактов в обеих страницах, с прежним общим @id и URL
 * аэропорта, а не URL направления. Это полнота графа, не обещание rich result.
 * Проверено на 12 локалях и на равенстве сущности в вылетах/прилётах.
 */
export function airportSchema(airport: Airport, name: string, city: string, canonical: string, BASE: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Airport',
    // A stable @id shared by every page about this airport, so the arrivals and departures
    // subpages reference the same node instead of declaring three lookalike airports.
    '@id': airportNodeId(BASE, airport.iata),
    iataCode: airport.iata,
    icaoCode: airport.icao,
    name,
    // Only worth stating when it differs — on /en it is the same string twice.
    ...(airport.name !== name ? { alternateName: airport.name } : {}),
    // Resolves this page to the Wikidata entity, turning a name into an identity an
    // answer engine can match against what it already knows. Absent for the ~4% of codes
    // Wikidata maps ambiguously; a wrong link would merge two airports in the graph.
    ...(sameAsFor(airport.iata).length ? { sameAs: sameAsFor(airport.iata) } : {}),
    url: canonical,
    address: {
      '@type': 'PostalAddress',
      // Both properties are omitted rather than emitted empty or wrong. addressCountry wants
      // an ISO 3166-1 alpha-2 code; falling back to the country NAME published invalid schema
      // on 238 airports, and among those names were states that no longer exist — SXM said
      // "Netherlands Antilles", dissolved in 2010. Backfilled from OurAirports per AIRPORT,
      // not per country name: those five Antillean airports resolve to three different codes
      // (BQ, CW, SX), so a name-based substitution would have merged three countries into one.
      // Локализованный город, а не исходный английский: на китайской странице разметка
      // сообщала «Kazan», пока FAQ на той же странице отвечал «喀山», и это прямое
      // расхождение разметки с видимым текстом.
      ...(airport.city ? { addressLocality: city } : {}),
      ...(airport.iso2 ? { addressCountry: airport.iso2 } : {}),
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: airport.lat,
      longitude: airport.lon,
    },
    // Machine-consumable map link; coordinates are present and validated for every
    // airport in the dataset. %2C-encoded to match Google's Maps URL API format.
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${airport.lat},${airport.lon}`)}`,
  };
}
