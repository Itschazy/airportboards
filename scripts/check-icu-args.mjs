// Получает ли каждый вызов перевода те переменные, которых требует сама строка.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. Пропущенный ICU-аргумент — не ошибка сборки и не ошибка типов:
// next-intl узнаёт о нём только в момент рендера конкретной локали. Проект наступил на это
// дважды, и оба раза дефект жил неделями:
//
//   · ns_nearest без {name}/{iata} — next-intl сдавался и печатал в тело страницы буквальный
//     путь ключа «home.ns_nearest» на ~3 400 страницах во всех двенадцати локалях;
//   · ns_nearest без {deName} — французская редакция требует готовую форму с элизией
//     («d’Amsterdam», «du Havre»); её добавили в messages/fr.json и не тронули вызов. Здесь
//     next-intl уже бросал FORMATTING_ERROR: страница аэропорта без регулярных рейсов падала
//     на рендере целиком, молча и ровно на одной локали из двенадцати. Нашлось 18.09.2026 в
//     логе pm2, при разборе совсем другого вопроса.
//
// 🔑 ПЕРЕМЕННЫЕ БЕРУТСЯ ОБЪЕДИНЕНИЕМ ПО ВСЕМ ЛОКАЛЯМ, а не из английской. В этом вся суть:
// {deName} есть ТОЛЬКО во французских строках, и проверка, читающая одну локаль, не увидела бы
// второго дефекта вовсе.
//
// 🔑 РАЗБОР — НАСТОЯЩИМ ПАРСЕРОМ ICU, тем же @formatjs, что стоит под next-intl. Первая
// редакция искала «{имя}» регуляркой и обвинила три исправных вызова: в ветке плурала
// «{count, plural, one {it} other {them}}» слово «it» выглядит как переменная. Проверка,
// которая заводит собственный предикат вместо кодового, спорит с кодом, а не сторожит его.
//
// Ни сети, ни сервера, ни квоты поставщика.
//
// Usage:  node scripts/check-icu-args.mjs

import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@formatjs/icu-messageformat-parser';

const MSG_DIR = 'messages';
const SRC_DIRS = ['app', 'components'];

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

// ── 1. Чего требуют строки ───────────────────────────────────────────────────────────────
/** Имена аргументов из разобранного сообщения: сами подстановки, селекторы plural/select и
 *  теги-обёртки <link>…</link> — последние тоже обязательный аргумент-функция. */
function varsOf(msg) {
  const out = new Set();
  let ast;
  try { ast = parse(msg); } catch { return out; }          // битую строку судит другая проверка
  (function walk(nodes) {
    for (const n of nodes) {
      if (n.type !== 0 /* literal */ && typeof n.value === 'string') out.add(n.value);
      if (n.options) for (const o of Object.values(n.options)) walk(o.value ?? []);
      if (n.children) walk(n.children);
    }
  })(ast);
  return out;
}

/**
 * короткий ключ → (переменная → Set локалей, где ОНА обязательна).
 *
 * Локали хранятся по каждой переменной отдельно, а не по ключу: {deName} требует одна
 * французская редакция из двенадцати, и отчёт «обязательна в локалях: ar, de, en, …» —
 * первое, что уводит следующий разбор в сторону. Сообщение обязано называть ту локаль,
 * из-за которой оно звучит.
 */
const need = new Map();

function collect(obj, locale) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') { collect(v, locale); continue; }
    if (typeof v !== 'string') continue;
    const vars = varsOf(v);
    if (!vars.size) continue;
    if (!need.has(k)) need.set(k, new Map());
    const perVar = need.get(k);
    for (const x of vars) {
      if (!perVar.has(x)) perVar.set(x, new Set());
      perVar.get(x).add(locale);
    }
  }
}

const locales = fs.readdirSync(MSG_DIR).filter(f => f.endsWith('.json'));
for (const f of locales) collect(JSON.parse(fs.readFileSync(path.join(MSG_DIR, f), 'utf8')), f.replace('.json', ''));
say(locales.length >= 12, `прочитано локалей: ${locales.length}`);
say(need.size > 0, `ключей с переменными: ${need.size}`);

