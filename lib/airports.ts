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

// Popularity bonus so major hubs beat obscure same-score airports
const HUB_WEIGHT = new Map<string, number>([
  ...(['LHR','CDG','DXB','JFK','LAX','HND','NRT','PEK','PVG','HKG','SIN','ICN','FRA','AMS','IST'] as string[]).map(c => [c, 25] as [string, number]),
  ...(['SVO','ORD','ATL','EWR','LGA','BOS','SFO','MIA','DFW','DEN','SEA','LGW','FCO','BCN','MAD','MUC','ZRH','CPH','BRU','VIE','HEL','LIS','ARN','OSL','GVA','LED','SYD','MEL','BOM','DEL','BKK','KUL','CGK','GRU','GIG','MEX','BOG','LIM'] as string[]).map(c => [c, 15] as [string, number]),
  ...(['MAN','BHX','EDI','LCY','LTN','STN','PMI','AGP','NCE','MRS','TLS','BOD','NTE','OPO','BRE','HAM','DUS','CGN','STR','MXP','LIN','VCE','NAP','BLQ','PMO','ATH','SAW','ADB','AYT','DLM','BGY','CIA','TXL','SXF','LPA','TFS','ACE'] as string[]).map(c => [c, 8] as [string, number]),
]);

export function getAirport(iata: string): Airport | undefined {
  return byIata.get(iata.toUpperCase());
}

export function getAllIataCodes(): string[] {
  return airports.map(a => a.iata);
}

export function searchAirports(query: string, limit = 10): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_AIRPORTS.map(iata => byIata.get(iata)!).filter(Boolean);

  const results: Array<Airport & { _score: number }> = [];
  for (const a of airports) {
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    const country = (a.country || '').toLowerCase();
    let score = 0;
    if (iata === q)                 score = 100;
    else if (iata.startsWith(q))    score = 80;
    else if (city === q)            score = 70;
    else if (city.startsWith(q))    score = 60;
    else if (name.startsWith(q))    score = 50;
    else if (city.includes(q))      score = 40;
    else if (name.includes(q))      score = 30;
    else if (country.startsWith(q)) score = 20;
    else continue;
    score += (HUB_WEIGHT.get(a.iata) ?? 0);
    results.push({ ...a, _score: score });
  }
  return results
    .sort((a, b) => b._score - a._score || a.city.localeCompare(b.city))
    .slice(0, limit)
    .map(({ _score, ...a }) => a);
}

export const POPULAR_AIRPORTS = [
  'JFK', 'LHR', 'CDG', 'DXB', 'SVO', 'SIN', 'HND', 'LAX',
  'FRA', 'AMS', 'IST', 'ICN', 'PEK', 'ORD', 'ATL', 'LED',
];
