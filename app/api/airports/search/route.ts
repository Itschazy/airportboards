import { NextRequest, NextResponse } from 'next/server';
import { searchAirports, getQuickAirports } from '@/lib/airports';
import { localizeResults } from '@/lib/localize-results';
import { locales } from '@/lib/i18n';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const requestedLocale = req.nextUrl.searchParams.get('locale') || 'en';
  const locale = locales.find(l => l === requestedLocale) || 'en';
  const airports = localizeResults(searchAirports(q, 10), locale);
  // Названия статичны, это не рейсы. Браузер может переиспользовать ответ час;
  // правило свежести табло и платные endpoints этим кэшем не затрагиваются.
  const quick = !q && req.nextUrl.searchParams.get('bootstrap') === '1'
    ? localizeResults(getQuickAirports(), locale).map(a => [a.iata, a.name, a.city, a.country, a.iso2])
    : undefined;
  return NextResponse.json({ airports, ...(quick ? { quick } : {}) }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
