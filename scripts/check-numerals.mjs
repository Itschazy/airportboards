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
  let text;
  try {
    const res = await fetch(`${BASE}/${loc}`, { headers: { 'user-agent': 'audit-bot' } });
    if (!res.ok) { say(false, `${loc.padEnd(3)} HTTP ${res.status}`); continue; }
    text = strip(await res.text());
  } catch (e) {
    say(false, `${loc.padEnd(3)} не ответил: ${e.message}`);
    continue;
  }

  const want = expected[loc];
  const foreign = [];
  for (const [sys, re] of Object.entries(DIGITS)) {
    if (sys === want) continue;
    const hits = text.match(re);
    if (hits?.length) foreign.push(`${sys}×${hits.length}`);
  }
  const own = (text.match(DIGITS[want]) ?? []).length;

  say(!foreign.length,
    `${loc.padEnd(3)} ${String(own).padStart(4)} своих (${want})`
    + (foreign.length ? `, ЧУЖИЕ: ${foreign.join(', ')}` : ''));
}

console.log(fails
  ? `\nПРОВАЛОВ: ${fails}`
  : '\nсистема счисления одна на локаль и не зависит от сборки ICU на хосте');
process.exit(fails ? 1 : 0);
