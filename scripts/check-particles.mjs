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

// ── Единое обращение к читателю ──────────────────────────────────────────────────────────
//
// Сайт обращался к испанцу то на «usted» («llegue al menos 3 horas antes»), то на «tú»
// («Vuelve a comprobar») — в соседних ответах одного и того же FAQ. К немцу — на «Sie» в
// тринадцати строках и на «du» на странице 404. Читатель этого не формулирует, но разнобой
// читается как несколько разных авторов, писавших вразнобой, что для справочного сервиса
// хуже любого из двух вариантов по отдельности.
//
// Правило закрытое: в этих двух языках перечислены формы, которых быть не должно. Список
// глаголов — те, что реально встречаются в интерфейсе; «tu/tus» и «dein/deine» ловят
// притяжательные, на которых чаще всего и проскакивает неформальность.
{
  const INFORMAL = {
    es: /\b(Vuelve|Comprueba|Elige|Añade|Consulta|Pega|Copia|Busca|Selecciona|Revisa|confírmalos|pégalo|cópialo|tu |tus )\b/,
    de: /\b(kehre|Prüfe|Wähle|Suche nach|dein|deine|deiner|deinem)\b/,
  };
  let bad = 0;
  for (const [locale, re] of Object.entries(INFORMAL)) {
    const file = path.join('messages', `${locale}.json`);
    if (!fs.existsSync(file)) continue;
    for (const [key, value] of walk(JSON.parse(fs.readFileSync(file, 'utf8')), '', [])) {
      const m = value.match(re);
      if (m) { fail(`${locale} ${key}: неформальное обращение «${m[0]}» — весь интерфейс на ${locale === 'es' ? '«usted»' : '«Sie»'}`); bad++; }
    }
  }
  if (!bad) pass('обращение к читателю единое в испанском и немецком');
}

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
