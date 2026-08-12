// Система счисления: одинакова ли она на любом хосте и не смешаны ли на странице две сразу.
//
// Проверка появилась после 12.08.2026, когда выяснилось, что один и тот же код печатает
// арабские страницы по-разному в зависимости от того, как собран Node:
//
//   строка каталога   «تم التحديث قبل {h, number} ساعة»
//   на маке (ICU 75.1) «تم التحديث قبل ٥ ساعة»   — восточные цифры
//   на боевом сервере  «تم التحديث قبل 5 ساعة»   — западные
//
// На проде не нашлось НИ ОДНОЙ восточной цифры ни на одной арабской странице, тогда как
// ru/de/fr/tr форматировались правильно всюду — то есть ICU там полный, и расходился ровно
// выбор системы счисления для «ar»: Intl.NumberFormat('ar') даёт arab, а 'ar-AE' — latn.
//
// Дефект тут не в том, какие цифры считать правильными, а в том, что арабскую вёрстку было
// НЕВОЗМОЖНО проверить локально: она отличалась от боевой. Поэтому проверяются две вещи.
//
//   1. Система счисления ЗАКРЕПЛЕНА, а не отдана на усмотрение хоста. Проверяется через
//      resolvedOptions() — если кто-то уберёт расширение -u-nu-…, ответ снова станет
//      зависеть от машины, и здесь это будет видно сразу, без выкатки.
//   2. На отданной странице нет ЧУЖИХ цифр. Табло по своей природе полно чисел, которые в
//      другую систему не переводятся вовсе — время рейса «06:10», номер «EY63», выход «B11»
//      приходят строками от поставщика. Если рядом с ними счётчик напечатает «٨٠», в одном
//      экране окажутся две системы счисления.
//
// Провайдерские эндпоинты не трогаются: страницы читаются обычным GET с не-браузерным UA.
//
// Usage:  node scripts/check-numerals.mjs [base]

import fs from 'node:fs';
import ts from 'typescript';

