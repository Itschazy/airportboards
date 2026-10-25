// Общая check:scripts проверяет словари и airport-content, но не airport-guide.
// Поэтому отдельно проверяем алфавит всех переводов справочной, а состав блоков
// и длину подписей — у 24 новых аэропортов. Алфавит не доказывает качество языка:
// смысл и естественность проверяются вручную и независимой выборкой ChatGPT.
import fs from 'node:fs';
import path from 'node:path';

const root = 'data/airport-guide';
const airports = 'AMS BCN BKK CAN CDG DEL DEN DFW FRA HKG HND ICN JFK KUL LAS LAX LHR MAD MCO MIA ORD PEK PVG SIN'.split(' ');
const locales = 'en de fr es it tr zh ja ko ar hi'.split(' ');
const allowed = {
  zh: /[\p{Script=Latin}\p{Script=Han}]/u,
  ja: /[\p{Script=Latin}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]/u,
  ko: /[\p{Script=Latin}\p{Script=Han}\p{Script=Hangul}]/u,
  ar: /[\p{Script=Latin}\p{Script=Arabic}ـ]/u,
  hi: /[\p{Script=Latin}\p{Script=Devanagari}]/u,
};
const native = {zh: /\p{Script=Han}/u, ja: /[\p{Script=Hiragana}\p{Script=Katakana}]/u, ko: /\p{Script=Hangul}/u, ar: /\p{Script=Arabic}/u, hi: /\p{Script=Devanagari}/u};
const problems = [];
let files = 0;
for (const locale of locales) {
  for (const filename of fs.readdirSync(path.join(root, locale)).filter(f => f.endsWith('.json'))) {
    const file = path.join(root, locale, filename);
    const translation = JSON.parse(fs.readFileSync(file, 'utf8'));
    const original = JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
    const originalText = JSON.stringify(original);
    // Кириллические буквы внутри кода маршрута разрешены только в точном коде
    // оригинала: это подпись на указателе, а не непропереведённое русское слово.
    const codes = [...new Set(originalText.match(/[A-Za-zА-Яа-яЁё0-9–-]+/g) ?? [])]
      .filter(s => /\d/u.test(s) && /\p{Script=Cyrillic}/u.test(s));
    // В REN исходная подпись маршрута — «101 (к)»; слитная 101к сохраняет
    // именно эту букву, а не примесь русского слова в корейском предложении.
    for (const match of originalText.matchAll(/(\d+)\s*\(([А-Яа-я])\)/gu)) codes.push(match[1] + match[2]);
    if (translation.about) {
      let about = translation.about;
      for (const code of codes) about = about.replaceAll(code, '');
      const foreign = [...new Set([...about].filter(c => /\p{L}/u.test(c) && !(allowed[locale] ?? /\p{Script=Latin}/u).test(c)))];
      if (foreign.length) problems.push(`${file} about: чужой алфавит ${foreign.join('')}`);
      if (native[locale] && !native[locale].test(about)) problems.push(`${file} about: нет родного алфавита`);
    }
    for (const [id, block] of Object.entries(translation.blocks)) {
      for (const field of ['title', 'hint', 'text']) {
        let text = block[field];
        if (typeof text !== 'string' || !text.trim()) { problems.push(`${file} ${id}.${field}: пусто`); continue; }
        for (const code of codes) text = text.replaceAll(code, '');
        const foreign = [...new Set([...text].filter(c => /\p{L}/u.test(c) && !(allowed[locale] ?? /\p{Script=Latin}/u).test(c)))];
        if (foreign.length) problems.push(`${file} ${id}.${field}: чужой алфавит ${foreign.join('')}`);
        if (field === 'text' && native[locale] && !native[locale].test(text)) problems.push(`${file} ${id}: нет родного алфавита`);
      }
    }
    if (airports.includes(translation.iata)) {
      const ids = original.blocks.map(b => b.id).sort();
      if (JSON.stringify(ids) !== JSON.stringify(Object.keys(translation.blocks).sort())) problems.push(`${file}: состав блоков`);
      if (Boolean(original.about) !== Boolean(translation.about)) problems.push(`${file}: наличие about`);
      for (const [id, b] of Object.entries(translation.blocks)) {
        const max = ['zh', 'ja', 'ko'].includes(locale) ? 18 : 35;
        if ([...b.hint].length > max) problems.push(`${file} ${id}: hint ${[...b.hint].length}>${max}`);
      }
      if (locale === 'ar') {
        for (const b of Object.values(translation.blocks)) {
          const phones = b.text.match(/\+?\(?\d[\d() -]{6,}\d/g) ?? [];
          for (const phone of phones) if (!b.text.includes(`\u2066${phone}\u2069`)) problems.push(`${file}: телефон без LTR-изоляции ${phone}`);
        }
      }
    }
    files++;
  }
}
console.log(`Проверено ${files} файлов перевода; состав блоков, about и hint — 24 × 11.`);
for (const problem of problems) console.error(problem);
if (problems.length) process.exitCode = 1;
else console.log('Алфавиты, структура, подписи и LTR-телефоны: OK. Это не замена смысловой рецензии.');
