// Не устарела ли СПРАВОЧНАЯ по аэропортам (data/airport-guide/<IATA>.json) и цела ли она.
//
// Справочная — единственный текст на сайте, который не вычисляется, а переписывается с
// официальных страниц аэропортов: цены парковки, часы камеры хранения, номера автобусов. Под
// каждым блоком читатель видит источник и дату проверки, и в FAQPage уходит та же дата. Цены
// и часы стареют, а страница при этом продолжает уверенно их печатать — тихо, без единой
// ошибки. Эта проверка — тот же сторож, что check:servicefresh для замера обслуживания,
// только для фактов, собранных руками (идея «метки свежести полей» из rampstack-seo
// programmatic-seo, 25.10.2026).
//
// Утверждения:
//   1. у каждого файла дата проверки не старше MAX_DAYS (по умолчанию 180 — полгода, после
//      которых тарифы парковок и расписания автобусов почти наверняка пересматривались);
//      старше WARN_DAYS — предупреждение, не провал;
//   2. файл структурно цел: iata совпадает с именем, блоки с известными id, у каждого есть
//      заголовок, подсказка, текст, источник и https-ссылка, id не повторяются, about без
//      about_url не бывает. Битый файл компонент молча не покажет — а значит, никто не
//      заметит, что справочной у аэропорта больше нет.
//
// Ничего не скачивает: проверка, живы ли ссылки-источники, — отдельная и сетевая.
// Usage:  node scripts/check-guide-fresh.mjs [MAX_DAYS]

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/airport-guide';
const MAX_DAYS = Number(process.argv[2]) || 180;
const WARN_DAYS = Math.round(MAX_DAYS * 2 / 3);
// Те же темы, что в lib/airport-guide.ts QUESTIONS; новый id сначала туда, потом сюда.
const KNOWN = new Set(['transport', 'taxi', 'terminals', 'lounges', 'storage', 'sleep', 'kids', 'parking', 'wifi']);
const today = Date.now();

