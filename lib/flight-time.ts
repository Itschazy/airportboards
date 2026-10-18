/** Время до рейса и длительность задержки — разные величины.
 * Раньше карточка при отсутствии delay подставляла время ДО вылета как задержку,
 * а строка теряла известную задержку, если поставщик не прислал estimated.
 * Оба места используют один расчёт; неизвестную задержку не придумываем.
 * Полночь, прошедшие рейсы и отсутствие estimated проверяет check-flight-time.mjs.
 */
export function flightDelayMinutes(flight: { delay?: number; actual?: string; scheduled: string }): number | null {
  if (flight.delay != null && Number.isFinite(flight.delay) && flight.delay > 0) return Math.round(flight.delay);
  if (!flight.actual) return null;
  const clock = (s: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(s);
    return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;
  };
  let delta = clock(flight.actual) - clock(flight.scheduled);
  // 23:50 → 00:20 — задержка на 30 минут. Многосуточную задержку можно
  // достоверно показать только по полю delay; одни часы не содержат даты.
  if (delta < -720) delta += 1440;
  return Number.isFinite(delta) && delta > 0 ? delta : null;
}

/** Короткий отсчёт только у спокойного предстоящего рейса в ближайший час.
 * Абсолютная отметка исключает ошибки часовых поясов и перехода суток.
 * До гидратации now=0: сервер и первый клиентский рендер совпадают.
 * Посадку, отмену и задержку отсчётом не заменяем; в прошлом его нет.
 */
export function imminentFlightMinutes(flight: { ts?: number; status: string }, now: number): number | null {
  if (!now || !flight.ts || !['ontime', 'scheduled'].includes(flight.status)) return null;
  const delta = flight.ts * 1000 - now;
  return delta > 0 && delta <= 60 * 60_000 ? Math.ceil(delta / 60_000) : null;
}
