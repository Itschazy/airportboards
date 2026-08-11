// Сплошная проверка всех двенадцати локалей по отданному сервером HTML.
//
// Это не про качество перевода — про то, что страница вообще собралась: статус, подстановки,
// микроразметка, поиск, согласование чисел. Такую проверку я до сих пор гонял разово и вручную
// по русскому; здесь она зафиксирована и охватывает все языки сразу.
//
// Все ловушки замера, на которых я обжигался, учтены прямо здесь:
//   - RSC-пейлоад несёт копии строк каталога, поэтому видимая часть = HTML БЕЗ <script>;
//   - React сериализует атрибут как hrefLang в camelCase — считаем обе формы;
//   - grep -c считает строки, а не вхождения: минифицированный HTML кладёт 13 тегов в одну;
//   - «This page could not be found» встречается внутри рантайм-чанка Next на ЛЮБОЙ странице,
//     поэтому 404 определяем по коду ответа, а не по тексту.
//
// Провайдерские эндпоинты не трогаются: /api/airports/search читает локальные данные.
//
// Usage:  npm run check:sweep -- https://airportsboard.live

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
/** Страницы, у которых кластер намеренно короче: документы существуют только на en и ru. */
const LEGAL = new Set(['/about', '/privacy', '/terms', '/contact']);
const LEGAL_LOCALES = 2;

const PATHS = ['', '/airport/KZN', '/airport/IST', '/airport/KZN/departures', '/airport/KZN/arrivals',
  '/route/KZN-SVO', '/city/kazan', '/airports', '/airports/germany', '/az/a',
  '/about', '/privacy', '/widgets'];

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const cities = read('data/city-names.json');
const airportsRaw = read('data/airports.json');
const airports = airportsRaw.airports ?? airportsRaw;
const svcRaw = read('data/airport-service.json');
const levels = svcRaw.airports ?? svcRaw;

let failures = 0;
const problems = [];
const fail = (locale, m) => { problems.push(`${locale}: ${m}`); failures++; };

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '');
const visibleText = (html) =>
  decodeEntities(strip(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const decodeEntities = (s) => s
  .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

async function fetchPage(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'audit-bot' }, redirect: 'manual' });
  return { status: r.status, html: r.status === 200 ? await r.text() : '' };
}

console.log(`проверка ${LOCALES.length} локалей × ${PATHS.length} страниц по ${BASE}\n`);
const summary = [];

