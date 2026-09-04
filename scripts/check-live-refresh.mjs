// Живой путь: покупает ли сайт свежие данные для человека, который смотрит на устаревший борт.
//
// ЗАЧЕМ. 04.09 замер показал, что не покупает НИКОГДА. Ни один борт из двадцати одного самого
// посещаемого аэропорта не был свежее десяти минут, медиана — девять часов, при том что
// девятью часами раньше шёл вечерний пик. Разница с контрольной группой без трафика (20 часов)
// объяснялась целиком закреплением в прогреве, а не читателями.
//
// Дефект прожил незамеченным ровно потому, что отказ в живом запросе МОЛЧИТ по построению:
// читатель получает борт из хранилища, страница отдаётся, код ответа 200, и снаружи это
// неотличимо от исправной работы. Единственный признак — возраст данных, а на него никто не
// смотрит, пока не пожалуется человек.
//
// Найдено две причины, обе тихие:
//
//   1. Людская доля плана. `AIRLABS_HUMAN_RESERVE_PCT=12` задавалось в расчёте на план 195 000
//      (23 400 запросов), но реальный лимит провайдера 100 000, monthlyCap берёт минимум — и
//      доля молча стала 12 000. Выбрав её, сайт отказывает читателям до первого числа.
//   2. Приложение Яндекса считалось обходчиком. Его встроенный браузер отдаёт
//      «… Mobile/15E148 YandexSearch/23.101.1», а BOT_RE ловил подстроку «yandex». 88% визитов
//      сайта приходят из Яндекса, и заметная часть открывает страницу внутри его приложения.
//
// Проверка держит обе двери закрытыми и проверяет, что третья не появилась.
//
// Usage:  node scripts/check-live-refresh.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'https://airportsboard.live';
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`живой путь: свежесть для читателя (${BASE})\n`);

const SRC = fs.readFileSync('lib/live-budget.ts', 'utf8');

// ── 1. Строки агента классифицируются верно ──────────────────────────────────────────────
// Регулярки читаются ИЗ КОДА, а не переписываются здесь: проверка, заведшая собственный
// предикат, спорит с кодом вместо того чтобы его стеречь.
const rx = (name) => {
  const m = new RegExp(`const ${name} = /(.+?)/([gimsuy]*);`).exec(SRC);
  if (!m) throw new Error(`в lib/live-budget.ts нет ${name}`);
  return new RegExp(m[1], m[2]);
};
const BOT_RE = rx('BOT_RE'), PREFIX = rx('BROWSER_PREFIX'), ENGINE = rx('ENGINE_TOKEN');
const CRAWLER = rx('CRAWLER_NAME'), APP = rx('APP_BROWSER');
const looksLikeBrowser = (ua) => {
  if (!PREFIX.test(ua) || !ENGINE.test(ua)) return false;
  if (CRAWLER.test(ua)) return false;
  if (APP.test(ua)) return true;
  return !BOT_RE.test(ua);
};

