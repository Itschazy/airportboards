// Подстраница прилётов: она должна отличаться от родителя, а не быть его копией с другим бортом.
//
// Вопрос перестал быть теоретическим 14.08. Порог ARRIVALS_MIN_DAILY снижен с 40 до 10, и
// число заявленных в карте подстраниц прилётов растёт с 462 примерно до тысячи — потому что
// класс запросов «прилёт» даёт лучший CTR на сайте (3.0% против 1.5% у общего «табло»), а
// KZN, UFA, AER, CEK и MRV в карту не попадали вовсе. Заявлять вдвое больше страниц можно
// только будучи уверенным, что каждая из них самостоятельна: карта, обещающая почти-дубли,
// уже приводила к массовому исключению.
//
// Что проверяется:
//   1. Заголовок вкладки говорит о ПРИЛЁТЕ и отличается от родительского.
//   2. canonical — самоссылка (а не на родителя, как у /departures, и это намеренная разница).
//   3. Раздел «Советы вылетающим» на табло прилётов НЕ рендерится. Весь его текст про
//      отправление — регистрация, багаж, контроль, ручная кладь, — и встречающему рейс там не
//      адресовано ни слова. Убрано, а не переименовано: нейтральная вывеска над теми же
//      советами прячет несоответствие, а не устраняет.
//   4. Направления в разделе маршрутов агрегируются по ОТПРАВЛЕНИЮ (откуда летят), а не по
//      прибытию, — иначе раздел дублирует родительский.
//   5. Схожесть с родителем остаётся человеческой. Замер 14.08 по 12 парам: медиана 0.36 при
//      диапазоне 0.34–0.50. Порог провала 0.70 — это уже «почти один документ».
//
// Осмысленно только против ПРОГРЕТОГО хранилища: на холодной машине борта пусты, страница
// честно вырождается, и мерить там нечего. Пустой борт трактуется как пропуск, не как провал.
//
// Usage:  node scripts/check-arrivals-page.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';
const CODES = ['AYT', 'JFK', 'UFA', 'KZN', 'SVO'];
const LOC = 'ru';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`страница прилётов (${BASE})\n`);

const get = async (u) => (await fetch(u, { headers: { 'user-agent': 'audit-bot' } })).text();
const attrOf = (h, re) => re.exec(h)?.[1] ?? '';
const titleOf = (h) => attrOf(h, /<title[^>]*>([\s\S]*?)<\/title>/i).trim();
const h2sOf = (h) => [...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
  .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
/** Видимый текст. Разметку и <script> выбрасываем: в RSC-нагрузке лежит весь каталог сообщений,
 *  и греп по полному HTML отвечает «да» на любой вопрос. На этом уже обжигались дважды. */
const textOf = (h) => (h.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();

const shingles = (s) => {
  const w = s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let k = 0; k + 5 <= w.length; k++) out.add(w.slice(k, k + 5).join(' '));
  return out;
};
const jaccard = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n || 1); };

let checked = 0;
const sims = [];
for (const code of CODES) {
  const [parent, arr] = await Promise.all([
    get(`${BASE}/${LOC}/airport/${code}`),
    get(`${BASE}/${LOC}/airport/${code}/arrivals`),
  ]);
  const pText = textOf(parent), aText = textOf(arr);
  // Пустой борт — вырожденный случай, страница честно короткая. Не наш предмет.
  if (aText.length < 1500) { console.log(`  · ${code}: борт пуст (${aText.length} знаков) — пропуск`); continue; }
  checked++;

  // 1. Заголовок вкладки
  const pT = titleOf(parent), aT = titleOf(arr);
  say(aT !== pT, `${code}: заголовок отличается от родительского`);
  say(/прилет|прилёт/i.test(aT), `${code}: заголовок называет прилёт — «${aT.slice(0, 52)}»`);

  // 2. canonical — самоссылка
  const canon = attrOf(arr, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  say(canon.endsWith(`/${LOC}/airport/${code}/arrivals`), `${code}: canonical на себя — ${canon.replace(/^https:\/\/[^/]+/, '')}`);

  // 3. Советы вылетающим — только у родителя
  const tipRe = /Советы вылетающим/i;
  const pHasTips = h2sOf(parent).some((x) => tipRe.test(x));
  const aHasTips = h2sOf(arr).some((x) => tipRe.test(x));
  say(!aHasTips, `${code}: на табло прилётов нет раздела «Советы вылетающим»`);
  if (!pHasTips) console.log(`     (у родителя ${code} этого раздела тоже нет — расширенного контента не завезли)`);

  // 4. Направления считаются по отправлению
  const secRe = /<h2[^>]*>([^<]*(?:направлени|Popular routes)[^<]*)<\/h2>/i;
  const pSec = secRe.exec(parent)?.[1] ?? '', aSec = secRe.exec(arr)?.[1] ?? '';
  if (pSec && aSec) say(pSec !== aSec, `${code}: раздел маршрутов озаглавлен по направлению («${aSec.slice(0, 34)}»)`);

  // 5. Схожесть
  const j = jaccard(shingles(pText), shingles(aText));
  sims.push([code, j]);
  say(j < 0.70, `${code}: схожесть с родителем ${j.toFixed(3)} (порог 0.70)`);
}

if (!checked) {
  console.log('\nни одного прогретого борта — проверять нечего (это не провал)');
  process.exit(0);
}
const med = sims.map(([, j]) => j).sort((a, b) => a - b)[sims.length >> 1];
console.log(`\n  медиана схожести по ${sims.length} парам: ${med.toFixed(3)} (замер 14.08 давал 0.36)`);
console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nподстраница прилётов самостоятельна');
process.exit(fails ? 1 : 0);
