// Не может ли разметка JSON-LD выйти из своего <script>.
//
// Содержимое <script> браузер читает как сырой текст и ищет в нём ровно `</script`. Строка с
// этой последовательностью, попав внутрь разметки, закрывает тег раньше времени, и всё после
// неё разбирается как HTML. Между чужими данными и этим контекстом стоит одно экранирование
// символа `<`, и его легко забыть: аудит 31.10.2026 нашёл 23 места вставки, из которых
// экранирование было РОВНО В ОДНОМ.
//
// Забыть теперь негде — вставка идёт через ldScript() из lib/json-ld.ts, — но сторож нужен
// именно потому, что следующее место вставки допишут руками, а на странице это не проявится:
// разметку видит поисковик, не человек, и замер живой страницы Казани показал восемь блоков
// без единого сырого `<`. Дыра была спящей, и спящей же вернётся.
//
// Проверяется ТРИ вещи, и третья важнее первых двух:
//   1. каждое место вставки идёт через помощника, голого JSON.stringify рядом с ld+json нет;
//   2. помощник действительно экранирует `<`;
//   3. экранирование НЕ МЕНЯЕТ данные при разборе: `<` — законный JSON, и поисковик
//      обязан прочитать ту же строку, что мы положили. Иначе «защита» молча портила бы
//      разметку, то есть ломала бы то единственное, ради чего она существует.
//
// Usage:  node scripts/check-json-ld.mjs

import fs from 'node:fs';
import path from 'node:path';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log('разметка JSON-LD:');

// ── 1. Все места вставки — через помощника ───────────────────────────────────────────────
const files = [];
for (const root of ['app', 'components', 'lib']) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  }
}

const bare = [];
let sinks = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const line of src.split('\n')) {
    if (!line.includes('application/ld+json')) continue;
    // Строки комментариев не считаются: тип разметки упомянут и в разборе у самого
    // помощника, и обвинять его в том, что он не зовёт сам себя, — ровно та ошибка, за
    // которую в этом репозитории уже трижды краснела check-sitemap-scope.
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue;
    sinks++;
    if (!line.includes('ldScript(')) bare.push(`${f}: ${line.trim().slice(0, 90)}`);
  }
}
say(sinks > 0, `мест вставки найдено: ${sinks}`);
bare.length
  ? bare.forEach((b) => say(false, `вставка мимо ldScript() — ${b}`))
  : say(true, 'все места вставки идут через ldScript()');

// ── 2 и 3. Поведение помощника ───────────────────────────────────────────────────────────
const { ldScript } = await import('data:text/javascript;base64,' + Buffer.from(
  fs.readFileSync('lib/json-ld.ts', 'utf8')
    .replace(/: unknown/g, '')
    .replace(/: \{ __html: string \}/g, ''),
).toString('base64'));

const payload = '</script><img src=x onerror=alert(1)>';
const html = ldScript({ name: payload }).__html;
say(!html.includes('<'), html.includes('<')
  ? `помощник НЕ экранирует «<»: ${html.slice(0, 80)}`
  : 'помощник не выпускает «<» наружу');
say(JSON.parse(html).name === payload,
  JSON.parse(html).name === payload
    ? 'разобранное значение совпадает с исходным — поисковик читает то же, что положили'
    : 'экранирование ИСКАЖАЕТ данные: разметка станет неверной');
say(ldScript(undefined).__html === 'null',
  `необязательная схема печатает ${ldScript(undefined).__html} вместо падения`);

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nразметка не может выйти из своего скрипта');
process.exit(fails ? 1 : 0);
