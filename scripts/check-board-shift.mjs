// Сдвиг разметки на гидратации: не прыгает ли число строк борта под пальцем у читателя.
//
// Замер, из-за которого проверка появилась: 43 живых борта, схлопывались 36. Сервер отдавал
// 30 строк, клиент через долю секунды оставлял 12 — минус 18 строк, около 1300 px, ровно
// под пальцем у человека, который уже начал читать. Строки к тому моменту успевали приехать
// по проводу и были оплачены трафиком: платим за то, что тут же прячем.
//
// Причина — точка отсчёта. initialRowCount считает «сколько рейсов ещё впереди», а сравнивать
// их было не с чем одинаковым: сервер знает только время снимка, клиент после монтирования
// переключался на настоящее время и тикал дальше каждую минуту. У свежего снимка оба ответа
// совпадают, у шестнадцатичасового расходятся на всю высоту экрана — поэтому дефект и не
// показывался на тех бортах, которые открываешь для проверки: они как раз свежие.
//
// ЧТО ИМЕННО ПРОВЕРЯЕТСЯ. Не «совпали ли два числа» — после исправления они совпадают по
// построению, и такая проверка проходила бы, ничего не проверяя. Проверяется ПРИЧИНА:
// точка отсчёта у счётчика строк обязана приезжать вместе с данными и никогда — с настенных
// часов. Рядом печатается цена вопроса по живым бортам: насколько разъехались бы числа,
// вернись старое поведение. Это не приговор, а то, что стоит на кону.
//
// Провайдерские эндпоинты не трогаются: страницы читаются обычным GET с не-браузерным UA,
// что по построению не тратит платную квоту (см. lib/live-budget.ts, слой 1).
//
// Usage:  node scripts/check-board-shift.mjs [base] [коды через запятую]

import fs from 'node:fs';
import ts from 'typescript';

