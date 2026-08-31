// Приёмка свежего замера расписаний. Ноль требует подтверждения.
//
// ПОЧЕМУ ЭТОТ ФАЙЛ ВООБЩЕ ЕСТЬ. scripts/discover-schedules.mjs спрашивает у провайдера
// «сколько вылетов у этого кода» и записывает ответ как факт. Замер 01.09 показал, что ответ
// фактом не является: ручка schedules отдаёт не сутки, а СКОЛЬЗЯЩЕЕ ОКНО примерно в 13–16
// часов от текущего момента.
//
//     KZN  −3.3 ч → +13.1 ч        JFK  +2.3 ч → +14.9 ч
//
// У аэропорта с двумя рейсами в сутки есть прямой шанс показать ноль просто потому, что оба
// рейса лежат за окном. Пробный прогон это и поймал: Гюмри (LWN) — 258 визитов в месяц,
// закреплённый в DEMAND_PINNED и отдельно охраняемый в check-sitemap-scope — вернул 2 → 0.
// Приняв такой ноль, сайт выкинул бы страницу из карты и написал бы на ней «рейсов нет».
//
// Цена ошибки НЕСИММЕТРИЧНА, и в этом всё дело. Ложный ноль убивает живую страницу: она
// покидает карту сайта, теряет борт и начинает утверждать, что рейсов не бывает. Ложная
// единица всего лишь оставляет аэропорт в прогреве лишний цикл. Поэтому правило приёмки
// намеренно перекошено в сторону «оставить жить».
//
//   свежий > 0                          → принять. Живой борт, свежий счёт.
//   свежий = 0, прежний = 0             → принять ноль. Два независимых замера в разное время
//                                         суток и с разницей в полтора месяца — это и есть
//                                         свидетельство, которого требует отрицание.
//   свежий = 0, прежний > 0, ПЕРВЫЙ раз → ОСТАВИТЬ ПРЕЖНИЙ, код в очередь на переспрос.
//                                         Один ноль в тринадцатичасовом окне не доказывает
//                                         ничего.
//   свежий = 0, прежний > 0, УЖЕ В ОЧЕРЕДИ → принять ноль. Это второй ноль, снятый в другое
//                                         время суток, то есть требуемое N ≥ 2.
//   свежего нет (ошибка)                → оставить прежний.
//
// Последнее правило — недостающая половина, и без неё вся конструкция зависает. Первая версия
// смотрела только на пару «свежий/прежний», а прежний на втором проходе всё тот же июльский
// >0 — значит второй ноль отклонялся ровно как первый, и код не покидал очередь НИКОГДА.
// Очередь (data/airport-service-recheck.json) и есть память о том, что первый ноль уже был.
//
// Переспрос делать в ДРУГОЕ время суток, иначе он повторит ту же ошибку:
//   node scripts/discover-schedules.mjs --only data/airport-service-recheck.json
//   node scripts/reconcile-service.mjs   (второй раз, с той же базой)
//
// Предохранитель: если свежий замер обнуляет больше MAX_LOSS_PCT обслуживаемых, файл не
// пишется вовсе. Такой обвал означает поломку замера, а не исчезновение рейсов, и молча
// принять его нельзя.
//
// Usage:  node scripts/reconcile-service.mjs [свежий] [эталон]
//
// Эталон по умолчанию — data/airport-service-baseline-2026-07-19.json, снимок ДО первого
// пересбора. Он в репозитории намеренно: без него второй проход не с чем сверять, а значит
// не воспроизводится ни на какой другой машине.

import fs from 'node:fs';

const FRESH = process.argv[2] || 'data/airport-service.json';
const BASE = process.argv[3] || 'data/airport-service-baseline-2026-07-19.json';
const OUT = 'data/airport-service.json';
const RECHECK = 'data/airport-service-recheck.json';
const MAX_LOSS_PCT = 0.20;

