import fs from 'fs';
import path from 'path';

// Localized airport names (data/airport-names.json) so /ru shows "Шереметьево",
// /zh "谢列梅捷沃" etc. in titles, H1 and the board header. Server-only (fs).
const FILE = path.join(process.cwd(), 'data/airport-names.json');
let NAMES: Record<string, Record<string, string>> | null = null;

export function getAirportName(iata: string, locale: string, fallback: string): string {
  if (!NAMES) {
    try { NAMES = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { NAMES = {}; }
  }
  const n = NAMES![iata.toUpperCase()]?.[locale];
  return n && n.length > 0 ? n : fallback;
}
