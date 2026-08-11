// Убирает из китайских названий вторую транслитерацию того же имени — и только её.
//
// В заголовке страницы это выглядит так: <title>馬公（馬公（马公））（MZG）航班动态…</title> —
// имя города напечатано трижды, вложенными скобками, перед скобкой с кодом IATA. Всего
// 426 заголовков несут скобку или слэш внутри названия города.
//
// Слепая чистка «удалить всё в скобках» здесь ЛОМАЕТ больше, чем чинит, потому что тем же
// синтаксисом записаны три разные вещи:
//
//   1. вторая транслитерация того же имени — 阿拉沙（阿拉克萨） для Araxá. Это глосса, и её
//      надо убрать: читателю не нужны два варианта записи одного города в заголовке;
//   2. УТОЧНЕНИЕ, без которого имя неоднозначно — 阿尔卡塔（加州） «Аркейта (Калифорния)»,
//      安哥拉（俄亥俄州） «Ангола (Огайо)», отличающая городок в США от страны. Это ценнее
//      исходного имени, и трогать нельзя;
//   3. латинский оригинал — 圣克鲁斯-基切（Santa Cruz del Quiché）. Глосса того же класса,
//      что вычищали из корпуса раньше: латиница внутри китайского заголовка.
//
// Признак, который их различает, — ПОХОЖЕСТЬ на основную часть. Вторая транслитерация делит
// с первой большинство иероглифов (阿拉沙 / 阿拉克萨 — общее 阿拉), уточнение не делит ничего
// (阿尔卡塔 / 加州). Порог проверяется на всём корпусе и печатается обеими сторонами, чтобы
// решение было видно, а не спрятано в коде.
//
// Слэш разбирается иначе: он бывает и глоссой (阿尔胡塞马/阿尔侯西马 — одно место, два
// написания), и настоящим двойным именем (奥尔顿 / 圣路易斯 — аэропорт обслуживает Alton И
// St Louis). Различает их АНГЛИЙСКИЙ ИСТОЧНИК: если слэш есть в нём — имя двойное, оставляем.
//
// Usage:
//   node scripts/fix-zh-name-glosses.mjs           — разбор и сухой прогон
//   node scripts/fix-zh-name-glosses.mjs --write   — применить

import fs from 'node:fs';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const FILES = ['city-names.json', 'airport-names.json'];

/** Доля иероглифов скобочной части, встречающихся в основной. */
function overlap(main, paren) {
  const set = new Set([...main]);
  const chars = [...paren].filter((c) => /[\p{Script=Han}]/u.test(c));
  if (!chars.length) return 0;
  return chars.filter((c) => set.has(c)).length / chars.length;
}

/**
 * Что в скобках стоять ИМЕЕТ ПРАВО. 347 из 433 вставок — китайские названия стран
 * (澳大利亚, 阿根廷, 加拿大, 日本), остальные — административные единицы (…州, …省, …市, …岛).
 * Они берутся из data/country-names.json, а не из списка в коде, поэтому не устареют.
 *
 * Список нужен не для красоты: без него 巴拿马城（巴拿马） «Панама-Сити (Панама)» выглядит как
 * повтор имени — совпадение иероглифов стопроцентное — и уточнение страны было бы стёрто.
 */
const KEEP = new Set();
{
  const countries = JSON.parse(fs.readFileSync(path.join('data', 'country-names.json'), 'utf8'));
  for (const locs of Object.values(countries)) {
    const zh = locs && typeof locs === 'object' ? locs.zh : null;
    if (typeof zh === 'string' && zh) KEEP.add(zh);
  }
}
const ADMIN = /(州|省|市|县|区|岛|群岛|地区|自治区|共和国|国)$/;

/**
 * Порог низкий намеренно. Две транслитерации одного имени делят иероглифов МАЛО —
 * 俾斯麦 против 比斯马克 (Бисмарк) общий только 斯, это четверть, — тогда как уточнение
 * не делит вообще ничего: 阿尔卡塔 против 加州 (Калифорния) — ноль. Порог в половину,
 * с которого я начал, оставлял 俾斯麦（比斯马克） и 巴詹（巴加恩） нетронутыми.
 */
const SIMILAR = 0.25;
const HAN = /[\p{Script=Han}]/u;

const removed = [];
const kept = [];
let changedFiles = 0;

for (const file of FILES) {
  const p = path.join('data', file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;

  for (const [key, locs] of Object.entries(data)) {
    if (!locs || typeof locs !== 'object') continue;
    const value = locs.zh;
    if (typeof value !== 'string' || !value) continue;

    let next = value;

    // Скобки: и полноширинные, и ASCII. Разбираем от внутренних к внешним, поэтому цикл.
    for (let guard = 0; guard < 4; guard++) {
      const m = next.match(/^(.*?)\s*[（(]\s*([^（()）]*)\s*[）)]\s*(.*)$/);
      if (!m) break;
      const [, head, inner, tail] = m;
      const main = (head + tail).trim();
      if (!main) break;

      // Скобка ВНУТРИ имени — не глосса. «默尔·K（穆德霍尔）史密斯» это Merle K. «Mudhole»
      // Smith: прозвище между именем и фамилией. Снятие скобок склеило «默尔·K史密斯» и
      // вставило латинскую K внутрь иероглифов — ровно тот дефект, который чинил
      // scripts/check-scripts.mjs. Глосса всегда стоит с краю.
      if (head.trim() && tail.trim()) { kept.push([file, key, next, inner]); break; }

      const isQualifier = KEEP.has(inner.trim()) || ADMIN.test(inner.trim());
      const isLatinGloss = !HAN.test(inner) && /[A-Za-z]/.test(inner);
      const isSameName = !isQualifier && overlap(main, inner) >= SIMILAR;

      if (isLatinGloss || isSameName) {
        removed.push([file, key, next, main, isLatinGloss ? 'латинская глосса' : 'та же транслитерация']);
        next = main;
      } else {
        kept.push([file, key, next, inner]);
        break;
      }
    }

    // Слэш: глосса, если английский источник слэша не содержит.
    if (/\s*\/\s*/.test(next) && !/\//.test(key)) {
      const parts = next.split(/\s*\/\s*/).filter(Boolean);
      if (parts.length > 1) {
        removed.push([file, key, next, parts[0], 'вариант через слэш']);
        next = parts[0];
      }
    }

    if (next !== value) { locs.zh = next; changed = true; }
  }

  if (changed) { changedFiles++; if (WRITE) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n'); }
}

const byReason = {};
for (const [, , , , why] of removed) byReason[why] = (byReason[why] ?? 0) + 1;

console.log(`${WRITE ? 'убрано' : 'будет убрано'}: ${removed.length} глосс из ${changedFiles} файлов`);
for (const [why, n] of Object.entries(byReason)) console.log(`  ${String(n).padStart(4)}  ${why}`);

console.log('\nубирается (первые 10):');
for (const [, key, before, after, why] of removed.slice(0, 10)) {
  console.log(`  ${key.slice(0, 24).padEnd(24)} «${before}» → «${after}»  [${why}]`);
}

console.log(`\nСОХРАНЯЕТСЯ как уточнение — ${kept.length} (первые 10):`);
for (const [, key, value, inner] of kept.slice(0, 10)) {
  console.log(`  ${key.slice(0, 24).padEnd(24)} «${value}»  — «${inner}» не повтор имени`);
}

if (!WRITE) {
  console.log('\nСухой прогон — ничего не записано. Повтори с --write.');
  process.exit(removed.length ? 1 : 0);
}
