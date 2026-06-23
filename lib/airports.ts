import airportsRaw from '@/data/airports.json';

export type AirportType = 'large_airport' | 'medium_airport' | 'small_airport';

export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  iso2: string;
  lat: number;
  lon: number;
  elev: number;
  tz: string;
}

const airports = airportsRaw as Airport[];

const byIata = new Map<string, Airport>(airports.map(a => [a.iata, a]));

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

export function getAllIataCodes(): string[] {
  return airports.map(a => a.iata);
}

export function searchAirports(query: string, limit = 10): Airport[] {
  const q = query.toLowerCase();
  return airports
    .filter(a =>
      a.iata.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    )
    .slice(0, limit);
}

export const POPULAR_AIRPORTS = [
  'JFK', 'LHR', 'CDG', 'DXB', 'SVO', 'SIN', 'HND', 'LAX',
  'FRA', 'AMS', 'IST', 'ICN', 'PEK', 'ORD', 'ATL', 'LED',
];
