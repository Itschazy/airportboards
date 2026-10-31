// Parse and RUN the Metrica bootstrap before it can reach production.
//
// Why this exists: the snippet has shipped a hard SyntaxError to production twice, and both
// times it looked like "the counter is flaky" rather than "the script does not parse", so it
// went unnoticed for days. Reading the string cannot catch this class — a bare `/` closing a
// regex literal, or a compiler folding a quote next to an interpolation, both produce
// something that looks fine in the editor and in `next dev`, and dies in the browser.
//
// So this does the only thing that actually proves it: hands the string to the JS parser, then
// executes it against stubbed time zones and checks it did the right thing for each.
//
// TWO MODES, and the second one is not optional before a deploy:
//
//   node scripts/check-metrica.mjs
//       Transpiles lib/metrica-snippet.ts with the project's TypeScript and checks the result.
//       Fast, catches authoring mistakes, runs anywhere.
//
//   node scripts/check-metrica.mjs <url|file.html|--built>
//       Pulls the snippet out of a page the REAL build produced and checks that instead.
//       `--built` берёт пререндеренную русскую страницу прямо из каталога сборки
//       (NEXT_DIST_DIR, по умолчанию .next) — ни сервера, ни порта не нужно.
//
// The second mode exists because the first one is not sufficient, and that was learned by
// shipping: the folding bug lives in SWC inside `next build`, not in tsc, so the source-mode
// check went green while the built page carried a snippet that could not parse. Whatever
// verifies a deploy has to read what the build emitted.
//
// 🔴 31.10.2026. У режима сборки в package.json был вписан адрес http://localhost:3002, то
// есть порт, которого нет ни в одном описанном рабочем процессе (стенд поднимается на 3099).
// Проверка падала ECONNREFUSED ВСЕГДА — и красная по построению она хуже отсутствующей:
// к вечному красному привыкают, и настоящая поломка тонет в нём же. Теперь страница берётся
// из каталога сборки: читается ровно то, что выдал build, и без запущенного сервера.

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';

const SRC = path.join('lib', 'metrica-snippet.ts');

// Transpile with the project's own TypeScript rather than a hand-rolled parser, so the check
// tests exactly what the bundler would emit — including any string folding.
const YM_ID = 110112198;
const target = process.argv[2];

/**
 * Pull the counter bootstrap out of a rendered page.
 *
 * 🔴 RSC-нагрузка отбрасывается, и без этого режим сборки не работал вовсе. Next кладёт тот же
 * сниппет ВТОРОЙ раз — экранированной строкой внутри `self.__next_f.push([1,"…"])`, — и на
 * странице 404 только так: настоящего инлайнового скрипта там нет. Выборка брала эту строку,
 * отдавала её парсеру, и все семнадцать измерений падали с «self is not defined», то есть на
 * собственной обёртке. Это та самая ловушка, из-за которой в CLAUDE.md записано «греп по
 * полному HTML врёт»: в RSC-нагрузке лежит всё, и поиск по странице отвечает «да» на любой
 * вопрос.
 */
function pickSnippet(html) {
  return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .find((s) => s.includes('mc.yandex.ru/metrika/tag.js') && !s.includes('self.__next_f')) ?? null;
}

function fromHtml(html) {
  const hit = pickSnippet(html);
  if (!hit) {
    throw new Error(html.includes('mc.yandex.ru/metrika/tag.js')
      ? 'сниппет на странице есть только внутри RSC-нагрузки (self.__next_f) — это не исполняемый скрипт'
      : 'в этой странице нет инлайнового скрипта Метрики');
  }
  return hit;
}

/**
 * Пререндеренная РУССКАЯ страница из каталога сборки.
 *
 * Русская — потому что счётчик стоит только на ней (components/YandexMetrica.tsx), на
 * остальных одиннадцати локалях сниппета нет по построению, и искать его там бессмысленно.
 * Берётся первая подходящая: сниппет на всех страницах один и тот же, а склейку SWC надо
 * ловить в выданном сборкой байте, а не в источнике.
 */
