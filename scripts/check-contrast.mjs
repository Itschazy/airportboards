// Контраст табло против того фона, который браузер действительно рисует под текстом.
//
// Сторож написан после того, как слово статуса на вылетевшей строке намерило 1.18:1 — это не
// «тускло», это невидимо, и прожило оно несколько проходов по оформлению, потому что никто не
// перемножает шестнадцатеричный цвет на прозрачность строки в голове.
//
// 🔴 ПЕРЕПИСАН 31.10.2026. Прежняя редакция искала в FlightBoard.tsx шестнадцатеричные
// литералы (`past: '#ADADB2'`), а цвет давно уехал в CSS-переменные (`past: 'var(--ab-adadb2)'`).
// Все семь измерений печатали «цвет не найден в исходнике» и не мерили НИЧЕГО — сторож краснел
// каждый день на пустом месте, а вечный красный приучает не смотреть в сводку.
//
// И он ослеп ровно на том дефекте, ради которого заводился второй раздел. Номер рейса —
// единственное, по чему человек ищет свою строку, — теперь написан как
// `rgba(var(--ab-ink),0.65)`, то есть снова мимо набора: регулярка ждала только цифры.
//
// Что изменилось по существу:
//   · цвет резолвится через переменные из app/globals.css, а не выдёргивается литералом;
//   · мерятся ОБЕ темы. Светлой при написании сторожа не существовало, а в ней тот же токен
//     даёт другой цвет (--ab-adadb2: #ADADB2 тёмная, #4C4C50 светлая) на другом фоне;
//   · фон считается стеком, который рисует браузер: стекло строки (--glass-soft) поверх фона
//     страницы (--ab-050505). Прежде он был вписан числом (#080808) и к светлой теме не
//     относился вовсе. Обои за стеклом не учитываются — под текстом лежит стекло.
//
// Usage:  npm run check:contrast

import fs from 'node:fs';

const CSS = fs.readFileSync('app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const SRC = fs.readFileSync('components/FlightBoard.tsx', 'utf8');

// ── Таблицы переменных по темам ──────────────────────────────────────────────────────────
//
// Объявления собираются из всех блоков :root. Тему блока определяет сначала @media
// (prefers-color-scheme), затем селектор [data-theme=…]; :not(…) из селектора вырезается,
// иначе `:root:not([data-theme="dark"])` внутри светлого @media прочитался бы как тёмный.
function themes() {
  const base = {}, dark = {}, light = {};
  for (const m of CSS.matchAll(/:root(?:\[[^\]]*\]|:not\([^)]*\))*\s*\{([^{}]*)\}/g)) {
    const sel = m[0].slice(0, m[0].indexOf('{')).replace(/:not\([^)]*\)/g, '');
    const mq = /@media[^{]*prefers-color-scheme\s*:\s*(light|dark)[^{]*\{\s*$/
      .exec(CSS.slice(Math.max(0, m.index - 200), m.index));
    const into = (mq?.[1] === 'light' || /\[data-theme="light"\]/.test(sel)) ? light
      : (mq?.[1] === 'dark' || /\[data-theme="dark"\]/.test(sel)) ? dark
        : base;
    for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) into[d[1]] = d[2].trim();
  }
  return { тёмная: { ...base, ...dark }, светлая: { ...base, ...light } };
}

/** Цвет в {r,g,b,a}. Понимает #rrggbb, rgb/rgba с числами и rgba(var(--ab-ink),α). */
function parse(value, vars, depth = 0) {
  if (value == null || depth > 5) return null;
  const v = String(value).trim();
  const ref = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(v);
  if (ref) return parse(vars[ref[1]], vars, depth + 1);
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  // rgba(var(--ab-ink),0.65) — нынешний способ записи цвета текста в табло.
  const viaVar = /^rgba?\(\s*var\(\s*(--[\w-]+)\s*\)\s*,\s*([\d.]+)\s*\)$/.exec(v);
  if (viaVar) {
    const t = parse(`rgb(${vars[viaVar[1]]})`, vars, depth + 1);
    return t && { ...t, a: Number(viaVar[2]) };
  }
  const nums = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (nums) return { r: +nums[1], g: +nums[2], b: +nums[3], a: nums[4] === undefined ? 1 : +nums[4] };
  return null;
}

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
/** Наложение с альфой: ровно так же смешивает браузер. */
const over = (fg, bg, a = fg.a) => ({
  r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1,
});
const ratio = (fg, bg, a) => {
  const l1 = lum(over(fg, bg, a)), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/** Константы цвета табло: `name: 'var(--ab-xxxxxx)'` внутри объекта C. */
const CONSTS = Object.fromEntries(
  [...SRC.slice(SRC.indexOf('const C = {'), SRC.indexOf('};', SRC.indexOf('const C = {')))
    .matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);

const PAST_OPACITY = Number((SRC.match(/opacity: isPast \? ([\d.]+)/) || [])[1] ?? 1);

/** Цвета, вписанные в style строкой, а не через константу. Дефект номера рейса жил здесь. */
const RAW = [...new Set([...SRC.matchAll(/color:\s*'(rgba?\([^']+\))'/g)].map((m) => m[1]))];

let failures = 0;

for (const [theme, vars] of Object.entries(themes())) {
  const bg = (() => {
    const glass = parse(vars['--glass-soft'], vars);
    const page = parse(vars['--ab-050505'], vars);
    return glass && page ? over(glass, page) : page;
  })();
  const hx = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  console.log(`\n${theme} тема · фон строки ${hx(bg)} (стекло поверх фона страницы)`
    + ` · прозрачность прошедших ${PAST_OPACITY}\n`);

  const check = (label, value, alpha, min) => {
    const c = parse(value, vars);
    if (!c || !bg) {
      console.error(`  ✗ ${label}: цвет не разобран (${value})`);
      failures++;
      return;
    }
    const r = ratio(c, bg, (c.a ?? 1) * alpha);
    const ok = r >= min;
    console[ok ? 'log' : 'error'](`  ${ok ? '✓' : '✗'} ${label}: ${r.toFixed(2)}:1 (нужно ${min})`);
    if (!ok) failures++;
  };

  check('статус прошедшего рейса', CONSTS.past, PAST_OPACITY, 4.5);
  check('статус «по расписанию»', CONSTS.green, 1, 4.5);
  check('статус «задержан»', CONSTS.orange, 1, 4.5);
  check('статус «посадка»', CONSTS.blue, 1, 3);
  check('статус «отменён»', CONSTS.red, 1, 4.5);
  check('вторичный текст', CONSTS.secondary, 1, 4.5);
  check('время на активной строке', CONSTS.text, 1, 4.5);

  // Альфа самого цвета и групповая прозрачность строки перемножаются — браузер делает так же,
  // и дефект номера рейса жил именно во втором случае.
  for (const raw of RAW) {
    check(`${raw} на активной строке`, raw, 1, 4.5);
    check(`${raw} на ПРОШЕДШЕЙ строке`, raw, PAST_OPACITY, 4.5);
  }
  if (!RAW.length) console.log('  (цветов, вписанных в style строкой, нет — всё идёт через константы)');
}

console.log(failures ? `\n${failures} проблем(ы) контраста` : '\nконтраст в порядке в обеих темах');
process.exit(failures ? 1 : 0);