// Та же функция, что крутится в браузере, а не её копия — иначе проверка со временем начнёт
// мерить не то, что работает. Приём взят из scripts/check-board-logic.mjs.
const { initialRowCount } = await import(
  'data:text/javascript;base64,' + Buffer.from(
    ts.transpileModule(fs.readFileSync('lib/board-window.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText,
  ).toString('base64')
);

const BASE = process.argv[2] || 'http://localhost:3002';
const CODES = (process.argv[3] || 'SVO,AYT,DXB,IST,KZN,LED,GRU,HND,DEL,LHR,JFK,FRA').split(',');
const ROW_PX = 72;

let fails = 0;

// ── 1. Утверждение: откуда берётся точка отсчёта ──────────────────────────────────────────
//
// Разрешено ровно одно: присвоение из времени пришедшего снимка. Запрещено любое присвоение
// из настенных часов — именно оно и создавало скачок. Таймер на этом состоянии запрещён по
// той же причине: тикающая точка отсчёта означает, что разметка меняется сама по себе.

const SRC = fs.readFileSync('components/FlightBoard.tsx', 'utf8');

/**
 * Аргументы вызова `name(...)` — с учётом ВЛОЖЕННЫХ скобок.
 *
 * Наивное `/name\(([^)]*)\)/` тут врёт, и врёт молча: у `setNowMs(Date.now())` оно захватит
 * «Date.now(» без закрывающей скобки, после чего проверка на `Date.now()` не сработает и
 * проверка отрапортует, что всё хорошо. Я так и написал сначала, подсунул ей заведомо
 * сломанную версию файла — и она поставила галочку. Отсюда счётчик скобок.
 */
function callArgs(src, name) {
  const out = [];
  const needle = `${name}(`;
  for (let i = src.indexOf(needle); i !== -1; i = src.indexOf(needle, i + 1)) {
    let depth = 0;
    for (let j = i + needle.length - 1; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) {
        out.push(src.slice(i + needle.length, j).trim());
        break;
      }
    }
  }
  return out;
}

const assigns = callArgs(SRC, 'setNowMs');

console.log('откуда счётчик строк берёт точку отсчёта\n');

if (!assigns.length) {
  console.log('  ✓ nowMs после старта не меняется вовсе');
} else {
  for (const a of assigns) {
    const wallClock = /Date\.now\(\)|new Date\(\s*\)/.test(a);
    if (wallClock) fails++;
    console.log(`  ${wallClock ? '✗' : '✓'} setNowMs(${a})${wallClock
      ? '  ← НАСТЕННЫЕ ЧАСЫ: разметка прыгнет на гидратации'
      : ''}`);
  }
}

// Тикающая точка отсчёта — тот же дефект, только растянутый во времени. Скобки тут вложены
// ещё гуще (`setInterval(() => setNowMs(...), 60_000)`), поэтому тот же разбор по балансу.
const ticks = callArgs(SRC, 'setInterval').some((a) => a.includes('setNowMs'));
if (ticks) fails++;
console.log(`  ${ticks ? '✗ точка отсчёта тикает по таймеру' : '✓ таймера на точке отсчёта нет'}`);

// Счётчик строк должен по-прежнему считать от неё, а не от чего-то ещё.
const wired = /initialRowCount\(flights, nowMs\)/.test(SRC);
if (!wired) fails++;
console.log(`  ${wired ? '✓' : '✗'} счётчик строк считает от неё${wired ? '' : ' — вызов initialRowCount(flights, nowMs) пропал'}`);

// ── 2. Цена вопроса на живых бортах ───────────────────────────────────────────────────────

console.log(`\nчто было бы при возврате старого поведения (${BASE})\n`);
console.log(`${'код'.padEnd(5)}${'рейсов'.padStart(7)}${'снимку'.padStart(8)}${'от снимка'.padStart(11)}${'от часов'.padStart(10)}  разошлись бы на`);

let measured = 0, atRisk = 0, worst = 0;

for (const code of CODES) {
  let html;
  try {
    const res = await fetch(`${BASE}/ru/airport/${code}`, { headers: { 'user-agent': 'audit-bot' } });
    if (!res.ok) { console.log(`${code.padEnd(5)}  HTTP ${res.status}`); continue; }
    html = await res.text();
  } catch (e) {
    console.log(`${code.padEnd(5)}  не ответил: ${e.message}`);
    continue;
  }

  // Данные едут в полезной нагрузке RSC экранированными: \"ts\":1786495200
  const rows = [...html.matchAll(/\\"ts\\":(\d{9,11})/g)].map((m) => ({ ts: Number(m[1]) }));
  const fa = html.match(/initialFetchedAt\\":(\d{12,14})/);
  if (!rows.length || !fa) { console.log(`${code.padEnd(5)}  снимка на странице нет — борт не прогрет`); continue; }

  const fetchedAt = Number(fa[1]);
  const fromSnapshot = initialRowCount(rows, fetchedAt);
  const fromClock = initialRowCount(rows, Date.now());
  const gap = fromSnapshot - fromClock;
  const ageH = (Date.now() - fetchedAt) / 3600e3;

  measured++;
  if (gap !== 0) { atRisk++; worst = Math.max(worst, Math.abs(gap)); }

  console.log(`${code.padEnd(5)}${String(rows.length).padStart(7)}${(ageH.toFixed(1) + 'ч').padStart(8)}`
    + `${String(fromSnapshot).padStart(11)}${String(fromClock).padStart(10)}  `
    + (gap === 0 ? '—' : `${Math.abs(gap)} строк ≈ ${Math.abs(gap) * ROW_PX} px`));
}

console.log(`\nизмерено бортов: ${measured}; разошлись бы на ${atRisk}, худший случай ${worst} строк ≈ ${worst * ROW_PX} px`);
console.log(fails
  ? `\nПРОВАЛОВ: ${fails} — точка отсчёта снова зависит от настенных часов, разметка прыгает`
  : '\nточка отсчёта приезжает только вместе с данными — разметка не прыгает');

process.exit(fails ? 1 : 0);
