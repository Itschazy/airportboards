// События: молчат ли они без счётчиков и не утекает ли в них личное.
//
// Проверка появилась вместе с самим слоем событий. До 12.08.2026 в проекте не было ни одного
// reachGoal, и половину вопросов о продукте закрыть было нечем — в том числе главный: на ПК
// отказы 23% против 14.8% на мобильных при вдвое меньшей длительности, и без события
// «карточка рейса открыта» нельзя отличить «ушёл, не найдя» от «нашёл мгновенно и закрыл».
//
// Проверяются три вещи, каждая — про то, чем событие может навредить:
//
//   1. МОЛЧАНИЕ. Ни window.ym, ни window.gtag не обязаны существовать: Метрика подключена
//      только на русской локали, GA — только когда задан NEXT_PUBLIC_GA_ID, на сервере нет
//      ни того ни другого. Вызов события не имеет права уронить интерфейс.
//   2. НИЧЕГО ЛИЧНОГО. В параметры не должны попадать номер рейса, поисковый запрос,
//      координаты и прочее, что относится к конкретному человеку. Разрешены только
//      категориальные значения.
//   3. ИМЕНА ИЗ СПИСКА. reachGoal с новым идентификатором сам цель в Метрике не создаёт:
//      пока её не завели в интерфейсе, событие уходит в пустоту. Поэтому идентификаторы
//      живут одним списком, и вызов с именем вне списка — ошибка.
//
// Usage:  node scripts/check-track.mjs

import fs from 'node:fs';
import ts from 'typescript';

const { track, GOALS } = await import(
  'data:text/javascript;base64,' + Buffer.from(
    ts.transpileModule(fs.readFileSync('lib/track.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText,
  ).toString('base64')
);

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log('события\n');

// ── 1. Молчание без счётчиков ─────────────────────────────────────────────────────────────

// На сервере window нет вовсе.
say((() => { try { track(GOALS.flightCard); return true; } catch { return false; } })(),
  'без window (серверный рендер) не падает');

globalThis.window = {};
say((() => { try { track(GOALS.flightCard, { from: 'row' }); return true; } catch { return false; } })(),
  'без ym и gtag не падает');

// Счётчик, который сам бросает, — тоже реальность: блокировщик может подменить ym заглушкой.
let ymCalls = 0, gaCalls = 0;
globalThis.window = {
  ym: () => { ymCalls++; throw new Error('заблокирован'); },
  gtag: () => { gaCalls++; },
};
say((() => { try { track(GOALS.boardMode, { mode: 'arrivals' }); return true; } catch { return false; } })(),
  'падение одного счётчика не мешает другому');
say(ymCalls === 1 && gaCalls === 1, `оба счётчика вызваны (ym ${ymCalls}, gtag ${gaCalls})`);

// ── 2. Что реально отправляется ───────────────────────────────────────────────────────────

const sent = [];
globalThis.window = {
  ym: (_id, action, goal, params) => sent.push({ sink: 'ym', action, goal, params }),
  gtag: (kind, goal, params) => sent.push({ sink: 'ga', action: kind, goal, params }),
};
track(GOALS.flightCard, { from: 'row', past: true });

say(sent.some((e) => e.sink === 'ym' && e.action === 'reachGoal' && e.goal === 'flight_card'),
  'в Метрику уходит reachGoal с верным идентификатором');
say(sent.some((e) => e.sink === 'ga' && e.action === 'event' && e.goal === 'flight_card'),
  'в GA уходит event с тем же идентификатором');

// ── 3. Ничего личного и только имена из списка ────────────────────────────────────────────

const NAMES = new Set(Object.values(GOALS));
console.log(`\n  цели (завести в интерфейсе Метрики слово в слово):`);
for (const [k, v] of Object.entries(GOALS)) console.log(`    ${v.padEnd(14)} ← GOALS.${k}`);

const SRC = ['components/FlightBoard.tsx', 'components/AirportSearch.tsx']
  .map((f) => fs.readFileSync(f, 'utf8')).join('\n');

const calls = [...SRC.matchAll(/track\(\s*GOALS\.(\w+)\s*(?:,\s*\{([^}]*)\})?\s*\)/g)];
console.log(`\n  вызовов в коде: ${calls.length}\n`);

say(calls.length > 0, 'события вообще расставлены');

for (const [, name] of calls) {
  if (!(name in GOALS)) { say(false, `track(GOALS.${name}) — такого имени в списке нет`); }
}

/**
 * Признаки личного в параметрах. Ищем ИМЕНА полей и подстановки, которые несут значение,
 * относящееся к человеку или к конкретному рейсу, а не к категории.
 */
const PERSONAL = /\b(query|search|q|flight|iata|code|city|email|name|lat|lon|coords|ip|user)\b/i;
for (const [full, name, args] of calls) {
  if (!args) continue;
  const bad = args.split(',').map((s) => s.trim()).filter((a) => PERSONAL.test(a.split(':')[0]));
  if (bad.length) say(false, `track(GOALS.${name}) несёт личное: ${bad.join(', ')}`);
}
if (!calls.some(([, , a]) => a && PERSONAL.test(a.split(':')[0]))) {
  say(true, 'в параметрах только категориальные значения');
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nсобытия молчат без счётчиков и не несут личного');
process.exit(fails ? 1 : 0);
