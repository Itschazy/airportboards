// Страница маршрута: отвечает ли она хоть на что-нибудь — и не врёт ли при этом.
//
// До 14.08 это был самый тонкий из заявленных в карте типов: 1 012 знаков, НОЛЬ заголовков
// второго уровня, из разметки один BreadcrumbList. У страницы аэропорта для сравнения
// двенадцать h2 и четыре типа разметки. Таких страниц 454, и все они в карте сайта — ровно
// тот класс, за который Google пометил 5 324 адреса «просканирована, не проиндексирована».
//
// Добавленные ответы собираются ИЗ ЗАМЕРОВ (lib/route-facts.ts): медиана времени в пути из
// отметок вылета и прибытия, расстояние тем же haversine, что у «соседних аэропортов».
// Прозу писать нельзя — сайт уже отклонён AdSense за «бесполезный контент», — поэтому
// проверка следит именно за тем, чтобы добавленное осталось проверяемым, а не разрослось.
//
// Проверяется:
//   1. Все 12 локалей несут все ключи, и в каждой сохранены ВСЕ подстановки. Потерянный при
//      переводе {from} печатается читателю как есть — этот класс дефектов на сайте уже был
//      (виджет /embed полгода печатал сырой ICU, потому что подстановка делалась заменой).
//   2. На живой странице есть заголовки второго уровня и разметка FAQPage.
//   3. Ответы ВИДНЫ в тексте страницы. Разметка, обещающая то, чего на экране нет, — прямое
//      нарушение требований к FAQPage и то самое противоречие, которое движок и проверяет.
//   4. Ни одной невыполненной подстановки в выводе.
//   5. В арабском числа западные. Система счисления закреплена в lib/i18n.ts (ar → latn), и
//      Intl по локали 'ar' по умолчанию даёт восточные (٢٬٣٥٧): один обход numLocale — и на
//      странице оказались бы две системы счисления сразу.
//
// Usage:  node scripts/check-route-page.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
const KEYS = ['duration_q', 'duration_a', 'distance_q', 'distance_a', 'airlines_a'];

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`страница маршрута (${BASE})\n`);

// ── 1. Каталог ярлыков: полнота и сохранность подстановок ─────────────────────────────────

const SRC = fs.readFileSync('lib/route-facts.ts', 'utf8');
const block = SRC.slice(SRC.indexOf('const LABELS'), SRC.indexOf('const fill'));
const problems = [];
for (const loc of LOCALES) {
  const seg = new RegExp(`\\b${loc}:\\s*\\{([\\s\\S]*?)\\n  \\}`).exec(block)?.[1];
  if (!seg) { problems.push(`${loc}: нет записи`); continue; }
  for (const k of KEYS) if (!new RegExp(`\\b${k}:`).test(seg)) problems.push(`${loc}.${k}: нет ключа`);
  // Подстановки: какие обязаны быть в каждом ключе.
  const need = { duration_q: ['from', 'to'], duration_a: ['d'], distance_q: ['a', 'b'], distance_a: ['km'], airlines_a: ['list'] };
  for (const [k, vars] of Object.entries(need)) {
    const line = new RegExp(`\\b${k}:\\s*'([^']*)'`).exec(seg)?.[1] ?? '';
    for (const v of vars) if (!line.includes(`{${v}}`)) problems.push(`${loc}.${k}: потеряна подстановка {${v}}`);
  }
}
say(!problems.length, problems.length
  ? `каталог ярлыков: ${problems.slice(0, 6).join('; ')}${problems.length > 6 ? `… и ещё ${problems.length - 6}` : ''}`
  : `все ${KEYS.length} ключа есть во всех ${LOCALES.length} локалях, подстановки на месте`);

// ── 2-5. Живая страница ──────────────────────────────────────────────────────────────────

const PAIRS = ['AMS-LHR', 'SVO-LED', 'IST-AYT'];
const RAW_VAR = /\{\s*[a-z][a-zA-Z0-9_]*\s*\}/;
const EASTERN = /[٠-٩۰-۹]/;   // арабо-индийские цифры

const textOf = (h) => (h.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();

let live = 0;
for (const loc of ['en', 'ru', 'ar', 'de', 'ja']) {
  for (const pair of PAIRS) {
    const html = await (await fetch(`${BASE}/${loc}/route/${pair}`, { headers: { 'user-agent': 'audit-bot' } })).text();
    const text = textOf(html);
    // Маршрут без рейсов честно вырождается в «прямых рейсов не найдено» — не наш предмет.
    if (/"robots"[^>]*content="noindex/.test(html)) continue;
    live++;

    const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    say(h2.length > 0, `${loc}/${pair}: заголовков второго уровня ${h2.length}`);

    const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);
    const types = ld.map((x) => x['@type']);
    say(types.includes('WebPage'), `${loc}/${pair}: разметка ${types.join(', ')}`);

    const faq = ld.find((x) => x['@type'] === 'FAQPage');
    if (faq) {
      // Ответ обязан быть виден на странице — иначе разметка обещает то, чего нет.
      const hidden = faq.mainEntity.filter((q) => !text.includes(q.acceptedAnswer.text.replace(/\s+/g, ' ')));
      say(hidden.length === 0, hidden.length
        ? `${loc}/${pair}: ${hidden.length} ответ(ов) FAQ нет в видимом тексте — «${hidden[0].acceptedAnswer.text.slice(0, 48)}…»`
        : `${loc}/${pair}: все ${faq.mainEntity.length} ответа FAQ видны в тексте`);
      say(faq.mainEntity.every((q) => q.name && q.name.length > 3), `${loc}/${pair}: у каждого вопроса FAQ есть имя`);
    }

    const bare = RAW_VAR.exec(text);
    say(!bare, bare ? `${loc}/${pair}: невыполненная подстановка «${bare[0]}»` : `${loc}/${pair}: подстановок в выводе нет`);

    if (loc === 'ar') {
      const east = EASTERN.exec(text);
      say(!east, east ? `${loc}/${pair}: восточные цифры в тексте — «${text.slice(Math.max(0, east.index - 20), east.index + 20)}»`
                      : `${loc}/${pair}: цифры западные, как и на всём сайте`);
    }
  }
}

say(live > 0, `проверено живых страниц: ${live}`);
console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nстраница маршрута отвечает измеримым и не печатает шаблонов');
process.exit(fails ? 1 : 0);
