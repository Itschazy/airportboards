// Заявлены ли в карте сайта все языки — и так, как этого требует Google.
//
// ЗАЧЕМ ЭТОТ СТОРОЖ СУЩЕСТВУЕТ. До 24.09.2026 карта заявляла 5 998 адресов, и все они были
// английскими: одиннадцать языков жили внутри них как xhtml:link-альтернативы. Для Google
// это разные статусы — <loc> сайт заявляет, альтернативу можно найти. Он и находил: обходил
// без приоритета и отвергал, в «просканирована, не проиндексирована» стояли ar, hi, es, de.
// Владелец поставил задачу ранжироваться на всех двенадцати языках; заявить их — первый шаг.
//
// Проверяется то, на чём Google отбрасывает hreflang целиком, а не частично:
//
//   · каждый путь заявлен на КАЖДОМ из своих языков (своя запись <url> на язык);
//   · у каждой записи среди альтернатив есть она сама;
//   · набор альтернатив у всех языковых версий одного пути ОДИНАКОВ — взаимность;
//   · x-default есть и ведёт на английскую версию;
//   · коды языков — только те, что сайт реально отдаёт;
//   · файлы в лимитах протокола: ≤ 50 000 <loc> и ≤ 50 МБ несжатого.
//
// И отдельно, только против прода: карта отдаётся СЖАТОЙ. 24.09.2026 /sitemap/0.xml уходил
// сырыми 2.6 МБ за 47–51 с при 0.02 с на самом сервере; Google перестал читать карту с 24.08.
// Сжатие включено в nginx-блоке сайта, то есть ВНЕ репозитория, — переустановка сервера или
// перевыпуск certbot его потеряет, и заметить это можно только отсюда.
//
// Usage:  node scripts/check-sitemap-hreflang.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';
const IS_PROD = /^https:\/\/airportsboard\.live/.test(BASE);
const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
/** Юридические страницы написаны только на двух языках — lib/legal-content.ts LEGAL_LOCALES. */
const LEGAL_PATHS = new Set(['/privacy', '/terms', '/about', '/contact']);
const LEGAL_LOCALES = ['en', 'ru'];
const MAX_LOCS = 50_000;
const MAX_BYTES = 50 * 1024 * 1024;
/**
 * Запас до лимита. После того как каждый язык стал отдельной записью, первый файл карты
 * вырос в двенадцать раз: 24.09.2026 — 22 520 записей и 30.1 МБ, 60% лимита, потому что
 * кроме аэропортов в нём вся статика — маршруты, города, страны, события. Корпус растёт
 * вместе с обслуживанием, и узнать о переполнении по отказу Google читать файл — поздно.
 * На 80% сторож говорит «пора разбивать мельче» (AIRPORTS_PER_SITEMAP в lib/airports.ts
 * или статику — в отдельный файл), пока это ещё не авария.
 */
const HEADROOM = 0.8;
/** Сжатый самый крупный файл должен приходить быстро; сырой шёл 47–51 с. */
const MAX_SECONDS = 10;

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };
const UA = { 'user-agent': 'audit-bot' };

console.log(`hreflang в карте сайта (${BASE})\n`);

const index = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text();
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
say(children.length > 0, `детей у индекса карты: ${children.length}`);

/** путь без языка → Map(язык → Set альтернатив как «код=адрес») */
const byPath = new Map();
const allLocs = [];
let biggest = { url: '', bytes: 0 };

for (const url of children) {
  const path = new URL(url).pathname;
  const xml = await (await fetch(`${BASE}${path}`, { headers: UA })).text();
  const bytes = Buffer.byteLength(xml);
  if (bytes > biggest.bytes) biggest = { url: path, bytes };
  const blocks = xml.split('<url>').slice(1);
  const share = Math.max(blocks.length / MAX_LOCS, bytes / MAX_BYTES);
  say(share <= HEADROOM,
    share > 1 ? `${path}: ${blocks.length.toLocaleString('ru-RU')} <loc>, ${(bytes / 1048576).toFixed(1)} МБ — ЗА ЛИМИТОМ ПРОТОКОЛА, Google файл не примет`
      : share > HEADROOM ? `${path}: ${Math.round(share * 100)}% лимита — пора разбивать карту мельче (AIRPORTS_PER_SITEMAP в lib/airports.ts)`
        : `${path}: ${blocks.length.toLocaleString('ru-RU')} <loc>, ${(bytes / 1048576).toFixed(1)} МБ — ${Math.round(share * 100)}% лимита`);
  for (const b of blocks) {
    const loc = (/<loc>([^<]+)<\/loc>/.exec(b) || [])[1];
    if (!loc) continue;
    allLocs.push(loc);
    const m = /^https?:\/\/[^/]+\/([a-z]{2})(\/.*)?$/.exec(loc);
    if (!m) continue;
    const [, lang, rest = ''] = m;
    const alts = new Set([...b.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g)].map((x) => `${x[1]}=${x[2]}`));
    if (!byPath.has(rest)) byPath.set(rest, new Map());
    byPath.get(rest).set(lang, { loc, alts });
  }
}