const files = fs.readdirSync(DIR).filter(f => /^[A-Z]{3}\.json$/.test(f)).sort();
const fails = [], warns = [];
let oldest = null;
for (const f of files) {
  const iata = f.slice(0, 3);
  let g;
  try { g = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { fails.push(`${f}: не JSON (${e.message})`); continue; }
  if (g.iata !== iata) fails.push(`${f}: iata «${g.iata}» не совпадает с именем файла`);
  // checked — дата без времени; читаем как UTC-полночь, а не местную (ловушка из CLAUDE.md).
  const t = /^\d{4}-\d{2}-\d{2}$/.test(g.checked || '') ? Date.parse(`${g.checked}T00:00Z`) : NaN;
  if (Number.isNaN(t)) { fails.push(`${f}: нет даты проверки checked (YYYY-MM-DD)`); continue; }
  const age = Math.floor((today - t) / 86400000);
  if (age < 0) fails.push(`${f}: дата проверки ${g.checked} в будущем`);
  else if (age > MAX_DAYS) fails.push(`${f}: проверено ${g.checked}, ${age} дн. назад (порог ${MAX_DAYS})`);
  else if (age > WARN_DAYS) warns.push(`${iata} ${age} дн.`);
  if (!oldest || t < oldest.t) oldest = { iata, t, d: g.checked };
  if (g.about && !/^https?:\/\/\S+$/.test(g.about_url || '')) fails.push(`${f}: about без ссылки about_url`);
  if (!Array.isArray(g.blocks) || !g.blocks.length) { fails.push(`${f}: нет блоков`); continue; }
  const seen = new Set();
  for (const b of g.blocks) {
    const where = `${f} [${b.id ?? '?'}]`;
    if (!KNOWN.has(b.id)) fails.push(`${where}: неизвестный id`);
    if (seen.has(b.id)) fails.push(`${where}: id повторяется`);
    seen.add(b.id);
    for (const k of ['title', 'hint', 'text', 'source']) if (!String(b[k] ?? '').trim()) fails.push(`${where}: пусто поле ${k}`);
    for (const k of ['url', 'url2']) if (b[k] !== undefined && !/^https?:\/\/[^\s]+$/.test(b[k])) fails.push(`${where}: ${k} не ссылка`);
    if (!b.url) fails.push(`${where}: нет ссылки на источник`);
    const host = (u) => (u || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    if (b.url && b.source && !b.url.replace(/^https?:\/\/(www\.)?/, '').startsWith(b.source.replace(/^www\./, ''))) {
      fails.push(`${where}: источник «${b.source}» не совпадает с доменом ссылки ${b.url}`);
    }
    // Справочная по сторонним сайтам держится на ДВУХ независимых источниках у каждого блока.
    if (g.basis === 'third-party') {
      if (!b.url2 || !b.source2) fails.push(`${where}: у справочной по сторонним сайтам нужен второй источник (url2 и source2)`);
      else if (host(b.url) === host(b.url2)) fails.push(`${where}: оба источника с одного домена ${host(b.url)} — это не два независимых сайта`);
      else if (!b.url2.replace(/^https?:\/\/(www\.)?/, '').startsWith(b.source2.replace(/^www\./, ''))) fails.push(`${where}: источник «${b.source2}» не совпадает с доменом ${b.url2}`);
    } else if (g.basis !== undefined) fails.push(`${f}: неизвестное basis «${g.basis}»`);
  }
}

// ── Переводы (data/airport-guide/<locale>/<IATA>.json, с 25.10.2026) ─────────────────────────
// Перевод — это те же факты на другом языке, поэтому проверяется самое хрупкое: не пропал ли
// блок, не просочился ли русский, и не поменялось ли ЧИСЛО — цена, время, номер автобуса. Числа
// сравниваются множествами по блоку: «400 ₽» в оригинале обязано быть 400 и в переводе.
const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
// Числа сравниваются по ЗНАЧЕНИЮ, а не по написанию: «700 тыс.» в оригинале и «70만» в корейском —
// одно и то же число, и требовать буквальных цифр значит заставлять переводчика писать
// неестественно («700천»). Множители слов: тыс./млн по-русски и их аналоги в 11 языках.
// Даты: «1 июня» в CJK становится «6월 1일» — номер месяца законно появляется в переводе, поэтому
// месяцы оригинала добавляются к его множеству чисел.
const MULT = [
  [/^\s*(тыс\.?|тысяч[аи]?|thousand|tausend|mille|mil\b|bin\b|हज़ार|ألف|آلاف|천|千)/i, 1e3],
  [/^\s*(млн\.?|миллион(а|ов)?|million(s)?|mio\.?|millones|millón|milioni|milione|milyon|मिलियन|مليون|ملايين|백만)/i, 1e6],
  [/^\s*(万|만)/, 1e4], [/^\s*(亿|億|억)/, 1e8], [/^\s*(लाख)/, 1e5], [/^\s*(करोड़)/, 1e7],
];
const RU_MONTHS = ['январ', 'феврал', 'март', 'апрел', 'ма[йя]', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'];
const norm = (x) => String(+x.toFixed(4));
// Числа, записанные в оригинале СЛОВОМ, перевод вправе написать цифрой: «на втором этаже» →
// «floor 2», «круглосуточно» → «24/7», «до суток» → «up to 24 hours». Требовать буквальности
// значит заставлять переводчика писать «floor two» (так и случилось 25.10).
const RU_NUMWORDS = [
  [/(^|[^а-яё])(перв|один|одн[аоу])/i, 1], [/(^|[^а-яё])(втор|два|две|двух|обо(их|е))/i, 2], [/(^|[^а-яё])(трет|три|трёх|трех)/i, 3],
  [/(^|[^а-яё])(четв[её]рт|четыр)/i, 4], [/(^|[^а-яё])(пят[ьиоы])/i, 5], [/(^|[^а-яё])(шест)/i, 6], [/(^|[^а-яё])(седьм|семь|семи)/i, 7],
  [/(^|[^а-яё])(восьм|восем)/i, 8], [/(^|[^а-яё])(девят)/i, 9], [/(^|[^а-яё])(десят)/i, 10],
  [/круглосуточн|сутк|суток|сутки/i, 24], [/(^|[^а-яё])час(а|ов)?([^а-яё]|$)/i, 1], [/полчаса|получас/i, 30], [/недел/i, 7],
];
function months(s) {
  const out = new Set();
  for (const [re, n] of RU_NUMWORDS) if (re.test(String(s ?? ''))) out.add(String(n));
  RU_MONTHS.forEach((re, i) => { if (new RegExp(`\\d\\s+${re}`, 'i').test(String(s ?? ''))) out.add(String(i + 1)); });
  return out;
}
function nums(s) {
  const txt = String(s ?? '').replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1');
  const out = new Set();
  for (const m of txt.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = m[0];
    // Оба разделителя («10,223.60», «10.223,60») — последний дробный, остальные — тысячи.
    // Один вид: «1,000» / «1.000» с группами по три — тысячи; «13,7» / «13.7» — дробь.
    let v0;
    // Дата «01.10.2026» — три числа, а не одно.
    if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(raw)) { raw.split('.').forEach((x) => out.add(norm(Number(x)))); continue; }
    if (/[.]/.test(raw) && /[,]/.test(raw)) {
      const dec = Math.max(raw.lastIndexOf('.'), raw.lastIndexOf(','));
      v0 = Number(raw.slice(0, dec).replace(/[.,]/g, '') + '.' + raw.slice(dec + 1));
    } else v0 = /^\d{1,3}([.,]\d{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'));
    const after = txt.slice(m.index + raw.length, m.index + raw.length + 14);
    const mul = MULT.find(([re]) => re.test(after))?.[1] ?? 1;
    out.add(norm(v0 * mul));
  }
  return out;
}
const trCount = {};
for (const loc of LOCALES) {
  const dir = path.join(DIR, loc);
  if (!fs.existsSync(dir)) continue;
  trCount[loc] = 0;
  for (const f of files) {
    const tf = path.join(dir, f);
    if (!fs.existsSync(tf)) continue;
    trCount[loc]++;
    let tr, g;
    try { tr = JSON.parse(fs.readFileSync(tf, 'utf8')); g = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
    catch (e) { fails.push(`${loc}/${f}: не JSON (${e.message})`); continue; }
    if (tr.iata !== f.slice(0, 3)) fails.push(`${loc}/${f}: iata не совпадает`);
    if (g.about && !tr.about) warns.push(`${loc}/${f.slice(0, 3)} без about`);
    for (const b of g.blocks ?? []) {
      const t = tr.blocks?.[b.id];
      const where = `${loc}/${f} [${b.id}]`;
      if (!t?.title || !t?.hint || !t?.text) { fails.push(`${where}: блок не переведён`); continue; }
      const all = `${t.title} ${t.hint} ${t.text}`;
      // Кириллица допустима только в кодах маршрутов и зон так, как они написаны на табличке
      // («111Э», «110С», «Т1») — буква прилегает к цифре. Всё остальное — непереведённый текст.
      if (/[\u0400-\u04FF]/.test(all.replace(/\d+-?[\u0400-\u04FF]{1,2}(?![Ѐ-ӿA-Za-z])|(?<![Ѐ-ӿA-Za-z])[\u0400-\u04FF]{1,2}-?\d+/gu, ''))) fails.push(`${where}: кириллица в переводе`);
      const a = nums(`${b.hint} ${b.text}`), c = nums(`${t.hint} ${t.text}`), mo = months(`${b.hint} ${b.text}`);
      const miss = [...a].filter((n) => !c.has(n)), extra = [...c].filter((n) => !a.has(n) && !mo.has(n));
      if (miss.length || extra.length) fails.push(`${where}: числа расходятся с оригиналом (нет ${miss.join(',') || '—'}; лишние ${extra.join(',') || '—'})`);
    }
    for (const id of Object.keys(tr.blocks ?? {})) if (!(g.blocks ?? []).some((b) => b.id === id)) fails.push(`${loc}/${f}: блок ${id}, которого нет в оригинале`);
  }
  // Язык либо переведён целиком, либо его нет: справочная, которая есть у половины аэропортов
  // на немецком, — это забытый перевод новых файлов, а не решение.
  if (trCount[loc] < files.length) fails.push(`${loc}: переведено ${trCount[loc]} из ${files.length} — новые справочные надо перевести`);
}

console.log(`справочная: ${files.length} аэропортов; самая старая проверка — ${oldest ? `${oldest.iata} ${oldest.d}` : '—'}`);
if (Object.keys(trCount).length) console.log(`  переводы: ${Object.entries(trCount).map(([l, n]) => `${l} ${n}/${files.length}`).join(', ')}`);
if (warns.length) console.log(`  ⚠ скоро перепроверять (старше ${WARN_DAYS} дн.): ${warns.join(', ')}`);
if (fails.length) {
  for (const x of fails) console.log(`  ✗ ${x}`);
  console.log(`\nПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('  ✓ все файлы целы и проверены не раньше чем за ' + MAX_DAYS + ' дн.');
