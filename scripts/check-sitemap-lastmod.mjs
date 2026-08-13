// lastmod в карте сайта: он либо правда, либо его нет. Третьего быть не должно.
//
// Поле уже жило здесь однажды и было ложью: в него шло `new Date()`, то есть время СБОРКИ на
// каждом адресе, и любой выкат заявлял, что изменился весь сайт разом. Такой сигнал поисковик
// перестаёт читать целиком, и поле убрали.
//
// Вернули 14.08 — но только там, где есть настоящая отметка: время, когда провайдер записал
// борт в хранилище (getBoardStampWithRows). Причина возврата в том, что переобход у Яндекса
// планируется по lastmod, а Яндекс — единственный живой канал сайта: 99.7% показов оттуда.
//
// Проверка стережёт ЧЕТЫРЕ границы, и каждая соответствует конкретному способу снова начать
// врать:
//
//   1. lastmod не совпадает со временем сборки/ответа — иначе это прежний дефект под новым
//      именем. Меряется разбросом: у настоящих отметок он есть, у времени сборки его нет.
//   2. lastmod не в будущем — часы сервера уходили вперёд достаточно, чтобы это стоило
//      проверки, а дата из будущего обесценивает поле на всех остальных адресах.
//   3. lastmod стоит ТОЛЬКО у страниц аэропортов и их прилётов. У стран, городов, указателя
//      A–Z и правовых документов честной отметки нет, и придумывать её нельзя.
//   4. Формат — W3C Datetime, иначе поисковик молча отбрасывает всю запись.
//
// Usage:  node scripts/check-sitemap-lastmod.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`lastmod в карте сайта (${BASE})\n`);

const get = async (u) => (await fetch(u, { headers: { 'user-agent': 'audit-bot' } })).text();

const index = await get(`${BASE}/sitemap.xml`);
const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

/** Записи карты как пары «путь → lastmod|null». Разбор поблочно: <lastmod> принадлежит <url>. */
const rows = [];
for (const child of children) {
  const xml = await get(`${BASE}${new URL(child).pathname}`);
  for (const block of xml.split('<url>').slice(1)) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    rows.push({ path: new URL(loc).pathname, lastmod: /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1] ?? null });
  }
}
const withMod = rows.filter((r) => r.lastmod);
console.log(`  записей: ${rows.length}, из них с lastmod: ${withMod.length}\n`);
say(rows.length > 0, `карта прочитана (${children.length} детей)`);

// ── 3. Только там, где отметка существует ────────────────────────────────────────────────
const isBoard = (p) => /^\/en\/airport\/[A-Z0-9]{3}(\/arrivals)?$/.test(p);
const strays = withMod.filter((r) => !isBoard(r.path));
say(strays.length === 0, strays.length
  ? `lastmod у ${strays.length} записей без борта: ${strays.slice(0, 4).map((r) => r.path).join(', ')}…`
  : 'lastmod стоит только у страниц аэропортов и прилётов');

// Обратная сторона: если борта прогреты, хоть у кого-то отметка обязана быть. Ноль означает
// либо холодное хранилище, либо что поле снова отвалилось, — и молча отличить нельзя.
say(withMod.length > 0, withMod.length
  ? `отметки проставлены (${(100 * withMod.length / Math.max(rows.filter((r) => isBoard(r.path)).length, 1)).toFixed(0)}% страниц с бортом)`
  : 'НИ ОДНОЙ отметки — хранилище холодное или поле пропало');

if (withMod.length) {
  // ── 4. Формат ──────────────────────────────────────────────────────────────────────────
  const bad = withMod.filter((r) => Number.isNaN(Date.parse(r.lastmod)));
  say(bad.length === 0, bad.length ? `неразбираемых дат: ${bad.length} (${bad[0].lastmod})` : 'все даты разбираются как W3C Datetime');

  // ── 2. Не из будущего ──────────────────────────────────────────────────────────────────
  const now = Date.now();
  const future = withMod.filter((r) => Date.parse(r.lastmod) > now + 60_000);
  say(future.length === 0, future.length
    ? `дат из будущего: ${future.length}, худшая ${future[0].lastmod}`
    : 'ни одной даты из будущего');

  // ── 1. Не время сборки ─────────────────────────────────────────────────────────────────
  // У настоящих отметок разброс есть по построению: прогрев обходит ярусы с разной частотой,
  // от нескольких раз в сутки у мега-хабов до раза в день у хвоста. Время сборки дало бы одно
  // и то же значение всюду. Порог намеренно низкий — ловим вырождение, а не меряем разброс.
  const uniq = new Set(withMod.map((r) => r.lastmod));
  say(uniq.size > 1 || withMod.length === 1,
    uniq.size > 1
      ? `значений различается ${uniq.size} на ${withMod.length} записей — это отметки данных, а не время сборки`
      : `ВСЕ ${withMod.length} записей несут одну дату ${[...uniq][0]} — похоже на время сборки`);

  const ages = withMod.map((r) => (now - Date.parse(r.lastmod)) / 3_600_000).sort((a, b) => a - b);
  console.log(`     возраст отметок, ч: мин ${ages[0].toFixed(1)} · медиана ${ages[ages.length >> 1].toFixed(1)} · макс ${ages[ages.length - 1].toFixed(1)}`);
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nlastmod стоит только там, где ему есть на что опереться');
process.exit(fails ? 1 : 0);