/** [название, ожидается ли «живой браузер», строка агента] */
const UAS = [
  ['Chrome Android', true, 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
  ['Safari iOS', true, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'],
  ['Яндекс.Браузер', true, 'Mozilla/5.0 (Linux; arm_64; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 YaBrowser/23.11.3.96.00 Mobile Safari/537.36'],
  ['приложение Яндекс, Android', true, 'Mozilla/5.0 (Linux; arm_64; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 YaApp_Android/23.101.1 YaSearchBrowser/23.101.1 BroPP/1.0 SA/3 Mobile Safari/537.36'],
  ['приложение Яндекс, iOS', true, 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 YandexSearch/23.101.1'],
  ['Samsung Internet', true, 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'],
  ['VK WebView', true, 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 VKAndroidApp/7.44'],
  ['Googlebot, браузерная форма', false, 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'],
  ['YandexBot, браузерная форма', false, 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12B411 Safari/600.1.4 (compatible; YandexBot/3.0; +http://yandex.com/bots)'],
  ['YandexBot', false, 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'],
  ['AhrefsBot', false, 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'],
  ['bingbot', false, 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'],
  ['audit-bot — им меряют прод', false, 'audit-bot'],
  ['curl', false, 'curl/8.4.0'],
];
const wrong = UAS.filter(([, want, ua]) => looksLikeBrowser(ua) !== want);
say(wrong.length === 0, wrong.length
  ? `неверно классифицированы: ${wrong.map(([n, w]) => `${n} (ждали ${w ? 'браузер' : 'не браузер'})`).join('; ')}`
  : `все ${UAS.length} строк агента классифицированы верно, включая приложение Яндекса`);

// ── 2. Право на свежесть подключено, а не просто объявлено ───────────────────────────────
say(/function freshnessOverride\(/.test(SRC), 'freshnessOverride объявлен');
say(/!withinHumanReserve\(\) && !freshnessOverride\(\w+\)/.test(SRC),
  'людская доля БОЛЬШЕ НЕ ОБРЫВ: устаревший борт разрешён сверх неё');

// Возраст обязан приходить СНАРУЖИ. Первая версия считала его тут через getStaleTs(boardKey),
// но boardKey — ключ слоя 2 («departures:BJV»), а хранилище знает «departures:dep_iata=BJV».
// Возраст выходил null всегда, условие «борт устарел» не срабатывало ни разу, и право на
// свежесть молча раздавалось каждому. Формат ключа знает lib/flights.ts — пусть знает он один.
say(/export function mayFetchLive\([^)]*ageMs: number \| null\)/.test(SRC),
  'возраст борта передаётся в mayFetchLive снаружи, а не пересчитывается по чужому ключу');
// Ловим ИСПОЛЬЗОВАНИЕ, а не слово: первая версия этого утверждения запрещала даже упоминание
// и краснела на комментарии, который объясняет, почему так делать нельзя. Проверка, ругающаяся
// на объяснение самой себя, учит удалять объяснения.
say(!/^import .*\bgetStaleTs\b.*from '@\/lib\/flightStore'/m.test(SRC),
  'lib/live-budget.ts не импортирует getStaleTs — ключ хранилища знает только lib/flights.ts');

// Окно свежести обязано совпадать с TTL хранилища. Разъедутся — и сайт будет платить за
// данные, которые getFresh отдал бы бесплатно, либо наоборот считать свежим просроченное.
const stale = /const STALE_MS = \(Number\(process\.env\.(\w+)\) \|\| (\d+)\)/.exec(SRC);
const ttl = /const TTL_MS = \(Number\(process\.env\.(\w+)\) \|\| (\d+)\)/.exec(fs.readFileSync('lib/flightStore.ts', 'utf8'));
say(!!stale && !!ttl && stale[1] === ttl[1] && stale[2] === ttl[2],
  stale && ttl ? `окно свежести и TTL хранилища совпадают: ${stale[1]} или ${stale[2]} с` : 'не удалось сверить окно свежести с TTL');

// Пол прогрева обязан существовать: читатели не должны иметь права выесть план досуха.
const floor = /const WARM_FLOOR_PCT = ([\d.]+)/.exec(SRC);
say(!!floor && Number(floor[1]) >= 0.2 && Number(floor[1]) <= 0.6,
  floor ? `прогреву гарантировано ${(100 * Number(floor[1])).toFixed(0)}% плана` : 'WARM_FLOOR_PCT не найден');

// ── 2-бис. Заслон против фермы обходчиков ────────────────────────────────────────────────
// Google Analytics 04.09, реальное время: 263 активных, 256 первых визитов, 266 просмотров на
// 256 РАЗНЫХ страниц, источник указан у одного. За 28 дней: Direct 5 521 сессия при
// вовлечённости 11%, Unassigned 2 706 при нуле — против Organic Search 13 093 при 82%.
// Ферма исполняет наш JS, значит проходит распознавание браузера; ротация адресов обходит и
// потолок по ширине. Пока живой путь был мёртв, она ничего не стоила — как только покупку
// починили, 256 бортов за полчаса стали бы ~12 000 оплаченных запросов в сутки.
const WARM = fs.readFileSync('lib/warm.ts', 'utf8');
say(/export function freshnessWorthBuying\(/.test(WARM),
  'freshnessWorthBuying объявлен — покупаем свежесть не для всего корпуса');
for (const [file, what] of [['lib/live-board.ts', 'серверный рендер'], ['app/api/flights/[iata]/route.ts', 'ручка /api/flights']]) {
  const src = fs.readFileSync(file, 'utf8');
  say(/freshnessWorthBuying\(/.test(src), `${what} спрашивает freshnessWorthBuying перед покупкой`);
}

// Набор обязан покрывать спрос и НЕ покрывать хвост: иначе заслон либо бесполезен, либо режет
// живых. Проверяется на тех самых кодах, что дали сигнатуру.
{
  const pin = new Set([...WARM.slice(WARM.indexOf('const DEMAND_PINNED'), WARM.indexOf('export const DEMAND_NOT_PINNED')).matchAll(/'([A-Z0-9]{3})'/g)].map((m) => m[1]));
  const svc = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8')).airports;
  const T = [['mega', 400], ['hub', 150], ['major', 40], ['mid', 10], ['small', 1]];
  const tier = (n) => T.find((t) => n >= t[1])?.[0] ?? null;
  const worth = (c) => pin.has(c) || ['mega', 'hub'].includes(tier(svc[c] ?? 0));
  const mustBuy = ['SIN', 'KZN', 'UFA', 'AYT', 'OVB', 'BJV', 'EVN'];
  const mustNot = ['DQM', 'HGO', 'OSI'];
  const bad = [...mustBuy.filter((c) => !worth(c)).map((c) => `${c} должен покупать`),
               ...mustNot.filter((c) => worth(c)).map((c) => `${c} покупать не должен`)];
  const all = Object.keys(svc).filter((c) => (svc[c] ?? 0) > 0);
  const share = 100 * all.filter(worth).length / all.length;
  say(bad.length === 0, bad.length ? bad.join('; ')
    : `набор покрывает ${all.filter(worth).length} из ${all.length} обслуживаемых (${share.toFixed(1)}%) и включает весь измеренный спрос`);
  say(share < 15, `доля корпуса, для которой покупаем свежесть: ${share.toFixed(1)}% (порог 15%)`);
}

// ── 3. Людская доля не задана числом, которое молча схлопнется ───────────────────────────
const env = fs.readFileSync('.env.production', 'utf8');
const pct = /^AIRLABS_HUMAN_RESERVE_PCT=(\d+)/m.exec(env);
say(!!pct && Number(pct[1]) >= 25,
  pct ? `людская доля плана ${pct[1]}%` + (Number(pct[1]) < 25 ? ' — мало, читатели упрутся в потолок до конца месяца' : '')
      : 'AIRLABS_HUMAN_RESERVE_PCT не задан');

// ── 4. Наблюдение за продом — печатается, но не роняет ───────────────────────────────────
// Уронить нельзя честно: ночью читателей нет, и борт законно стоит на цикле прогрева.
// Но цифра должна быть на виду, иначе про неё снова забудут на три недели.
const TOP = ['KZN', 'AYT', 'OVB', 'BJV', 'UFA', 'AER', 'IST'];
const AGE = /Обновлено\s+(?:(\d+)\s*мин|(\d+)\s*ч|(\d+)\s*дн)[^·]*назад/;
const ages = [];
await Promise.all(TOP.map(async (c) => {
  try {
    const html = await (await fetch(`${BASE}/ru/airport/${c}`, { headers: { 'user-agent': 'audit-bot' } })).text();
    const t = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ');
    const m = AGE.exec(t);
    if (m) ages.push({ c, min: m[1] ? +m[1] : m[2] ? +m[2] * 60 : +m[3] * 1440 });
  } catch { /* страница не ответила — не предмет этой проверки */ }
}));
if (ages.length) {
  ages.sort((a, b) => a.min - b.min);
  const f = (v) => v < 60 ? `${v} мин` : v < 1440 ? `${Math.round(v / 60)} ч` : `${Math.round(v / 1440)} дн`;
  const fresh = ages.filter((a) => a.min <= 10).length;
  console.log(`  · возраст бортов топа: ${ages.map((a) => `${a.c} ${f(a.min)}`).join(' · ')}`);
  console.log(`  · свежее десяти минут: ${fresh} из ${ages.length}`
    + (fresh === 0 ? '  (ночью это норма; днём ноль означает, что живой путь снова мёртв)' : ''));
}

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nживому читателю открыта дорога к свежим данным');
process.exit(fails ? 1 : 0);
