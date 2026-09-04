import { headers } from 'next/headers';
import { getBoard, getBoardFetchedAt, type FlightRow } from '@/lib/flights';
import { mayFetchLiveFor } from '@/lib/live-budget';
import { freshnessWorthBuying } from '@/lib/warm';

/**
 * Борт для СЕРВЕРНОГО рендера: свежий, если перед нами живой человек и данные протухли.
 *
 * ЗАЧЕМ. Читатель приходит из поиска и первым экраном видит то, что отрисовал сервер.
 * Клиентский опрос догонял свежесть за секунду-полторы, но эту секунду человек уже смотрел на
 * вчерашнее табло. Замер 04.09 по Юго-Восточной Азии — той аудитории, что пришла на сайт
 * вчера: SIN, KUL, BKK, CGK, HKG, DPS, SGN, HAN — все одиннадцать часов и ВСЕ РЕЙСЫ В ПРОШЛОМ,
 * MNL и TPE двадцать один час. Тридцать строк, и ни одной предстоящей.
 *
 * ЦЕНА ОГРАНИЧЕНА ЧИСЛОМ ВИЗИТОВ, а не временем, и это ключевая арифметика. Обновление
 * происходит на ПРИХОДЕ человека, а внутри окна TTL getFresh отдаёт запись бесплатно, поэтому
 * верхняя граница — один оплаченный запрос на визит, а не шесть в час на борт. При нынешних
 * ~430 визитах в сутки это ~13 000 в месяц при людской доле в 35 000. Держать топ-25
 * постоянно свежим стоило бы 126 000 в месяц — дороже всего плана; покупать на приходе по
 * карману.
 *
 * КРАУЛЕР СЮДА НЕ ПОПАДАЕТ. Решение принимает то же ядро, что и ручка /api/flights
 * (mayFetchLiveFor): распознавание браузера, людская доля, право на свежесть, потолок по
 * адресу. Два набора правил про деньги развели бы при первой же правке одного из них.
 */

/**
 * Сколько читатель готов ждать сервер ради свежести.
 *
 * У обращения к провайдеру собственный тайм-аут в шесть секунд (lib/flights.ts doFetch), и
 * это правильная граница ДЛЯ ФОНА, но не для страницы: шесть секунд белого экрана хуже
 * вчерашнего табло. Поэтому здесь гонка с крайним сроком — не успели, рисуем хранилище.
 *
 * Запрос при этом НЕ отменяется: он дойдёт, положит свежие данные в хранилище, и следующий
 * читатель (а также клиентский опрос этого же) получит их уже даром. Проигранная гонка не
 * потрачена впустую.
 */
const DEADLINE_MS = 2500;

export type VisitorBoard = { rows: FlightRow[]; fetchedAt: number | null; refreshed: boolean };

export async function boardForVisitor(
  iata: string,
  direction: 'departures' | 'arrivals',
  locale: string,
): Promise<VisitorBoard> {
  const stored = () => getBoard(iata, direction, locale, false);

  let h: Headers;
  try { h = await headers(); } catch { return { rows: await stored(), fetchedAt: getBoardFetchedAt(iata, direction), refreshed: false }; }

  // Ферма обходчиков идёт по карте сайта подряд и выглядит браузером — см. разбор у
  // freshnessWorthBuying. Покупаем свежесть только там, где спрос измерен; остальное
  // отдаётся из хранилища, ровно как до 04.09.
  if (!freshnessWorthBuying(iata)) {
    return { rows: await stored(), fetchedAt: getBoardFetchedAt(iata, direction), refreshed: false };
  }

  const at = getBoardFetchedAt(iata, direction);
  const live = mayFetchLiveFor(
    h,
    h.get('host') || '',
    `${direction}:${iata.toUpperCase()}`,
    at == null ? null : Date.now() - at,
  );
  if (!live) return { rows: await stored(), fetchedAt: at, refreshed: false };

  // Гонка с крайним сроком. Победа хранилища — не отказ, а честный компромисс: строки на
  // экране есть сразу, а свежие догонят клиентским опросом через секунду.
  const fresh = getBoard(iata, direction, locale, true).catch(() => null);
  const winner = await Promise.race([
    fresh,
    new Promise<'deadline'>((r) => setTimeout(() => r('deadline'), DEADLINE_MS)),
  ]);
  if (winner === 'deadline' || winner == null) {
    return { rows: await stored(), fetchedAt: getBoardFetchedAt(iata, direction), refreshed: false };
  }
  return { rows: winner, fetchedAt: getBoardFetchedAt(iata, direction), refreshed: true };
}