/** Коды, у которых ноль уже видели один раз. Второй ноль по ним — подтверждение. */
const pending = (() => {
  try { return new Set(JSON.parse(fs.readFileSync(RECHECK, 'utf8')).codes ?? []); }
  catch { return new Set(); }
})();

const read = (p) => { const j = JSON.parse(fs.readFileSync(p, 'utf8')); return { meta: j, map: j.airports ?? j }; };
const fresh = read(FRESH), base = read(BASE);

console.log(`свежий: ${FRESH} (${fresh.meta.generated ?? '—'}), кодов ${Object.keys(fresh.map).length}`);
console.log(`эталон: ${BASE} (${base.meta.generated ?? '—'}), кодов ${Object.keys(base.map).length}\n`);

const out = {};
const recheck = [];
let kept = 0, accepted = 0, promoted = 0, confirmedZero = 0, unchanged = 0, secondZero = 0, revived = 0;

for (const code of new Set([...Object.keys(base.map), ...Object.keys(fresh.map)])) {
  const b = base.map[code], f = fresh.map[code];
  if (f === undefined) { out[code] = b; kept++; continue; }          // не опрошен — прежний
  if (f > 0) {
    out[code] = f;
    if (!(b > 0)) promoted++; else if (f === b) unchanged++; else accepted++;
    // Был в очереди и ожил — вопрос закрыт, из очереди выходит (не попадая в recheck ниже).
    if (pending.has(code)) revived++;
    continue;
  }
  // f === 0
  if (b > 0) {
    if (pending.has(code)) { out[code] = 0; secondZero++; continue; }  // второй ноль — принят
    out[code] = b; recheck.push(code); kept++; continue;               // первый — не принят
  }
  out[code] = 0; confirmedZero++;
}

const servedBefore = Object.values(base.map).filter((n) => n > 0).length;
const servedAfter = Object.values(out).filter((n) => n > 0).length;
const loss = (servedBefore - servedAfter) / Math.max(servedBefore, 1);

console.log('приёмка:');
console.log(`  свежий счёт принят          ${accepted + unchanged}  (из них без изменений ${unchanged})`);
console.log(`  ПОЯВИЛОСЬ обслуживание      ${promoted}`);
console.log(`  ноль совпал с прежним нулём  ${confirmedZero}`);
console.log(`  ВТОРОЙ ноль — принят         ${secondZero}`);
console.log(`  ожил после переспроса        ${revived}`);
console.log(`  первый ноль, на переспрос    ${recheck.length}`);
console.log(`  оставлено прежним (ошибка)  ${kept - recheck.length}`);
console.log(`\nобслуживаемых: ${servedBefore} → ${servedAfter}  (${loss >= 0 ? '−' : '+'}${Math.abs(100 * loss).toFixed(1)}%)`);

if (loss > MAX_LOSS_PCT) {
  console.error(`\n✗ ОТКАЗ: свежий замер обнуляет ${(100 * loss).toFixed(1)}% обслуживаемых при пороге ${(100 * MAX_LOSS_PCT).toFixed(0)}%.`);
  console.error('  Это похоже на поломку замера, а не на исчезновение рейсов. Файл не тронут.');
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify({
  generated: new Date().toISOString().slice(0, 10),
  note: 'scheduled departures returned by airlabs at probe time; 0 = no scheduled commercial service, confirmed by two probes at different times of day',
  counts: { probed: Object.keys(out).length, withService: servedAfter, empty: Object.keys(out).length - servedAfter },
  airports: out,
}, null, 2) + '\n');
fs.writeFileSync(RECHECK, JSON.stringify({
  note: 'вернули ноль в скользящем окне, но прежний замер видел рейсы — переспросить в ДРУГОЕ время суток',
  generated: new Date().toISOString().slice(0, 16),
  codes: recheck.sort(),
}, null, 2) + '\n');

console.log(`\n✓ записан ${OUT}`);
console.log(`✓ записан ${RECHECK} — ${recheck.length} кодов ждут переспроса в другое время суток`);
