// Contrast of the flight board against its real, composited background.
//
// Written after the status word on a departed row measured 1.18:1 — not "dim" but invisible,
// and it stayed that way through several UI passes because nobody multiplies a hex colour by a
// row opacity by hand. The board is dark-on-dark and every row carries its own translucency,
// so eyeballing the palette proves nothing; this composites the way a browser does.
//
// Usage:  npm run check:contrast

import fs from 'node:fs';

const SRC = fs.readFileSync('components/FlightBoard.tsx', 'utf8');
const hex = (name) => (SRC.match(new RegExp(name + ":\\s*'(#[0-9A-Fa-f]{6})'")) || [])[1];

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const n = h.replace('#', ''); const p = i => parseInt(n.slice(i, i + 2), 16);
  return 0.2126 * lin(p(0)) + 0.7152 * lin(p(2)) + 0.0722 * lin(p(4)); };
const over = (fg, bg, a) => { const f = fg.replace('#', ''), b = bg.replace('#', '');
  const p = (s, i) => parseInt(s.slice(i, i + 2), 16);
  return '#' + [0, 2, 4].map(i => Math.round(p(f, i) * a + p(b, i) * (1 - a)).toString(16).padStart(2, '0')).join(''); };
const ratio = (fg, bg, a = 1) => { const l1 = lum(over(fg, bg, a)), l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

// The row sits on the page background with a faint white wash; a browser composites that to
// roughly #080808, which is what these are measured against.
const ROW_BG = '#080808';

let failures = 0;
const check = (label, fg, alpha, min) => {
  if (!fg) { console.error(`  ✗ ${label}: цвет не найден в исходнике`); failures++; return; }
  const r = ratio(fg, ROW_BG, alpha);
  const ok = r >= min;
  console[ok ? 'log' : 'error'](`  ${ok ? '\u2713' : '\u2717'} ${label}: ${r.toFixed(2)}:1 (нужно ${min})`);
  if (!ok) failures++;
};

const PAST_OPACITY = Number((SRC.match(/opacity: isPast \? ([\d.]+)/) || [])[1] ?? 1);
console.log(`прозрачность прошедших строк: ${PAST_OPACITY}\n`);

check('статус прошедшего рейса', hex('past'), PAST_OPACITY, 4.5);
check('статус «по расписанию»',  hex('green'), 1, 4.5);
check('статус «задержан»',       hex('orange'), 1, 4.5);
check('статус «посадка»',        hex('blue'), 1, 3);
check('статус «отменён»',        hex('red'), 1, 4.5);
check('вторичный текст',         hex('secondary'), 1, 4.5);
check('время на активной строке', hex('text'), 1, 4.5);

console.log(failures ? `\n${failures} проблем(ы) контраста` : '\nконтраст в порядке');
process.exit(failures ? 1 : 0);
