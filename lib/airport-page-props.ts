import { getTranslations } from 'next-intl/server';
import type { Airport } from '@/lib/airports';
import { getBoardFetchedAt, type FlightRow } from '@/lib/flights';
import { getAirportName } from '@/lib/airport-names';
import { getCityName, getCountryName } from '@/lib/places';
import { hasNoService, serviceLevel, serviceMeasuredOn } from '@/lib/warm';
import { hasWikiAirlines } from '@/lib/wiki-routes';
import { localizedMeasuredOn } from '@/lib/measured-date';
import { hasGenericWord } from '@/lib/generic-word';
import { fold } from '@/lib/show-city';

/**
 * Всё, что страница аэропорта вычисляет для пропсов FlightBoard, — в одном месте.
 *
 * Зачем вынесено. Те же строки нужны приложению (app/api/app/airport/[iata]/route.ts): его
 * экран рисует тот же FlightBoard, только без серверного рендера. Вторая копия «строки
 * задержек» или «пометки пустого борта» разошлась бы с сайтом при первой же правке одной из
 * них, а у каждой из этих строк своя история честности (см. комментарии ниже) — повторять её
 * дважды значило бы однажды повторить и исправленную ошибку.
 *
 * БОРТ СЮДА ПРИХОДИТ ГОТОВЫМ, и это граница по деньгам, а не удобство. Страница берёт его у
 * boardForVisitor (lib/live-board.ts), который при определённых условиях покупает свежесть;
 * ручка приложения — только чтением хранилища (getBoard(..., false)). Если бы функция сама
 * доставала борт, ручка унаследовала бы покупающий путь страницы. Здесь же нет ни одного
 * вызова, способного обратиться к поставщику: getBoardFetchedAt и всё из lib/warm.ts — чтение
 * хранилища и data/*.json.
 *
 * Виды повторяют три страницы ровно в том объёме, в каком каждая передаёт пропсы сегодня:
 * родитель — полный набор, подстраницы — без lead/statusLine/noService/infoOnly/pendingNote.
 * Это не недосмотр выноса, а прежнее поведение страниц; выравнивать его — отдельное решение.
 */

/**
 * Срез борта для показа и признак «всё уже в прошлом».
 *
 * orderBoard на мёртвом борту отдаёт ХВОСТ по возрастанию — то есть самое ценное стоит в
 * конце списка. Страница резала его `slice(0, 40)`, компонент рисовал первые тридцать: два
 * среза подряд с головы, и человек видел самые СТАРЫЕ строки из имеющихся, а десять–двадцать
 * самых свежих не доезжали до разметки вовсе. Замер 12.08 на AYT: на экране 07:00–07:55, в
 * полезной нагрузке было до 08:30, в хранилище — примерно до 09:00.
 *
 * Считается на сервере от НАСТОЯЩЕГО времени, а не от времени снимка: вопрос «что уже
 * улетело» — про часы читателя, а не про то, что видел поставщик данных.
 */
export function boardWindow(rows: { ts?: number }[], n: number): { rows: any[]; allPast: boolean } {
  const now = Date.now() / 1000;
  const allPast = rows.length > 0 && rows.every(r => !r.ts || r.ts < now);
  return { rows: allPast ? rows.slice(-n) : rows.slice(0, n), allPast };
}

/** Сколько строк борта уходит в первый экран: остальное компонент догружает сам. */
const SSR_ROWS = 40;

export type BoardView = 'airport' | 'departures' | 'arrivals';

type Common = {
  displayName: string;
  cityName: string;
  /** Срез для первого экрана (boardWindow), а не весь борт. */
  initialFlights: FlightRow[];
  initialAllPast: boolean;
  initialFetchedAt: number | null;
  /** Весь борт ДО среза — счётчик «N вылетов» не должен называть срез. */
  boardTotal: number;
  aboutTitle: string;
};
export type ParentBoardProps = Common & {
  view: 'airport';
  lead: string;
  statusLine: string | null;
  noService: boolean;
  infoOnly: boolean;
  pendingNote: string | null;
};
export type ArrivalsBoardProps = Common & { view: 'arrivals'; defaultMode: 'arrivals'; headingNote: string };
export type DeparturesBoardProps = Common & { view: 'departures'; defaultMode: 'departures' };
export type AirportBoardProps = ParentBoardProps | ArrivalsBoardProps | DeparturesBoardProps;

export function boardDirection(view: BoardView): 'departures' | 'arrivals' {
  return view === 'arrivals' ? 'arrivals' : 'departures';
}

type Translator = Awaited<ReturnType<typeof getTranslations>>;
/** Пространства каталога, из которых собираются строки табло. */
export type BoardTranslators = { home: Translator; nav: Translator; ui: Translator };

/**
 * Переводчики для airportBoardProps — тем, у кого их ещё нет (ручке приложения).
 *
 * Страницы передают СВОИ, уже полученные, и это не экономия на вызове. Порядок, в котором
 * серверный рендер выпускает куски RSC-нагрузки, зависит от числа ожиданий на пути страницы:
 * лишний await внутри выноса переставил бы куски и сменил их номера, и HTML перестал бы
 * совпадать с прежним байт-в-байт (замерено на сборке: 288 из 288 страниц аэропорта). Поэтому
 * сама функция синхронна, а ждут только страницы — ровно там же, где ждали до выноса.
 */
export async function boardTranslators(locale: string): Promise<BoardTranslators> {
  const [home, nav, ui] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getTranslations({ locale, namespace: 'nav' }),
    getTranslations({ locale, namespace: 'ui' }),
  ]);
  return { home, nav, ui };
}

