import { NextRequest, NextResponse } from 'next/server';
import { warmHubs } from '@/lib/flights';
import { usage, claimWarmTick } from '@/lib/flightStore';
import { harvestFromStore } from '@/lib/top-routes';
import { warmerVerdict } from '@/lib/api-auth';
import { revalidatePath } from 'next/cache';
import { locales } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Shortest gap between two warm cycles, whoever asks.
 *
 * Прежнее обоснование начиналось словами «проверка входа ниже намеренно слабая и
 * ужесточить её отсюда нельзя». 31.10.2026 она ужесточена (см. lib/api-auth.ts), и заслон
 * остался — но теперь он защищает не от интернета, а от бокса: пройти без токена может
 * что угодно, запущенное на самой машине, а тик прогрева берёт до ПОЛОВИНЫ дневной доли
 * плана (tickBudget в lib/warm.ts). Повторный вызов в цикле — скажем, из отлаживаемого
 * скрипта — вытянул бы месяц вперёд за часы и оставил сайт с холодным бортом до первого
 * числа, при двухсотых ответах и зелёных проверках.
 *
 * Отметка о прошлом тике общая для всех процессов (claimWarmTick): в переменной модуля она
 * была у каждого своя, и втроём они пропускали втрое больше заявленного.
 *
 * Крону это не мешает ничем: он предъявляет токен и заслон обходит, как и раньше.
 */
const MIN_INTERVAL_MS = Number(process.env.WARM_MIN_INTERVAL_MIN || 20) * 60_000;

// Background hub warmer, triggered by a system cron (see deploy notes). Token-gated so it
// can't be hammered to spend quota. Idempotent within the store TTL (warm hubs are no-ops).
// Example cron (every 2h):  curl -s "https://airportsboard.live/api/cron/warm?token=XXX"
export async function GET(req: NextRequest) {
  /**
   * Строгая проверка — та же, что у /api/revalidate.
   *
   * Здесь стоял isCronRequest, который пропускал весь интернет (разбор снят вместе с ним,
   * см. lib/api-auth.ts). Единственная ручка сайта, которая тратит деньги по своей воле,
   * обязана стоять на самой строгой проверке, какая есть.
   */
  const who = warmerVerdict(req);
  if (!who) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  // Единственный исход, при котором ручка осталась открытой всему миру, — и он кричит в
  // крон-лог каждым тиком, вместо того чтобы молчать (разбор в lib/api-auth.ts).
  if (who === 'unconfigured') {
    console.error('[warm] CRON_TOKEN не задан в окружении процесса: ручка прогрева открыта всем. '
      + 'Задать в ~/airportsboard.env на боксе и pm2 restart airportsboard --update-env');
  }
  const operator = who === 'token';
  // 200 rather than 429: the caller is a crontab line whose log should stay quiet, and a
  // skipped cycle is a success from its point of view. Bypassable with a token so an operator
  // debugging on the box is never stuck waiting.
  const waitSec = operator ? 0 : claimWarmTick(MIN_INTERVAL_MS);
  if (waitSec) {
    return NextResponse.json(
      { ok: true, skipped: 'throttled', nextInSec: waitSec, auth: who, ...usage() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  /**
   * Сколько тиков в сутки делает вызывающий. Диапазон 1..48 — защита от опечатки в crontab:
   * runsPerDay=1 распределяет остаток на один запуск в сутки,
   * а runsPerDay=1000 искусственно уменьшил бы каждый тик. Сам расчёт warm-budget.ts
   * также проверяет диапазон и защищает прогноз живого спроса. Не передали — берётся
   * WARM_RUNS_PER_DAY из окружения.
   *
   * Значение принимается ТОЛЬКО по токену: расписание задаёт крон, а не всякий, кто смог
   * постучаться с бокса. Без токена параметр молча игнорируется — именно молча, потому что
   * ошибка здесь не у вызывающего, а у того, кто решил, что ему можно.
   */
  const asked = Number(req.nextUrl.searchParams.get('runsPerDay'));
  const runsPerDay = operator && Number.isFinite(asked) && asked >= 1 && asked <= 48 ? asked : undefined;
  const result = await warmHubs(runsPerDay);
  // Right after a warm cycle the boards are as fresh as they ever get, so this is the best
  // moment to take a route snapshot. It reads the in-process store — no HTTP, no airlabs
  // call, no quota — and self-throttles to roughly once a day, which is why it can ride the
  // existing 2-hourly cron instead of needing its own entry in the VDS crontab.
  const routes = harvestFromStore();

  /**
   * Сбросить кэш страниц тех аэропортов, что только что обновились.
   *
   * Без этого сайт платит поставщику и не показывает купленное: страницы отдаются по ISR
   * (`revalidate = 300`), и запись, не запрошенная никем последние пять минут, живёт в кэше
   * сколько угодно. Замер 12.08 на PEK, два захода подряд: `initialFetchedAt` 22:00 → 06:00,
   * то есть первому пришедшему отдали борт восьмичасовой давности при свежих данных в
   * хранилище.
   *
   * Оговорка о величине пользы, чтобы не переоценивать правку: живой человек свежие данные
   * получал и раньше — FlightBoard дозапрашивает борт при монтировании. Отставание било по
   * тем, кто не выполняет скрипты: поисковым роботам, ИИ-агентам и первой отрисовке. Для
   * сайта, который держится на выдаче, это и есть основная поверхность.
   *
   * Ограничения выбраны так, чтобы правка не могла навредить:
   *   - сбрасываются ТОЛЬКО коды, обновлённые в этом тике, а не весь корпус. Массовый сброс
   *     через `revalidatePath('/[locale]/airport/[iata]', 'page')` пометил бы все 2412
   *     страниц и заставил каждого посетителя ждать полной отрисовки;
   *   - есть потолок: тик ограничен бюджетом (~120 аэропортов), но потолок защищает от
   *     случая, когда бюджет однажды вырастет;
   *   - каждый вызов изолирован: один плохой путь не должен рушить остальные и уж тем более
   *     не должен ронять сам прогрев, который уже потратил платную квоту.
   */
  const REVALIDATE_CAP = 2400;
  let purged = 0;
  const revalidateStartedAt = Date.now();
  outer: for (const iata of result.warmedIatas) {
    for (const locale of locales) {
      for (const suffix of ['', '/departures', '/arrivals']) {
        if (purged >= REVALIDATE_CAP) break outer;
        try { revalidatePath(`/${locale}/airport/${iata}${suffix}`); purged++; } catch { /* один путь не должен ронять остальные */ }
      }
    }
  }
  const revalidateMs = Date.now() - revalidateStartedAt;
  // Report what the tiered warmer actually did, so a look at the cron log answers "is the
  // long tail being covered, or is the budget all going to hubs?" without a deploy.
  return NextResponse.json({ ok: true, auth: who, ...result, routes, purged, revalidateMs, ...usage() }, { headers: { 'Cache-Control': 'no-store' } });
}
