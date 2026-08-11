// Узкий неразрывный пробел перед двойными знаками препинания во французском тексте.
//
// Во французской типографике перед «;», «:», «?», «!» и внутри кавычек «…» ставится узкий
// неразрывный пробел (U+202F). Это не украшение: без него текст читается как машинный
// перевод — ровно то впечатление, которого сайту с 6073 сгенерированными описаниями нужно
// избегать. Замерено: 3899 файлов из 6073 с французским текстом нарушают правило.
//
// Три случая, где пробел ставить НЕЛЬЗЯ, и каждый встречается в этом корпусе:
//   - «https://» и «http://» — двоеточие внутри адреса;
//   - «14:30» — двоеточие во времени, цифра слева;
//   - уже поставленный пробел любого вида, включая обычный, U+00A0 и U+202F.
//
// Обычный пробел перед знаком тоже заменяется на узкий неразрывный: перенос строки не должен
// оторвать знак от слова, и в вебе это единственный способ это гарантировать.
//
// Usage:
//   node scripts/fix-fr-typography.mjs           — сухой прогон
//   node scripts/fix-fr-typography.mjs --write    — применить

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const NNBSP = '\u202F';
const DIR = 'data/airport-content';

/**
 * Знак, требующий пробела слева. Двоеточие обрабатывается отдельно, потому что у него есть
 * законные употребления без пробела.
 */
const PLAIN = /([^\s\u00A0\u202F])([;?!])/g;
const COLON = /([^\s\u00A0\u202F0-9])(:)(?!\/\/)/g;

function fixFrench(text) {
  return text
    .replace(PLAIN, `$1${NNBSP}$2`)
    .replace(COLON, `$1${NNBSP}$2`)
    // Обычный или неразрывный пробел перед знаком — на узкий неразрывный.
    .replace(/[\s\u00A0]+([;:?!])/g, `${NNBSP}$1`)
    // Кавычки-ёлочки: пробел внутри, а не снаружи.
    .replace(/«[\s\u00A0]*/g, `«${NNBSP}`)
    .replace(/[\s\u00A0]*»/g, `${NNBSP}»`);
}

let files = 0, touched = 0, marks = 0;
const samples = [];

for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  const p = path.join(DIR, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const fr = data.fr;
  if (typeof fr !== 'string' || !fr) continue;
  files++;

  const next = fixFrench(fr);
  if (next === fr) continue;
  touched++;
  marks += [...next].filter((c) => c === NNBSP).length - [...fr].filter((c) => c === NNBSP).length;
  if (samples.length < 4) {
    const i = [...next].findIndex((c, j) => c !== fr[j]);
    samples.push([file.replace('.json', ''), fr.slice(Math.max(0, i - 40), i + 18), next.slice(Math.max(0, i - 40), i + 20)]);
  }
  data.fr = next;
  if (WRITE) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

console.log(`${WRITE ? 'исправлено' : 'будет исправлено'}: ${touched} файлов из ${files} с французским текстом, +${marks} узких пробелов\n`);
for (const [code, before, after] of samples) {
  console.log(`  ${code}\n    - …${before}…\n    + …${after}…`);
}

// Проверка: узкий пробел не должен появиться там, где его быть не должно.
{
  let broken = 0;
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
    const fr = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')).fr;
    if (typeof fr !== 'string') continue;
    if (/https?\u202F:/.test(fr) || /\d\u202F:/.test(fr)) { broken++; if (broken <= 3) console.log(`  СЛОМАНО ${file}`); }
  }
  console.log(broken ? `\n  ${broken} файлов с пробелом внутри адреса или времени` : '\n  адреса и время не задеты');
}

if (!WRITE) {
  console.log(touched ? '\nСухой прогон — ничего не записано. Повтори с --write.' : '\nфранцузская типографика в порядке');
  process.exit(touched ? 1 : 0);
}