export function airportBoardProps(airport: Airport, locale: string, view: 'airport', flights: FlightRow[], t: Pick<BoardTranslators, 'home' | 'ui'>): ParentBoardProps;
export function airportBoardProps(airport: Airport, locale: string, view: 'arrivals', flights: FlightRow[], t: Pick<BoardTranslators, 'home' | 'nav'>): ArrivalsBoardProps;
export function airportBoardProps(airport: Airport, locale: string, view: 'departures', flights: FlightRow[], t: Pick<BoardTranslators, 'home'>): DeparturesBoardProps;
export function airportBoardProps(airport: Airport, locale: string, view: BoardView, flights: FlightRow[], t: BoardTranslators): AirportBoardProps;
/**
 * `flights` — ВЕСЬ борт направления вида, уже полученный вызывающим (см. шапку файла);
 * `t` — переводчики пространств home/nav/ui (см. boardTranslators).
 */
export function airportBoardProps(airport: Airport, locale: string, view: BoardView, flights: FlightRow[], t: Partial<BoardTranslators>): AirportBoardProps {
  const tHome = t.home!;
  const name = getAirportName(airport.iata, locale, airport.name);
  const city = getCityName(airport.city, locale);
  const direction = boardDirection(view);
  // Один вызов на рендер: между двумя вызовами Date.now() успел бы тикнуть, и строка
  // могла бы перепрыгнуть из будущего в прошлое между срезом и признаком.
  const board = boardWindow(flights, SSR_ROWS);
  const common: Common = {
    displayName: name,
    cityName: city,
    initialFlights: board.rows,
    initialAllPast: board.allPast,
    initialFetchedAt: getBoardFetchedAt(airport.iata, direction),
    boardTotal: flights.length,
    aboutTitle: tHome('about_title', { iata: airport.iata }),
  };

  if (view === 'arrivals') {
    const tNav = t.nav!;
    // headingNote — признак ВЫДЕЛЕННОЙ подстраницы прилётов, а не текущего режима табло:
    // переключатель внутри компонента меняет режим без перехода, и заголовок первого
    // уровня прыгал бы под рукой. Слово берётся из каталога, новых строк не заводится.
    return { view, defaultMode: 'arrivals', headingNote: tNav('arrivals'), ...common };
  }
  if (view === 'departures') return { view, defaultMode: 'departures', ...common };

  const tUi = t.ui!;
  const country = getCountryName(airport.country, locale);
  // Honest delay summary for mega-tier boards — the "are there delays at X right now"
  // query family, answered from data we hold rather than prose. Gates (all mandatory):
  // count only status==='delayed' (=15+ min, see mapStatus), denominator = flights still
  // to depart (the 80-row board includes already-departed rows), suppress when the board
  // is cold, empty of upcoming flights, or the store data is older than two hours — a
  // "right now" claim on a six-hour-old snapshot would be the exact kind of lie the last
  // three waves removed.
  const statusLine = (() => {
    if ((serviceLevel(airport.iata) ?? 0) < 400) return null;
    const fetchedAt = getBoardFetchedAt(airport.iata, 'departures');
    if (!fetchedAt) return null;
    const ageMin = Math.round((Date.now() - fetchedAt) / 60000);
    if (ageMin > 120) return null;
    const pending = flights.filter(f => f.status !== 'departed' && f.status !== 'cancelled');
    if (!pending.length) return null;
    const delayed = pending.filter(f => f.status === 'delayed').length;
    return tHome('delays_line', {
      m: String(Math.max(1, ageMin)),
      delayed: String(delayed),
      pending: String(pending.length),
    });
  })();
  const noService = hasNoService(airport.iata);
  // The body half of the honest-title branch in generateMetadata(). Same three conditions in
  // the same order, so a page can never advertise "airport information" in the SERP and then
  // render a live-board skeleton — the exact contradiction AdSense rejected the site over.
  // Self-healing: all three are read from data on every render, so the moment the warmer
  // measures real service the board and its chrome come back on their own.
  const infoOnly = flights.length === 0
    && !hasWikiAirlines(airport.iata)
    && serviceLevel(airport.iata) === null;
  // What to put under an empty board when the airport is NOT known to be service-free — i.e.
  // the warmer simply has not reached it yet. Never "No flights found": that would assert
  // something false about a real airport, and 1,580 of these are airports whose zero verdict
  // OurAirports contradicts outright (see scripts/crosscheck-service.mjs). Where we do have a
  // measured schedule figure, say it — the page then answers "how busy is this airport" even
  // with no live rows, which is the whole point for a crawler that will never run our JS.
  const pendingNote = (!noService && flights.length === 0)
    ? (() => {
        const measured = serviceLevel(airport.iata);
        const on = serviceMeasuredOn();
        const line = tUi('board_pending');
        return measured && measured > 0 && on
          ? `${line} ${tHome('faq_deps_a', { n: measured, name, iata: airport.iata, date: localizedMeasuredOn(on, locale), deAirport: locale === 'de' && !hasGenericWord('de', name) ? `Flughafen ${name}` : name })}`
          : line;
      })()
    : null;
  return {
    view,
    ...common,
    // "Sochi (AER) is an airport serving Sochi" reads as machine output the moment the
    // airport's name IS the city's name. The _same variant names the place once.
    lead: tHome(fold(name) === fold(city) ? 'airport_lead_same' : 'airport_lead', { name, iata: airport.iata, city, country }),
    statusLine,
    noService,
    infoOnly,
    pendingNote,
  };
}
