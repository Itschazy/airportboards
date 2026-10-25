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
    if (b.url && b.source && !b.url.replace(/^https?:\/\/(www\.)?/, '').startsWith(b.source.replace(/^www\./, ''))) {
      fails.push(`${where}: источник «${b.source}» не совпадает с доменом ссылки ${b.url}`);
    }
  }
}

console.log(`справочная: ${files.length} аэропортов; самая старая проверка — ${oldest ? `${oldest.iata} ${oldest.d}` : '—'}`);
if (warns.length) console.log(`  ⚠ скоро перепроверять (старше ${WARN_DAYS} дн.): ${warns.join(', ')}`);
if (fails.length) {
  for (const x of fails) console.log(`  ✗ ${x}`);
  console.log(`\nПРОВАЛОВ: ${fails.length}`);
  process.exit(1);
}
console.log('  ✓ все файлы целы и проверены не раньше чем за ' + MAX_DAYS + ' дн.');
