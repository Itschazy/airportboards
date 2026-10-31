type Usage = { cap: number; remaining: number; human: number };

/**
 * 31.10.2026 прогрев потратил за сутки вдвое меньше запросов, чем неделю назад:
 * remaining - humanReserve удерживал полные 100 000 даже в последний день.
 * Дополнительный warmShare повторно запирал свободную долю, а деление на целые дни
 * оставляло вечером столько же будущих тиков, сколько утром. Владелец разрешил
 * отдавать свободный остаток фону, сохранив приоритет свежести для посетителей.
 *
 * Прогноз людям — максимум базовой суточной нормы и удвоенного среднего расхода
 * с начала месяца. Двойной запас покрывает наблюдавшийся рост с ~4,4 тыс. в среднем
 * до ~8,9 тыс./сутки; это запас, не гарантия при любом скачке спроса. Пересчёт каждый
 * тик уменьшает фон при росте live. В первые сутки не экстраполируем первые секунды
 * месяца: базовая норма остаётся нижней границей. Для прогноза и ledger один UTC-месяц.
 *
 * Оставляем прогноз до конца месяца, минимум на один интервал cron. Остаток делим
 * на дробное число будущих интервалов, минимум один; за тик не больше половины
 * свободного остатка. Поэтому даже последний тик не съедает весь запас разом.
 * Старый безусловный минимум 40 снят: он мог расходовать защищённый резерв.
 * Ноль допустим: warmHubs проверяет бюджет перед каждой парой вылеты/прилёты.
 * Никаких новых запросов тут нет; очередь всё ещё выбирает только просроченные табло.
 * Проверка: scripts/check-warm-budget.mjs — конец месяца, UTC, скачок live и симуляции.
 */
export function warmBudget(u: Usage, monthlyReserve: number, runsPerDay: number, now: Date) {
  if (![u.cap, u.remaining, u.human, monthlyReserve, runsPerDay, now.getTime()].every(Number.isFinite)
      || u.cap <= 0 || u.remaining < 0 || u.human < 0 || monthlyReserve < 0 || runsPerDay < 1 || runsPerDay > 48) {
    return { requests: 0, protectedRequests: 0, daysLeft: 0 };
  }
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const dayMs = 86_400_000;
  const monthDays = (end - start) / dayMs;
  const elapsed = Math.max(1, (now.getTime() - start) / dayMs);
  const daysLeft = (end - now.getTime()) / dayMs;
  const dailyLive = Math.max(monthlyReserve / monthDays, 2 * u.human / elapsed);
  const protectedRequests = Math.ceil(dailyLive * Math.max(daysLeft, 1 / runsPerDay));
  const spendable = Math.max(0, Math.min(u.cap, u.remaining) - protectedRequests);
  const requests = Math.floor(Math.min(spendable / Math.max(1, daysLeft * runsPerDay), spendable / 2));
  return { requests, protectedRequests, daysLeft };
}
