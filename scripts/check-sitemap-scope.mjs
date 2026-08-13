// Что именно карта сайта предлагает поисковику — и не предлагает ли она пустоту.
//
// Замер Google Search Console 13.08: из 6 630 известных Google адресов проиндексировано
// 1 070, а 5 324 помечены «просканирована, не проиндексирована» — он их скачал, посмотрел и
// отказал. Бюджета хватало с запасом (37 700 запросов, 448 МБ за 90 дней), так что это
// вердикт по содержимому, а не очередь на обход. Средняя позиция у взятых 41.3, кликов за
// квартал двенадцать.
//
// Отвергал он ровно то, что сайт сам и рекламировал: 3 143 страницы аэропортов с измеренным
// НУЛЁМ вылетов — 43% заявленного корпуса. Разбор схожести: такие страницы похожи друг на
// друга на 0.975 при 0.42–0.44 у остальных классов сайта. Та же формулировка стоит в отказе
// AdSense от 03.08 — «бесполезный контент».
//
// Проверка следит за ДВУМЯ границами сразу, и вторая не менее важна первой:
//
//   1. пустое НЕ рекламируется — иначе возвращается тот самый вердикт;
//   2. живое рекламируется ВСЁ, вплоть до аэропортов с одним рейсом в сутки. Резать по
//      «мало рейсов» соблазнительно и неверно: LWN даёт 2 вылета в сутки и 238 визитов в
//      месяц, PES — один вылет, SUI — пять при 280 визитах. Это хвост, который кормит, а не
//      балласт. Убирать его — менять живой канал на мёртвый.
//
// Снятие с карты НЕ деиндексирует: страницы остаются связанными и объявляют index, follow.
// Карта отвечает за обнаружение, не за удержание, — потому Яндекс, где эти страницы уже в
// индексе, ничего не теряет.
//
// Usage:  node scripts/check-sitemap-scope.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';

const svcRaw = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8'));
const LEVEL = svcRaw.airports ?? svcRaw;

/** Верхняя граница заявленного корпуса. Не догма, а сигнал «мы снова раздулись». */
const MAX_DECLARED = 60_000;
const LOCALES = 12;

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`область карты сайта (${BASE})\n`);

// ── Собираем всё, что карта заявляет ──────────────────────────────────────────────────────

const index = await (await fetch(`${BASE}/sitemap.xml`, { headers: { 'user-agent': 'audit-bot' } })).text();
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
say(children.length > 0, `детей у индекса карты: ${children.length}`);

const locs = [];
for (const url of children) {
  const path = new URL(url).pathname;
  const xml = await (await fetch(`${BASE}${path}`, { headers: { 'user-agent': 'audit-bot' } })).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(m[1]);
}

const inMap = new Set(
  locs.map((l) => /\/en\/airport\/([A-Z0-9]{3})$/.exec(l)?.[1]).filter(Boolean)
);

console.log(`  записей <loc>: ${locs.length}, из них страниц аэропортов: ${inMap.size}`);
console.log(`  заявлено URL с учётом ${LOCALES} языков: ${(locs.length * LOCALES).toLocaleString('ru-RU')}\n`);

say(locs.length * LOCALES <= MAX_DECLARED,
  `корпус в пределах ${MAX_DECLARED.toLocaleString('ru-RU')} URL`);

// ── 1. Пустое не рекламируется ────────────────────────────────────────────────────────────

/**
 * Неподтверждённые нули из проверки ИСКЛЮЧЕНЫ — так же, как их исключает сам код.
 *
 * serviceLevel() возвращает для них null, то есть «замер дал ноль, но мы ему не верим»,
 * и hasNoService их намеренно не трогает. Первая версия этой проверки об этом не знала и
 * обвиняла код в рекламе 1 177 страниц, которые он держит осознанно. Проверка обязана
 * повторять предикат, а не изобретать свой, иначе она спорит с кодом, а не стережёт его.
 */
let unverified = new Set();
try {
  const u = JSON.parse(fs.readFileSync('data/airport-service-unverified.json', 'utf8'));
  // Коды лежат в поле `codes`, а не ключами верхнего уровня — там метаданные замера.
  const codes = Array.isArray(u) ? u : (u.codes ?? Object.keys(u));
  unverified = new Set(Array.isArray(codes) ? codes : Object.keys(codes));
} catch { /* файла нет — значит и исключений нет */ }

const zeros = Object.entries(LEVEL)
  .filter(([c, n]) => n === 0 && !unverified.has(c))
  .map(([c]) => c);
/**
 * Вики-маршруты дают странице содержание даже при нуле измеренных вылетов: она отвечает на
 * вопрос «кто летает и куда» и перестаёт быть страницей об отсутствующем. hasNoService их
 * намеренно не трогает, поэтому и проверка не должна.
 *
 * Источник и предикат взяты ТЕ ЖЕ, что в lib/wiki-routes.ts hasWikiAirlines: файл
 * airport-wiki-routes.json и непустой список airlines. Сначала я смотрел в airport-routes.json
 * с другой формой записи, и проверка обвиняла код в рекламе 276 страниц, которые он держит
 * осознанно. Расхождение проверки с предикатом — это спор с кодом, а не охрана его.
 */
let wiki = {};
try {
  const raw = JSON.parse(fs.readFileSync('data/airport-wiki-routes.json', 'utf8'));
  wiki = raw.airports ?? raw;
} catch { /* файла нет — значит и исключений нет */ }
const hasWiki = (c) => {
  const e = wiki[c];
  return !!e && Array.isArray(e.airlines) && e.airlines.length > 0;
};

const advertisedEmpty = zeros.filter((c) => !hasWiki(c) && inMap.has(c));
say(advertisedEmpty.length === 0,
  advertisedEmpty.length
    ? `карта рекламирует ${advertisedEmpty.length} страниц с нулём вылетов: ${advertisedEmpty.slice(0, 6).join(', ')}…`
    : `страниц с нулём вылетов в карте нет (проверено ${zeros.length} кандидатов)`);

// ── 2. Живое рекламируется всё ────────────────────────────────────────────────────────────

const served = Object.entries(LEVEL).filter(([, n]) => (n ?? 0) > 0).map(([c]) => c);
const missing = served.filter((c) => !inMap.has(c));
// Закрытые аэропорты выпадают законно — их отсеивает isUnfillable/сам корпус.
say(missing.length <= served.length * 0.05,
  missing.length
    ? `не заявлено ${missing.length} из ${served.length} аэропортов с рейсами (${(100 * missing.length / served.length).toFixed(1)}%)`
    : `все ${served.length} аэропортов с рейсами заявлены`);

// Отдельно и строго: самые маленькие из тех, что реально кормят трафиком.
const TINY_BUT_ALIVE = [['LWN', 'Гюмри, 238 визитов/мес'], ['SUI', 'Сухум, 280'], ['PES', 'Петрозаводск'], ['HOR', 'Орта']];
for (const [c, why] of TINY_BUT_ALIVE) {
  if ((LEVEL[c] ?? 0) <= 0) continue;
  say(inMap.has(c), `${c} (${LEVEL[c]} вылетов/сут) в карте — ${why}`);
}

console.log(fails
  ? `\nПРОВАЛОВ: ${fails}`
  : '\nкарта предлагает всё живое и ничего пустого');
process.exit(fails ? 1 : 0);
