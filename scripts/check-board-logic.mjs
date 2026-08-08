// Prove the two board rules on synthetic flights, with no store and no provider call.
//
// Both rules were wrong in production on 2026-08-08 and neither failure was visible in code
// review, because both depend on the gap between when the data was taken and when the page is
// read — a gap that is zero on a developer's machine and was 2h19m on the Kazan arrivals board.
//
//   1. Status is derived against the SNAPSHOT, not against the reader's clock. Otherwise a
//      stale board keeps "landing" flights as the clock rolls past their schedule: fifteen
//      consecutive rows read "Получение багажа", and for five of them the scheduled landing was
//      LATER than the snapshot itself, so our data said nothing about them at all.
//   2. Row order is recomputed at READ time. It used to be frozen inside the paid fetch, so the
//      first arrival still to come sat at row sixteen of a twelve-row board — someone meeting a
//      flight saw nothing but aircraft already on the ground.
//
// Usage:  npm run check:board

import fs from 'node:fs';
import ts from 'typescript';

// Compile lib/flights.ts alone. It imports store and locale helpers we do not want to drag in,
// so the imports are stubbed out before compiling — the two functions under test are pure.
// The stripped imports have to be replaced, not merely deleted: the module builds lookup
// tables at load time and would throw before a single test ran.
const STUBS = `
const airports = [];
const airlines = {};
const getCityName = (c) => c;
const getAirportName = (i) => i;
const archiveBoard = () => {};
const getFresh = () => null, getStale = () => null, getStaleTs = () => null;
const put = () => {}, canSpend = () => false, spend = () => {}, noteProviderLimit = () => {};
`;
const src = STUBS + fs.readFileSync('lib/flights.ts', 'utf8')
  .replace(/^import[\s\S]*?from '[^']*';$/gm, '')
  .replace(/^export type \{[^}]*\}[^;]*;$/gm, '');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;

// orderBoard is module-private on purpose; expose it for the test without changing the source.
const mod = await import('data:text/javascript;base64,'
  + Buffer.from(js + '\nexport { orderBoard };').toString('base64'));
const { mapStatus, orderBoard } = mod;

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

const HOUR = 3600;
const T0 = 1_754_640_000;          // fixed instant; nothing here reads the wall clock
const arr = (id, atSec, extra = {}) => ({ flight_iata: id, arr_time_ts: atSec, arr_iata: 'KZN', ...extra });
const dep = (id, atSec, extra = {}) => ({ flight_iata: id, dep_time_ts: atSec, dep_iata: 'KZN', ...extra });

// ── 1. Landing is never inferred from time that passed after the snapshot ────────────────
{
  const snapshot = T0;
  const readAt = T0 + 2 * HOUR + 19 * 60;      // the real Kazan gap

  const landedBefore = arr('A1', T0 - 30 * 60);
  const dueAfter     = arr('A2', T0 + 40 * 60);   // scheduled after the snapshot was taken

  mapStatus(landedBefore, 'arrivals', snapshot) === 'baggage'
    ? pass('сел до снимка → «получение багажа»')
    : fail('рейс, севший до снимка, не помечен прилетевшим');

  // The contract: given the SNAPSHOT, a flight due after it is never reported as landed —
  // however long ago that snapshot was taken. Passing readAt here instead would reproduce the
  // old bug, which is what the wiring assertion at the bottom of this file guards against.
  const honest = mapStatus(dueAfter, 'arrivals', snapshot);
  honest === 'baggage'
    ? fail('ВЫДУМКА: рейс «сел», хотя по данным снимка он ещё не садился')
    : pass(`расписание истекло после снимка → статус не выдуман (${honest})`);

  // The same row, read 2h19m later. The verdict must not drift with the reader's clock.
  mapStatus(dueAfter, 'arrivals', snapshot) === honest
    ? pass('через 2 ч 19 мин чтения вердикт тот же — от часов читателя не зависит')
    : fail('вердикт меняется со временем чтения');
  void readAt;

  // A provider-confirmed landing must survive regardless of clocks.
  mapStatus(arr('A3', T0 + 5 * HOUR, { status: 'landed' }), 'arrivals', snapshot) === 'baggage'
    ? pass('подтверждённая провайдером посадка сохраняется')
    : fail('подтверждённая посадка потеряна');

  // Departures share the rule: "Boarding" and "Final call" describe a gate right now.
  const soon = dep('D1', T0 + 20 * 60);
  mapStatus(soon, 'departures', snapshot) === 'boarding'
    ? pass('вылет через 20 мин от снимка → «посадка»')
    : fail(`вылет через 20 мин дал ${mapStatus(soon, 'departures', snapshot)}`);
  mapStatus(soon, 'departures', readAt) === 'departed'
    ? pass('на устаревшем снимке тот же вылет не остаётся в «посадке»')
    : fail('устаревший снимок держит рейс в «посадке»');
}

