// Ловит незакрытый грамматический выбор рядом с подстановкой — «{name}은(는)».
//
// Корейская частица зависит от того, кончается ли предыдущий слог на согласную (батчим).
// Переводчик, не знающий, что подставится, пишет обе формы через скобки — «은(는)», «을(를)»,
// «이(가)», «와(과)» — и это уходит в прод как есть. Пять таких строк печатались буквально:
// «인천공항은(는) 어디에 있나요?» — одиннадцать вхождений на каждой корейской странице
// аэропорта, включая микроразметку FAQPage, то есть и в выдаче Google.
//
// Написать функцию выбора частицы недостаточно: {name} — это чаще всего корейское имя на
// «공항», но для аэропортов без корейского названия подставляется латиница
// («Stockholm-Arlanda Airport»), а {flight} кончается цифрой, и частица тогда зависит от того,
// как цифра ЧИТАЕТСЯ (1 → 일, батчим есть; 2 → 이, батчима нет). Поэтому строки перестроены
// на родительный «의», который не меняется никогда, и на двоеточие.
//
// Проверяется два запрета:
//   1. скобочная альтернация где угодно в каталоге — не только корейская;
//   2. голая частица сразу после плейсхолдера в ko — это возврат к угадыванию.
//
// Usage:  npm run check:particles

import fs from 'node:fs';
import path from 'node:path';

/** Пары, которые кореец пишет через скобки, когда не знает, что подставится. */
const KO_ALTERNATION = /(은\(는\)|는\(은\)|을\(를\)|를\(을\)|이\(가\)|가\(이\)|와\(과\)|과\(와\)|\(으\)로)/;
/** Частица вплотную к подстановке — угадывание, которое сломается на латинице и цифрах. */
const KO_BARE_AFTER_VAR = /\}(은|는|을|를|이|가|와|과)(?![\p{L}])/u;

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

const walk = (obj, prefix, out) => {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (typeof v === 'string') out.push([prefix ? `${prefix}.${k}` : k, v]);
    else if (v && typeof v === 'object') walk(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
};

const files = fs.readdirSync('messages').filter((f) => f.endsWith('.json'));
let alternation = 0, bare = 0, scanned = 0;

for (const file of files) {
  const locale = file.replace('.json', '');
  const entries = walk(JSON.parse(fs.readFileSync(path.join('messages', file), 'utf8')), '', []);
  scanned += entries.length;

  for (const [key, value] of entries) {
    if (KO_ALTERNATION.test(value)) {
      fail(`${locale} ${key}: незакрытый выбор частицы — «${value}»`);
      alternation++;
    }
    if (locale === 'ko' && KO_BARE_AFTER_VAR.test(value)) {
      fail(`${locale} ${key}: частица вплотную к подстановке — «${value}». `
        + 'Она сломается на латинском имени и на коде рейса; перестрой на «의» или двоеточие.');
      bare++;
    }
  }
}

if (!alternation) pass(`скобочного выбора частицы нет ни в одном из ${files.length} каталогов`);
if (!bare) pass('в корейском нет частиц, приклеенных к подстановке');

// Данные тоже рендерятся — проверять только каталоги было бы половиной работы.
{
  const dir = 'data/airport-content';
  let hits = 0, files2 = 0;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      files2++;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      if (KO_ALTERNATION.test(raw)) { hits++; if (hits <= 3) fail(`${dir}/${f}: скобочный выбор частицы в данных`); }
    }
  }
  hits ? fail(`всего файлов данных с дефектом: ${hits} из ${files2}`)
       : pass(`в ${files2} файлах локализованных описаний скобочного выбора нет`);
}

console.log(`\nпроверено строк каталога: ${scanned}`);
console.log(failures ? `${failures} проблем(ы)` : 'грамматический выбор нигде не оставлен читателю');
process.exit(failures ? 1 : 0);