for (const locale of LOCALES) {
  const messages = read(`messages/${locale}.json`);
  const keys = [];
  for (const [ns, group] of Object.entries(messages)) {
    if (group && typeof group === 'object') for (const k of Object.keys(group)) keys.push(`${ns}.${k}`);
  }

  let ok = 0;
  for (const path of PATHS) {
    const url = `${BASE}/${locale}${path}`;
    let page;
    try { page = await fetchPage(url); } catch { fail(locale, `${path || '/'}: сервер не ответил`); continue; }
    if (page.status !== 200) { fail(locale, `${path || '/'}: HTTP ${page.status}`); continue; }

    const vis = strip(page.html);

    // 1. Подстановка не выполнена — на странице напечатан сам плейсхолдер.
    const raw = [...new Set((vis.match(/\{[a-zA-Z]\w*\}/g) ?? []))];
    if (raw.length) fail(locale, `${path || '/'}: неподставленные плейсхолдеры ${raw.slice(0, 3).join(' ')}`);

    // 2. ICU не развёрнут — читатель видит синтаксис шаблона.
    if (/\{[^{}]*,\s*(plural|select)/.test(vis)) fail(locale, `${path || '/'}: неразвёрнутый ICU`);

    // 3. Ключ каталога вместо строки — так выглядит отсутствующий перевод.
    const leaked = keys.filter((k) => vis.includes(k));
    if (leaked.length) fail(locale, `${path || '/'}: ключ в тексте — ${leaked.slice(0, 2).join(', ')}`);

    // 4. <title> обязателен и не должен быть пустым.
    const title = page.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    if (!title.trim()) fail(locale, `${path || '/'}: пустой <title>`);

    // 5. Кластер hreflang. Считаем ВХОЖДЕНИЯ в <head>, обе формы написания атрибута.
    const head = page.html.split('</head>')[0];
    // Юридические страницы объявляют ТОЛЬКО языки, на которых написаны (en, ru) плюс
    // x-default — это осознанное решение в components/legal-page.tsx: остальные десять URL
    // отдают английский текст, и заявлять их локализованными альтернативами значит обещать
    // то, чего страница не делает. Первая версия этой проверки посчитала их дефектом
    // двадцать четыре раза подряд.
    const expected = LEGAL.has(path) ? LEGAL_LOCALES + 1 : LOCALES.length + 1;
    const hl = (head.match(/hrefLang="|hreflang="/g) ?? []).length;
    if (hl && hl !== expected) fail(locale, `${path || '/'}: hreflang ${hl}, ожидалось ${expected}`);

    // 6. Микроразметка обязана быть валидным JSON — обрезанный блок Google просто отбросит.
    for (const m of page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch { fail(locale, `${path || '/'}: невалидный JSON-LD`); }
    }

    // 7. Смешение систем счисления: у ar цифры восточноарабские, и западные рядом с ними
    //    выглядят как чужая вставка.
    // Только страницы БЕЗ живого табло: на странице аэропорта числа приходят от провайдера
    // (номер рейса, терминал, выход) и латинские на любом языке — это обозначения, а не
    // количества. Здесь остаются страницы, где каждое число форматируем мы сами.
    // Юридические страницы исключены: их текст на арабской версии английский по решению
    // владельца (документы существуют только на en и ru), и западные цифры в английском
    // абзаце — норма, а не смешение систем.
    if (locale === 'ar' && !/\/airport\//.test(path) && !LEGAL.has(path)) {
      // Проверяется только то, что site форматирует САМ. Время рейса приходит от провайдера
      // строкой «01:35» и остаётся западным; код рейса и номер выхода — обозначения, их не
      // переводят в другую систему счисления ни на одном языке. Из-за них страница смешивает
      // системы («01:35 و٤ رحلات»), но это свойство источника данных, а не дефект вёрстки, и
      // решение о единой системе для ar — за владельцем. Здесь ловится только НАШЕ число:
      // отдельно стоящее, не время, не код, не год.
      const text = visibleText(page.html)
        .replace(/\b\d{1,2}:\d{2}\b/g, ' ')          // время
        .replace(/\b[A-Z]{1,3}\s?\d{1,4}\b/g, ' ')   // код рейса
        // Номер выхода приходит от провайдера строкой («13», «B12»), и на всех языках он
        // печатается как есть — это обозначение места, а не количество.
        .replace(/(?:بوابة|Gate|выход)\s*[A-Z]?\d{1,4}/gi, ' ')
        .replace(/\b20\d\d\b/g, ' ');                // год
      const west = text.match(/(?<![\w\-/:])\d{2,4}(?![\w\-/:])/g) ?? [];
      if (/[٠-٩]/.test(text) && west.length) {
        fail(locale, `${path || '/'}: наше число западными цифрами рядом с восточноарабскими — ${west.slice(0, 3).join(' ')}`);
      }
    }
    ok++;
  }

  // 8. Поиск находит аэропорт по локализованному имени города, которое сайт сам и печатает.
  const served = airports.filter((a) => Number(levels[a.iata]) > 0);
  const sample = served.filter((_, i) => i % Math.max(1, Math.floor(served.length / 12)) === 0).slice(0, 12);
  let miss = 0;
  for (const a of sample) {
    const q = cities[a.city]?.[locale];
    if (!q) continue;
    try {
      const r = await fetch(`${BASE}/api/airports/search?q=${encodeURIComponent(q)}&locale=${locale}`,
        { headers: { 'user-agent': 'audit-bot' } });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.airports ?? []);
      if (!arr.some((x) => x.iata === a.iata)) miss++;
    } catch { miss++; }
  }
  if (miss) fail(locale, `поиск не находит ${miss} из ${sample.length} по локализованному имени`);

  // 9. Манифест приложения — свой на локаль.
  try {
    const r = await fetch(`${BASE}/${locale}/manifest.webmanifest`, { headers: { 'user-agent': 'audit-bot' } });
    const m = await r.json();
    if (m.start_url !== `/${locale}`) fail(locale, `манифест: start_url=${m.start_url}`);
    if (m.lang !== locale) fail(locale, `манифест: lang=${m.lang}`);
  } catch { fail(locale, 'манифест не разбирается'); }

  summary.push([locale, ok, PATHS.length]);
}

for (const [locale, ok, total] of summary) {
  const bad = problems.filter((p) => p.startsWith(`${locale}:`)).length;
  console.log(`  ${locale.padEnd(3)} страниц ${ok}/${total}  ${bad ? `✗ ${bad} проблем` : '✓'}`);
}

if (problems.length) {
  console.log('\nПРОБЛЕМЫ:');
  for (const p of problems) console.log(`  ✗ ${p}`);
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nвсе локали отдаются без дефектов сборки');
process.exit(failures ? 1 : 0);
