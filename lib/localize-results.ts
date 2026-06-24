import type { Airport } from '@/lib/airports';
import { getCityName, getCountryName } from '@/lib/places';
import { getAirportName } from '@/lib/airport-names';

// Localize the display fields of search/nearest results for the page locale,
// so the dropdown shows "Москва / Шереметьево / Россия" on /ru instead of Latin.
// IATA, iso2 (flag) and any extra fields (e.g. km) are preserved as-is.
export function localizeResults<T extends Airport>(list: T[], locale: string): T[] {
  if (locale === 'en') return list;
  return list.map(a => ({
    ...a,
    name: getAirportName(a.iata, locale, a.name),
    city: getCityName(a.city, locale),
    country: getCountryName(a.country, locale),
  }));
}
