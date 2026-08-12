// Куда на самом деле дотягиваются правила заголовков из next.config.ts.
//
// Проверка появилась после того, как я собственноручно накрыл этими правилами весь сайт.
// В конфиге стояло `source: '/:locale/:path*'`, и выглядело это как «страницы локалей» —
// а `:locale` матчит ЛЮБОЙ первый сегмент, то есть правило означало просто `/*`.
//
// Что под него попало (замер по собранному .next/routes-manifest.json):
//
//   /api/flights/SVO      /api/cron/warm      /api/airlabs-usage
//   /_next/static/*.js    /embed/SVO          /robots.txt   /sitemap.xml   /icon1
//
// и своим `public, max-age=300` перекрыло заголовки, объявленные в самих маршрутах:
//
//   1. /api/flights/* стал кэшироваться браузером на 5 минут, а клиентский опрос ходит
//      туда каждые 60 с с одним и тем же URL и без cache-опции — то есть табло тихо
//      переставало быть живым. Маршрут объявляет s-maxage БЕЗ max-age именно затем,
//      чтобы этого не случилось;
//   2. /_next/static/* потерял дефолтный `max-age=31536000, immutable` (Next ставит его
//      под гвардией `if (!res.getHeader('cache-control'))`, и правило конфига успевает
//      раньше) — вместо годового кэша посетитель получал условный запрос каждые 5 минут;
//   3. /api/airlabs-usage объявляет no-store в коде — это диагностика расхода ПЛАТНОЙ
//      квоты — и отдавался публично кэшируемым.
//
// Дефект был невидим при обычной проверке: я мерил ровно те адреса, ради которых правило
// писал, и там всё было правильно. Поэтому проверка идёт от ОБРАТНОГО — берёт адреса,
// которых правило касаться НЕ ДОЛЖНО, и требует, чтобы оно их не касалось.
//
// Читается собранный манифест, а не исходник конфига: правила проверяются в том виде, в
// каком их применяет сервер, со всеми преобразованиями path-to-regexp.
//
// Usage:  node scripts/check-header-scope.mjs [путь к .next]

import fs from 'node:fs';
import path from 'node:path';

const DIST = process.argv[2] || '.next';
const MANIFEST = path.join(DIST, 'routes-manifest.json');

if (!fs.existsSync(MANIFEST)) {
  console.log(`манифеста нет: ${MANIFEST} — сначала npm run build`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const rules = (manifest.headers ?? []).map((h) => ({
  source: h.source,
  re: new RegExp(h.regex),
  keys: h.headers.map((x) => x.key),
}));

/**
 * Адреса, до которых правилам локалей дотягиваться НЕЛЬЗЯ, и почему.
 *
 * Общесайтовое правило `/:path*` (заголовки безопасности — HSTS, nosniff, Referrer-Policy)
 * покрывает их законно и здесь не считается нарушением: оно не трогает Cache-Control.
 */
const FORBIDDEN = [
  ['/api/flights/SVO', 'клиентский опрос обязан ходить в сеть, иначе табло не живое'],
  ['/api/cron/warm', 'прогрев тратит платную квоту, кэшировать его ответы бессмысленно'],
  ['/api/airlabs-usage', 'диагностика расхода квоты, в коде объявлен no-store'],
  ['/api/airports/counts', 'маршрут объявляет свой s-maxage'],
  ['/api/airports/search', 'маршрут решает сам'],
  ['/api/revalidate', 'принимает токен, публично кэшировать ответ нельзя'],
  ['/_next/static/chunks/main-abc123.js', 'имя захэшировано контентом — нужен годовой immutable'],
  ['/_next/static/css/abc123.css', 'то же'],
  ['/embed/SVO', 'у виджета свои правила показа и кэша'],
  ['/robots.txt', 'служебный файл, не страница локали'],
  ['/sitemap.xml', 'то же'],
  ['/llms.txt', 'то же'],
  ['/icon1', 'иконка отдаётся с immutable по хэшированному пути'],
  ['/opengraph-image', 'то же'],
];

/** А до этих — обязаны, иначе правило не работает вовсе. */
const REQUIRED = [
  ['/ru', 'локальная главная'],
  ['/en', 'локальная главная'],
  ['/ar/airports', 'каталог'],
  ['/ru/az/a', 'буквенный указатель'],
  ['/ru/city/moscow', 'город'],
  ['/hi/airport/DEL', 'борт'],
];

/** Правила, которые ставят Cache-Control, — только они здесь и интересны. */
const cacheRules = rules.filter((r) => r.keys.some((k) => k.toLowerCase() === 'cache-control'));

let fails = 0;
console.log(`область действия правил заголовков (${MANIFEST})\n`);
console.log(`правил с Cache-Control: ${cacheRules.length}`);
for (const r of cacheRules) console.log(`    ${r.source}`);

console.log('\nне должны попадать под правила локалей:\n');
for (const [url, why] of FORBIDDEN) {
  const hit = cacheRules.filter((r) => r.re.test(url));
  // Собственные правила маршрута (например /favicon.ico) — законны; нарушение это когда
  // адрес ловит правило, написанное для ЛОКАЛЕЙ.
  const leaked = hit.filter((r) => /:locale/.test(r.source));
  if (leaked.length) fails++;
  console.log(`  ${leaked.length ? '✗' : '✓'} ${url.padEnd(42)} ${leaked.length ? `ПОЙМАН правилом ${leaked.map((r) => r.source).join(', ')}` : why}`);
}

console.log('\nдолжны попадать:\n');
for (const [url, why] of REQUIRED) {
  const hit = cacheRules.filter((r) => /:locale/.test(r.source) && r.re.test(url));
  if (!hit.length) fails++;
  console.log(`  ${hit.length ? '✓' : '✗'} ${url.padEnd(42) } ${hit.length ? why : 'НЕ ПОКРЫТ — правило локалей его не ловит'}`);
}

console.log(fails
  ? `\nПРОВАЛОВ: ${fails} — правила заголовков дотягиваются не туда`
  : '\nправила заголовков накрывают ровно страницы локалей и ничего больше');
process.exit(fails ? 1 : 0);