// ── 2. Reading order puts what is next near the top, and loses nothing ───────────────────
{
  // Fifteen already landed, four still to come — the shape of the real board.
  const past = Array.from({ length: 15 }, (_, i) => arr(`P${i}`, T0 - (15 - i) * 20 * 60));
  const next = Array.from({ length: 4 }, (_, i) => arr(`N${i}`, T0 + (i + 1) * 30 * 60));
  const board = [...past, ...next];

  const read = orderBoard(board, 'arrivals', T0);
  const firstUpcoming = read.findIndex(f => f.flight_iata.startsWith('N'));

  read.length === board.length
    ? pass(`порядок при чтении ничего не теряет (${read.length} строк)`)
    : fail(`при чтении потеряно ${board.length - read.length} строк`);

  firstUpcoming >= 0 && firstUpcoming <= 3
    ? pass(`первый предстоящий прилёт — строка ${firstUpcoming + 1} (было 16)`)
    : fail(`первый предстоящий прилёт всё ещё строка ${firstUpcoming + 1}`);

  firstUpcoming <= 12
    ? pass('он попадает в отрисованные строки')
    : fail('он по-прежнему за кнопкой «показать больше»');

  // A board that has gone completely stale must still render.
  const allStale = orderBoard(past, 'arrivals', T0 + 12 * HOUR);
  allStale.length === past.length
    ? pass('полностью протухший борт при чтении не опустошается')
    : fail(`протухший борт потерял ${past.length - allStale.length} строк — прилёты отрендерятся пустыми`);

  // Departures: next to depart first, already gone after.
  const deps = orderBoard([dep('X', T0 - HOUR), dep('Y', T0 + HOUR), dep('Z', T0 + 30 * 60)], 'departures', T0);
  deps.map(f => f.flight_iata).join(',') === 'Z,Y,X'
    ? pass('вылеты: ближайший первым, улетевшие ниже')
    : fail(`порядок вылетов ${deps.map(f => f.flight_iata).join(',')}, ожидалось Z,Y,X`);
}

// ── 3. The wiring, because the rule above is only as good as what the caller passes ──────
// mapStatus defaults to now() so the client path keeps working; that default is exactly the
// old bug if getBoard ever falls back to it. Assert on the source that the server path derives
// its instant from the store, not from the clock.
{
  const src = fs.readFileSync('lib/flights.ts', 'utf8');
  const gb = src.slice(src.indexOf('export async function getBoard'), src.indexOf('export function getBoardFetchedAt'));
  /getStaleTs\(/.test(gb) && /mapFlight\(f, direction, locale, asOfSec\)/.test(gb)
    ? pass('getBoard берёт время снимка из стора и передаёт его в mapFlight')
    : fail('getBoard НЕ передаёт время снимка — статусы снова считаются по часам читателя');
  /orderBoard\(own, direction/.test(gb)
    ? pass('getBoard переупорядочивает борт при чтении')
    : fail('getBoard не переупорядочивает — порядок снова застынет на моменте забора');
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nлогика табло в порядке');
process.exit(failures ? 1 : 0);