// ── 2. Что передают вызовы ───────────────────────────────────────────────────────────────
function walkDir(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = SRC_DIRS.flatMap(d => (fs.existsSync(d) ? walkDir(d) : []));
const allSrc = files.map(f => fs.readFileSync(f, 'utf8'));

/** Сбалансированный кусок от открывающей скобки: внутри лежат вложенные объекты, шаблонные
 *  строки и JSX, которые регуляркой не берутся. */
function objectAt(src, i) {
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(i, j + 1); }
  }
  return src.slice(i, i + 400);
}
const keysOf = (body) => new Set([...body.matchAll(/([A-Za-z_$][\w$]*)\s*[:,}]/g)].map(x => x[1]));

/** `const N = { name, deName, … }` — бандл аргументов, который вызовы разворачивают спредом. */
function bundles(src) {
  const map = new Map();
  for (const m of src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g)) {
    map.set(m[1], keysOf(objectAt(src, m.index + m[0].length - 1)));
  }
  return map;
}

/** `t('subline', worldCounts())` — аргументы приходят из функции. Ищем её `return { … }` по
 *  всему дереву; не нашли — вызов считается НЕ ПРОВЕРЕННЫМ, а не исправным. */
function returnedKeys(fnName) {
  const re = new RegExp(`(?:function\\s+${fnName}\\s*\\([^)]*\\)|const\\s+${fnName}\\s*=\\s*\\([^)]*\\)\\s*=>)`);
  for (const src of allSrc) {
    const m = re.exec(src);
    if (!m) continue;
    const tail = src.slice(m.index, m.index + 1500);
    const ret = /return\s*\{|=>\s*\(\s*\{/.exec(tail);
    if (!ret) continue;
    return keysOf(objectAt(tail, tail.indexOf('{', ret.index + ret[0].length - 1)));
  }
  return null;
}

const CALL_RE = /\bt[A-Za-z0-9_]*(?:\.rich|\.markup)?\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*(,|\))/g;
const problems = [];
const unchecked = [];
let checked = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i], src = allSrc[i];
  const bun = bundles(src);
  for (const m of src.matchAll(CALL_RE)) {
    const short = m[1].split('.').pop();
    const required = need.get(short);
    if (!required) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const given = new Set();
    let resolvable = true;

    if (m[2] === ',') {
      const after = src.slice(m.index + m[0].length, m.index + m[0].length + 200);
      const fnCall = /^\s*([A-Za-z_$][\w$]*)\s*\(/.exec(after);
      const braceRel = after.indexOf('{');
      if (fnCall && (braceRel === -1 || after.indexOf('(') < braceRel)) {
        const fromFn = returnedKeys(fnCall[1]);
        if (fromFn) for (const k of fromFn) given.add(k);
        else resolvable = false;
      } else {
        const brace = src.indexOf('{', m.index + m[0].length - 1);
        const body = objectAt(src, brace);
        for (const k of keysOf(body)) given.add(k);
        for (const s of body.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) for (const v of bun.get(s[1]) ?? []) given.add(v);
      }
    }

    if (!resolvable) { unchecked.push(`${file}:${line} ${short}`); continue; }
    checked++;
    const missing = [...required.keys()].filter(v => !given.has(v));
    if (missing.length) problems.push({ file, line, key: short, missing: missing.map(v => ({ name: v, locales: [...required.get(v)] })) });
  }
}

say(checked > 0, `проверено вызовов: ${checked}${unchecked.length ? `, не разобрано: ${unchecked.length}` : ''}`);
for (const u of unchecked) console.log(`      не разобрано (аргументы из функции): ${u}`);

// ── 3. Приговор ──────────────────────────────────────────────────────────────────────────
say(problems.length === 0, problems.length
  ? `вызовов без обязательных переменных: ${problems.length}`
  : 'каждый вызов передаёт всё, что требует строка');
for (const p of problems) {
  console.log(`      ${p.file}:${p.line}  ${p.key} — НЕ ПЕРЕДАНО: ${p.missing.map(m => m.name).join(', ')}`);
  for (const m of p.missing) console.log(`        {${m.name}} требуют локали: ${m.locales.join(', ')}`);
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nаргументы переводов на месте');
process.exit(fails ? 1 : 0);