function fromBuild() {
  const dist = process.env.NEXT_DIST_DIR || '.next';
  const root = path.join(dist, 'server', 'app', 'ru');
  if (!fs.existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!e.name.endsWith('.html')) continue;
      const html = fs.readFileSync(p, 'utf8');
      // Именно pickSnippet, а не поиск по странице: на 404 сниппет есть только в RSC-нагрузке.
      if (pickSnippet(html)) return { path: p, html };
    }
  }
  return null;
}

let snippet, source;
if (target === '--built') {
  const built = fromBuild();
  if (!built) {
    // Отказ вслух, а не красный на пустом месте: без сборки проверять нечего, и сказать об
    // этом надо так, чтобы в суточной сводке было видно, что измерения НЕ БЫЛО.
    console.log(`НЕ ИЗМЕРЕНО: в ${process.env.NEXT_DIST_DIR || '.next'} нет пререндеренной русской страницы`
      + ' со счётчиком. Собери стенд (NEXT_DIST_DIR=…) или передай адрес страницы аргументом.');
    process.exit(0);
  }
  snippet = fromHtml(built.html);
  source = `собранная страница ${built.path}`;
} else if (target) {
  const html = /^https?:/.test(target)
    ? await (await fetch(target, { headers: { 'user-agent': 'metrica-check' } })).text()
    : fs.readFileSync(target, 'utf8');
  snippet = fromHtml(html);
  source = `собранная страница ${target}`;
} else {
  const js = ts.transpileModule(fs.readFileSync(SRC, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  snippet = mod.metricaSnippet(YM_ID);
  source = `исходник ${SRC} (ВНИМАНИЕ: tsc не воспроизводит склейку SWC — перед деплоем проверь собранную страницу)`;
}
console.log(`источник: ${source}\n`);

let failures = 0;
const fail = (msg) => { console.error(`  ✗ ${msg}`); failures++; };
const pass = (msg) => console.log(`  ✓ ${msg}`);

// ── 1. Does it parse at all? ────────────────────────────────────────────────────────────
// This is the check that would have caught both production outages.
try {
  new Function(snippet);
  pass('сниппет парсится');
} catch (e) {
  fail(`СИНТАКСИЧЕСКАЯ ОШИБКА — счётчик не запустится ни у кого: ${e.message}`);
  console.error(`\n${snippet}\n`);
  process.exit(1); // nothing below can run
}

// ── 2. Balance, as a second opinion on the folding failure ──────────────────────────────
for (const [open, close, what] of [['(', ')', 'скобки'], ['{', '}', 'фигурные скобки']]) {
  const o = snippet.split(open).length - 1;
  const c = snippet.split(close).length - 1;
  o === c ? pass(`${what} сбалансированы (${o})`) : fail(`${what}: ${o} открывающих против ${c} закрывающих`);
}
const quotes = snippet.split("'").length - 1;
quotes % 2 === 0 ? pass(`кавычки парные (${quotes})`) : fail(`нечётное число кавычек: ${quotes}`);

// ── 3. Does it BEHAVE correctly per region? ─────────────────────────────────────────────
// A snippet that parses but blocks Moscow is just as dead as one that does not parse — that
// is the whole traffic base. Run it for real against each zone.
const REGIONS = [
  ['Europe/Moscow',      true,  'Москва'],
  ['Europe/Kaliningrad', true,  'Калининград'],
  ['Europe/Samara',      true,  'Самара'],
  ['Asia/Yekaterinburg', true,  'Екатеринбург'],
  ['Asia/Novosibirsk',   true,  'Новосибирск'],
  ['Asia/Tashkent',      true,  'Ташкент'],
  ['Asia/Baku',          true,  'Баку'],
  ['Europe/Istanbul',    true,  'Стамбул'],
  ['Europe/Minsk',       true,  'Минск'],
  ['Europe/Kyiv',        true,  'Киев'],
  ['Europe/Berlin',      false, 'Берлин (ЕЭЗ)'],
  ['Europe/Paris',       false, 'Париж (ЕЭЗ)'],
  ['Europe/London',      false, 'Лондон (UK)'],
  ['Europe/Zurich',      false, 'Цюрих (CH)'],
  ['Atlantic/Canary',    false, 'Канары (Испания)'],
  ['Atlantic/Reykjavik', false, 'Рейкьявик (Исландия)'],
  ['America/New_York',   true,  'Нью-Йорк'],
];

for (const [tz, shouldLoad, label] of REGIONS) {
  let requested = null;
  const doc = {
    scripts: [],
    createElement: () => ({ set src(v) { requested = v; }, get src() { return requested; } }),
    getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
  };
  // A real global context, not an object called `window`. The snippet writes `m[i]` (i.e.
  // window.ym) and then CALLS bare `ym(...)`; in a browser those are the same binding. Passing
  // window as a plain parameter breaks that identity and the snippet dies with "ym is not
  // defined" — a failure of the harness that looks exactly like a failure of the snippet.
  const ctx = {
    document: doc,
    location: { hostname: 'airportsboard.live' },
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const win = ctx;
  try {
    vm.runInContext(snippet, ctx);
  } catch (e) {
    fail(`${label}: сниппет упал при исполнении — ${e.message}`);
    continue;
  }
  const loaded = typeof requested === 'string' && requested.includes(String(YM_ID));
  if (loaded !== shouldLoad) {
    fail(`${label} (${tz}): ожидалось ${shouldLoad ? 'загрузить' : 'НЕ загружать'}, вышло наоборот`);
  } else if (shouldLoad && typeof win.ym !== 'function') {
    fail(`${label}: тег загружен, но очередь ym() не создана`);
  } else {
    pass(`${label}: ${shouldLoad ? 'считает' : 'не грузится'}`);
  }
}

// ── 4. Production host only ─────────────────────────────────────────────────────────────
// Dev sessions were being counted in the production report — 19 visits, two of them 668 and
// 956 seconds long against a 173-second site average.
{
  const hosts = [['airportsboard.live', true], ['www.airportsboard.live', true],
                 ['localhost', false], ['127.0.0.1', false],
                 // Lookalike: contains the domain but does not end with it.
                 ['airportsboard.live.evil.com', false],
                 ['notairportsboard.live', false]];
  for (const [host, shouldLoad] of hosts) {
    let requested = null;
    const doc = {
      scripts: [],
      createElement: () => ({ set src(v) { requested = v; } }),
      getElementsByTagName: () => [{ parentNode: { insertBefore: () => {} } }],
    };
    const ctx = {
      document: doc,
      location: { hostname: host },
      Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Europe/Moscow' }) }) },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    try { vm.runInContext(snippet, ctx); } catch (e) { fail(`${host}: ${e.message}`); continue; }
    const loaded = typeof requested === 'string';
    loaded === shouldLoad
      ? pass(`${host}: ${shouldLoad ? 'считает' : 'не считает'}`)
      : fail(`${host}: ожидалось ${shouldLoad ? 'считать' : 'НЕ считать'}, вышло наоборот`);
  }
}

// ── 5. Webvisor must stay off ───────────────────────────────────────────────────────────
// It was running undisclosed once already. Re-enabling it needs a privacy-policy change, so
// it must not come back through a copy-paste of someone else's counter code.
/webvisor\s*:\s*true/.test(snippet)
  ? fail('webvisor включён — он не раскрыт в политике приватности')
  : pass('webvisor выключен');

console.log(failures ? `\n${failures} проблем(ы)` : '\nсниппет Метрики в порядке');
process.exit(failures ? 1 : 0);