const { locales, numLocale, NUMERAL_SYSTEM } = await import(
  'data:text/javascript;base64,' + Buffer.from(
    ts.transpileModule(fs.readFileSync('lib/i18n.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    }).outputText,
  ).toString('base64')
);

const BASE = process.argv[2] || 'http://localhost:3002';

/**
 * Страницы, на которых ищем сломанное форматирование. Одной главной мало: дефект с NaN жил
 * на /{locale}/airports и в её мета-описании — то есть в том, что люди видят в выдаче
 * поисковика, — и не показывался больше нигде.
 */
const PAGES = ['', '/airports', '/az/a'];

/**
 * Диапазоны цифр по системам счисления.
 *
 * hanidec (〇一二三四五六七八九) сюда НЕ входит намеренно, хотя формально это система
 * счисления. Её знаки — обычные иероглифы, и по кодовой точке цифру от слова не отличить:
 * первая же версия проверки провалила японскую страницу на «一» внутри «A〜Zの空港一覧»
 * («перечень аэропортов»), где 一覧 — слово «перечень», а не единица. Отличить их можно
 * только по смыслу, поэтому такой проверки здесь не будет вовсе — ложная тревога на каждой
 * японской странице хуже, чем ненайденная hanidec, которую никто и не собирается включать.
 */
const DIGITS = {
  latn: /[0-9]/gu,
  arab: /[٠-٩]/gu,
  arabext: /[۰-۹]/gu,
  deva: /[०-९]/gu,
  beng: /[০-৯]/gu,
};

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

// ── 1. Закреплена ли система счисления ────────────────────────────────────────────────────

console.log('система счисления закреплена явно\n');

const expected = {};
for (const loc of locales) {
  const fl = numLocale(loc);
  const got = new Intl.NumberFormat(fl).resolvedOptions().numberingSystem;
  const pinned = NUMERAL_SYSTEM[loc];
  expected[loc] = got;

  if (pinned) {
    say(got === pinned && fl.includes('-u-nu-'),
      `${loc.padEnd(3)} закреплена: ${fl} → ${got}${got === pinned ? '' : ` (ожидалось ${pinned})`}`);
  } else {
    // Не закреплённые локали обязаны разрешаться в latn — иначе их тоже надо закреплять,
    // потому что «по умолчанию» у разных сборок ICU разное.
    say(got === 'latn', `${loc.padEnd(3)} по умолчанию: ${got}${got === 'latn' ? '' : ' — НЕ latn, надо закрепить явно'}`);
  }
}

// ── 2. Нет ли чужих цифр на отданных страницах ────────────────────────────────────────────

console.log(`\nчужие цифры в разметке (${BASE})\n`);

const strip = (h) => {
  let b = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const i = b.indexOf('<body');
  if (i >= 0) b = b.slice(i);
  return b.replace(/<[^>]+>/g, ' ');
};

for (const loc of locales) {
  const fl = numLocale(loc);
  /**
   * Как ЭТА локаль печатает «не число». Берётся у самого ICU, а не списком в коде: в en это
   * «NaN», в ru «не число», в ar «ليس رقمًا» — угадать все двенадцать вариантов нельзя, а
   * промахнуться легко.
   */
  const nanWord = new Intl.NumberFormat(fl).format(NaN);

  for (const page of PAGES) {
    const url = `${BASE}/${loc}${page}`;
    let html;
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'audit-bot' } });
      if (!res.ok) { say(false, `${loc.padEnd(3)}${(page || '/').padEnd(10)} HTTP ${res.status}`); continue; }
      html = await res.text();
    } catch (e) {
      say(false, `${loc.padEnd(3)}${(page || '/').padEnd(10)} не ответил: ${e.message}`);
      continue;
    }

    const text = strip(html);
    // Мета-описание проверяется ОТДЕЛЬНО и по сырой разметке: оно попадает в выдачу
    // поисковика, а из <body> вырезается вместе с остальным <head>.
    const meta = (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '';

    const want = expected[loc];
    const foreign = [];
    for (const [sys, re] of Object.entries(DIGITS)) {
      if (sys === want) continue;
      const hits = text.match(re);
      if (hits?.length) foreign.push(`${sys}×${hits.length}`);
    }
    const own = (text.match(DIGITS[want]) ?? []).length;

    say(!foreign.length,
      `${loc.padEnd(3)}${(page || '/').padEnd(10)} ${String(own).padStart(4)} своих (${want})`
      + (foreign.length ? `, ЧУЖИЕ: ${foreign.join(', ')}` : ''));

    /**
     * Сломанное форматирование: в шаблон с {x, number} передали уже отформатированную
     * СТРОКУ, ICU сделал Number("2 801") и получил NaN. Проверка счисления это пропускала
     * по построению — в слове «NaN» цифр нет.
     *
     * Хуже самого NaN тихий случай: de и tr читают «2,801» как две целых восемьсот одну
     * тысячную, то есть печатали правдоподобное НЕВЕРНОЕ число вместо явной ошибки.
     */
    const broken = [];
    if (text.includes(nanWord)) broken.push(`в теле («${nanWord}»)`);
    if (meta.includes(nanWord)) broken.push(`в мета-описании («${nanWord}»)`);
    if (broken.length) say(false, `${loc.padEnd(3)}${(page || '/').padEnd(10)} СЛОМАНО ФОРМАТИРОВАНИЕ: ${broken.join(', ')} — в {x, number} передали строку`);

    /**
     * Тихий случай той же поломки, который NaN не даёт и потому опаснее.
     *
     * fmt(2801,'de') = «2.801». Обратно Number("2.801") — это ВАЛИДНОЕ число две целых
     * восемьсот одна тысячная, поэтому ICU не ругается, а печатает по-немецки «2,801».
     * Читатель видит правдоподобную цифру вместо двух тысяч восьмисот одного аэропорта.
     * По самим цифрам («2801») отличить нельзя — отличается РАЗДЕЛИТЕЛЬ РАЗРЯДОВ.
     *
     * Поэтому проверяется он: у локали свой разделитель, и число в тексте обязано стоять
     * именно с ним. Ожидаемое значение берётся у ICU, а не списком в коде.
     */
    const parts = new Intl.NumberFormat(fl).formatToParts(2801);
    const group = parts.find((p) => p.type === 'group')?.value;
    if (group && page === '/airports') {
      const others = [' ', ' ', ',', '.', ' ', '’'].filter((g) => g !== group);
      const digit = DIGITS[want].source.replace(/\//g, '');
      // Ищем «цифра РАЗДЕЛИТЕЛЬ три цифры» с ЧУЖИМ разделителем.
      const wrong = others.filter((g) => {
        const re = new RegExp(`${digit}${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${digit}{3}(?!${digit})`, 'u');
        return re.test(meta) || re.test(text);
      });
      if (wrong.length) {
        say(false, `${loc.padEnd(3)}${(page || '/').padEnd(10)} ЧУЖОЙ РАЗДЕЛИТЕЛЬ РАЗРЯДОВ: ожидался «${group === ' ' ? 'NBSP' : group === ' ' ? 'узкий NBSP' : group}», найден «${wrong.map((g) => (g === ' ' ? 'NBSP' : g === ' ' ? 'узкий NBSP' : g)).join('», «')}» — число могло быть разобрано как дробное`);
      }
    }
  }
}

console.log(fails
  ? `\nПРОВАЛОВ: ${fails}`
  : '\nсистема счисления одна на локаль и не зависит от сборки ICU на хосте');
process.exit(fails ? 1 : 0);
