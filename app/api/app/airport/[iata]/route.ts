import { NextRequest, NextResponse } from 'next/server';
import { getAirport } from '@/lib/airports';
import { getBoard } from '@/lib/flights';
import { currentIata } from '@/lib/iata-aliases';
import { locales } from '@/lib/i18n';
import { hasNoService } from '@/lib/warm';
import { getAirportGuide } from '@/lib/airport-guide';
import { getAirportName } from '@/lib/airport-names';
import { airportBoardProps, boardDirection, boardTranslators, type BoardView } from '@/lib/airport-page-props';
import { withAppCors } from '@/lib/app-cors';

/**
 * Экран аэропорта для приложений: всё, что страница передаёт в FlightBoard, плюс справочная.
 *
 * 🔴 ЭТА РУЧКА НИКОГДА НЕ ПОКУПАЕТ — ни при каком UA, Host и Origin. Борт читается только
 * хранилищем: getBoard(..., live = false), как /api/airports/counts. В lib/flights.ts fetchRaw
 * при `!opts.live` отдаёт getFresh/getStale и до doFetch (единственного места, где есть
 * обращение к airlabs и spend()) не доходит. mayFetchLive/mayFetchLiveFor/boardForVisitor
 * здесь не вызываются и не импортируются — сознательно: страница берёт борт у
 * boardForVisitor, и вынос пропсов (lib/airport-page-props.ts) поэтому принимает борт
 * готовым, чтобы ручка не унаследовала покупающий путь страницы.
 *
 * Почему так, а не «как /api/flights». Приложение после этой ручки рисует FlightBoard, а он
 * сразу и дальше раз в минуту сам опрашивает /api/flights — тот и решает про свежесть по
 * общим правилам (lib/live-budget.ts). Если бы покупала ещё и эта ручка, открытие экрана
 * стоило бы двух платных запросов вместо одного, как у страницы сайта.
 *
 * Вход проверяется ДО обращения к хранилищу, и неизвестное — 404, а не молчаливая замена:
 *   - код — по каталогу, со сменой выведенного кода на действующий (lib/iata-aliases.ts, как
 *     /embed). Закрытый аэропорт — 200, как страница: она показывает уведомление и преемника;
 *   - locale — по списку locales. Молчаливый en вместо опечатки отдал бы приложению экран на
 *     чужом языке, и ошибку было бы нечем заметить;
 *   - dir — ровно два значения. Направление уходит в ключ хранилища, и прочее здесь не нужно.
 *
 * dir=departures — набор родительской страницы (/airport/X: lead, строка задержек, noService,
 * infoOnly, пометка пустого борта); dir=arrivals — набор подстраницы /arrivals. Подстраницы
 * сайта этих полей не передают, и ручка повторяет сайт, а не дополняет его.
 */

/** Как у /api/flights: в ответе борт, а свежесть и разделяемый кэш несовместимы. */
const CACHE_CONTROL = 'private, max-age=0, must-revalidate';

const notFound = (req: NextRequest, error: string) => withAppCors(req, NextResponse.json(
  { error },
  { status: 404, headers: { 'Cache-Control': CACHE_CONTROL } },
));

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ iata: string }> },
) {
  const { iata: raw } = await params;
  const code = (currentIata(raw) || raw).toUpperCase();
  const airport = getAirport(code);
  if (!airport) return notFound(req, 'unknown airport');

  const q = req.nextUrl.searchParams;
  const locale = q.get('locale') || '';
  if (!(locales as readonly string[]).includes(locale)) return notFound(req, 'unknown locale');
  const dir = q.get('dir');
  if (dir !== 'departures' && dir !== 'arrivals') return notFound(req, 'unknown dir');

  const view: BoardView = dir === 'arrivals' ? 'arrivals' : 'airport';
  // Только хранилище: live = false. Не менять на mayFetchLive — см. шапку файла.
  let flights: Awaited<ReturnType<typeof getBoard>> = [];
  try { flights = await getBoard(airport.iata, boardDirection(view), locale, false); } catch { /* честно пусто */ }

  // Сборка ответа (переводы, пропсы, справочная) может бросить. Без перехвата Next отдал бы
  // 500 без CORS-заголовка, и WebView приложения увидел бы не «сервер ответил ошибкой», а
  // сетевой сбой — человеку показали бы «нет сети». Поэтому — тот же 500, но JSON, с тем же
  // Cache-Control и CORS. Логика покупки не меняется: борт выше уже прочитан из хранилища.
  let body: Record<string, unknown>;
  try {
    body = await buildBody(airport, locale, dir, view, flights);
  } catch (e) {
    console.error('[api/app/airport]', airport.iata, locale, dir, e);
    return withAppCors(req, NextResponse.json(
      { error: 'internal error' },
      { status: 500, headers: { 'Cache-Control': CACHE_CONTROL } },
    ));
  }
  return withAppCors(req, NextResponse.json(body, { headers: { 'Cache-Control': CACHE_CONTROL } }));
}

async function buildBody(
  airport: NonNullable<ReturnType<typeof getAirport>>,
  locale: string,
  dir: 'departures' | 'arrivals',
  view: BoardView,
  flights: Awaited<ReturnType<typeof getBoard>>,
): Promise<Record<string, unknown>> {
  const t = await boardTranslators(locale);
  const { view: _view, ...board } = airportBoardProps(airport, locale, view, flights, t);
  // Справочная — при том же условии, что у страницы (components/AirportBottom.tsx): у
  // аэропорта без регулярных рейсов её нет, на языке без перевода — тоже.
  const guide = hasNoService(airport.iata) ? null : getAirportGuide(airport.iata, locale);
  const successor = airport.successor ? getAirport(airport.successor) : null;

  return {
    iata: airport.iata,
    locale,
    dir,
    // Каталожная запись целиком, с часовым поясом: без tz FlightBoard печатает время в поясе
    // устройства (/api/airports/search?codes= его не отдаёт).
    airport,
    // Пропсы FlightBoard, кроме airport/locale/aboutExtra. initialFlights — срез первого
    // экрана из хранилища, initialFetchedAt — возраст ДАННЫХ, а не ответа.
    board,
    fetchedAt: board.initialFetchedAt,
    guide: guide ? { title: t.ui('aguide_title', { iata: airport.iata }), guide } : null,
    closed: airport.closed
      ? { year: airport.closed, successor: successor ? { iata: successor.iata, name: getAirportName(successor.iata, locale, successor.name) } : null }
      : null,
  };
}
