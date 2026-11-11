import { NextRequest, NextResponse } from 'next/server';
import { searchAirports, getQuickAirports, getAirport } from '@/lib/airports';
import { localizeResults } from '@/lib/localize-results';
import { locales } from '@/lib/i18n';
import { withAppCors } from '@/lib/app-cors';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  const requestedLocale = req.nextUrl.searchParams.get('locale') || 'en';
  const locale = locales.find(l => l === requestedLocale) || 'en';
  const requestedCodes = req.nextUrl.searchParams.get('codes');
  if (requestedCodes !== null) {
    // Только справочник, ни store, ни Airlabs. Жёсткий предел защищает сервер и
    // телефон; неизвестный код не превращается в нечёткую подсказку другого места.
    if (!/^[A-Z]{3}(,[A-Z]{3}){0,4}$/.test(requestedCodes)) {
      return withAppCors(req, NextResponse.json({ airports: [] }, { status: 400 }));
    }
    const rows = [...new Set(requestedCodes.split(','))].flatMap(code => {
      const airport = getAirport(code); return airport ? [airport] : [];
    });
    const airports = localizeResults(rows, locale).map(({ iata, name, city, country, iso2 }) => ({ iata, name, city, country, iso2 }));
    return withAppCors(req, NextResponse.json({ airports }, { headers: { 'Cache-Control': 'public, max-age=3600' } }));
  }
  const airports = localizeResults(searchAirports(q, 10), locale);
  // Названия статичны, это не рейсы. Браузер может переиспользовать ответ час;
  // правило свежести табло и платные endpoints этим кэшем не затрагиваются.
  const quick = !q && req.nextUrl.searchParams.get('bootstrap') === '1'
    ? localizeResults(getQuickAirports(), locale).map(a => [a.iata, a.name, a.city, a.country, a.iso2])
    : undefined;
  // CORS для приложений (lib/app-cors.ts): поиск оболочки mobile/ ходит сюда из WebView.
  return withAppCors(req, NextResponse.json({ airports, ...(quick ? { quick } : {}) }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  }));
}