// ── Дубли ────────────────────────────────────────────────────────────────────────────────
const dup = allLocs.length - new Set(allLocs).size;
say(dup === 0, dup ? `повторяющихся <loc>: ${dup}` : `повторов нет, всего <loc>: ${allLocs.length.toLocaleString('ru-RU')}`);

// ── По каждому пути ──────────────────────────────────────────────────────────────────────
const missingLang = [], noSelf = [], asym = [], badXdef = [], badCode = [];
for (const [rest, langs] of byPath) {
  const expected = LEGAL_PATHS.has(rest) ? LEGAL_LOCALES : LOCALES;
  const absent = expected.filter((l) => !langs.has(l));
  if (absent.length) missingLang.push(`${rest || '/'} без ${absent.join(',')}`);
  let reference = null;
  for (const [lang, { loc, alts }] of langs) {
    if (!alts.has(`${lang}=${loc}`)) noSelf.push(loc);
    const key = [...alts].sort().join('|');
    if (reference === null) reference = key;
    else if (key !== reference) asym.push(rest || '/');
    const xdef = [...alts].find((a) => a.startsWith('x-default='));
    if (!xdef || !xdef.endsWith(`/en${rest}`)) badXdef.push(loc);
    for (const a of alts) {
      const code = a.split('=')[0];
      if (code !== 'x-default' && !LOCALES.includes(code)) badCode.push(`${loc}: ${code}`);
    }
  }
}
const uniq = (a) => [...new Set(a)];
const show = (a) => uniq(a).slice(0, 4).join('; ') + (uniq(a).length > 4 ? ` … всего ${uniq(a).length}` : '');

say(missingLang.length === 0, missingLang.length
  ? `НЕ НА ВСЕХ ЯЗЫКАХ: ${show(missingLang)}`
  : `каждый из ${byPath.size.toLocaleString('ru-RU')} путей заявлен на всех своих языках`);
say(noSelf.length === 0, noSelf.length ? `нет ссылки на себя среди альтернатив: ${show(noSelf)}` : 'каждая запись ссылается на себя');
say(asym.length === 0, asym.length ? `альтернативы НЕ взаимны: ${show(asym)}` : 'альтернативы взаимны у всех языковых версий');
say(badXdef.length === 0, badXdef.length ? `x-default отсутствует или не на en: ${show(badXdef)}` : 'x-default везде ведёт на английскую версию');
say(badCode.length === 0, badCode.length ? `неизвестные коды языков: ${show(badCode)}` : 'коды языков только из тех, что сайт отдаёт');

// ── Доставка: только против прода, где стоит nginx ───────────────────────────────────────
if (IS_PROD && biggest.url) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}${biggest.url}`, { headers: { ...UA, 'accept-encoding': 'gzip' } });
  const enc = r.headers.get('content-encoding');
  // Размер тела здесь НЕ показывается намеренно: fetch в Node распаковывает gzip прозрачно,
  // и byteLength — это размер ПОСЛЕ распаковки. Первая редакция подписывала его «по сети» и
  // врала в двадцать пять раз. Судит заголовок content-encoding и время доставки.
  await r.arrayBuffer();
  const sec = (Date.now() - t0) / 1000;
  say(enc === 'gzip',
    enc === 'gzip' ? `${biggest.url} отдаётся сжатым (content-encoding: gzip)`
      : `${biggest.url} отдаётся БЕЗ СЖАТИЯ — пропал gzip в nginx-блоке сайта (/etc/nginx/sites-available/airportsboard), Google снова перестанет читать карту`);
  say(sec <= MAX_SECONDS, `${biggest.url} доставлен за ${sec.toFixed(1)} с (порог ${MAX_SECONDS} с)`);
} else {
  console.log('  · сжатие и скорость доставки не проверяются: база не прод, nginx здесь нет');
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nкарта заявляет все языки так, как требует Google');
process.exit(fails ? 1 : 0);
