// Submit URLs to IndexNow (Yandex + Bing) for near-instant crawling.
// Usage: node scripts/indexnow.mjs            → curated set + всё новое в карте сайта
//        node scripts/indexnow.mjs --all-hubs → also all country pages (12 locales)
//        node scripts/indexnow.mjs --no-fresh → только curated, без обращения к карте
// The key file must already be live at https://airportsboard.live/<key>.txt
//
// КУРИРУЕМОГО НАБОРА МАЛО, и 13.08 это стало видно. Список флагманов зашит в код и отвечает на
// вопрос «что важно вообще», а не «что изменилось». Между тем правка области карты сайта в тот
// день сняла с неё 43% корпуса, а 14.08 вернула подстраницы прилётов целому ярусу аэропортов, —
// и ни об одном из этих изменений ни Bing, ни Яндекс не узнали бы, потому что во флагманах
// ничего не поменялось. Теперь к набору добавляется всё, чего в карте не было в прошлый раз
// (scripts/seo-priority.mjs), плюс страницы по измеренному спросу из Метрики.
import fs from 'fs';
import { priorityPaths, loadState, saveState, knownPaths } from './seo-priority.mjs';

const HOST = 'airportsboard.live';
const BASE = `https://${HOST}`;
const STATE = '.indexnow-state.json';
// Ключ лежит и отдельным файлом, и — обязательно — публичным .txt в public/, потому что
// IndexNow проверяет владение именно по нему. Второй путь оставлен как запасной: файл в public/
// в репозитории есть всегда, а забыть выложить .indexnow-key на новую машину легко.
const KEY = (() => {
  try { return fs.readFileSync('.indexnow-key', 'utf8').trim(); } catch { /* ниже */ }
  const f = fs.readdirSync('public').find(x => /^[0-9a-f]{32}\.txt$/.test(x));
  if (!f) { console.error('ключ IndexNow не найден: ни .indexnow-key, ни public/<key>.txt'); process.exit(1); }
  return f.replace(/\.txt$/, '');
})();
const KEY_LOCATION = `${BASE}/${KEY}.txt`;

const LOCALES = ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'];
// Flagship airports most worth seeding into the index first.
const FLAGSHIPS = ['SVO','DME','VKO','LED','LHR','CDG','FRA','AMS','IST','DXB','JFK','LAX','HND','PEK','PVG','SIN','ICN','BCN','MAD','FCO'];

const urls = new Set();
for (const loc of LOCALES) {
  urls.add(`${BASE}/${loc}`);
  urls.add(`${BASE}/${loc}/airports`);
  for (const iata of FLAGSHIPS) {
    urls.add(`${BASE}/${loc}/airport/${iata}`);
    urls.add(`${BASE}/${loc}/airport/${iata}/arrivals`);
    urls.add(`${BASE}/${loc}/airport/${iata}/departures`);
  }
}

// Event guides: the hub, every event page, and the airports each event serves. These are
// time-critical (an event page is worthless after the date) so they always go in the push.
try {
  const files = fs.readdirSync('data/events').filter(f => f.endsWith('.json'));
  const eventAirports = new Set();
  for (const loc of LOCALES) urls.add(`${BASE}/${loc}/events`);
  for (const f of files) {
    const ev = JSON.parse(fs.readFileSync(`data/events/${f}`, 'utf8'));
    const slug = ev?.meta?.slug;
    if (!slug) continue;
    const ended = Date.parse(ev.meta.endDate || ev.meta.startDate) + 3 * 86400000 < Date.now();
    for (const loc of LOCALES) urls.add(`${BASE}/${loc}/event/${slug}`);
    if (!ended) for (const a of ev.meta.airports || []) eventAirports.add(a.iata);
  }
  for (const loc of LOCALES) for (const iata of eventAirports) {
    urls.add(`${BASE}/${loc}/airport/${iata}`);
    urls.add(`${BASE}/${loc}/airport/${iata}/arrivals`);
    urls.add(`${BASE}/${loc}/airport/${iata}/departures`);
  }
  console.log(`+ events: ${files.length} guide(s), ${eventAirports.size} active event airport(s)`);
} catch { /* no events dir */ }

if (process.argv.includes('--all-hubs')) {
  const airports = JSON.parse(fs.readFileSync('data/airports.json', 'utf8'));
  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const countries = [...new Set(airports.map(a => a.country).filter(Boolean))];
  for (const loc of LOCALES) for (const c of countries) urls.add(`${BASE}/${loc}/airports/${slugify(c)}`);
}

// Всё, что появилось в карте сайта с прошлого запуска, плюс страницы по измеренному спросу.
// Локали ru и en: 99.7% показов Яндекса кириллические, en нужен как x-default кластера.
const state = loadState(STATE);
if (!process.argv.includes('--no-fresh')) {
  try {
    const { paths, sitemapSize } = await priorityPaths({ known: knownPaths(state), locales: ['ru', 'en'] });
    for (const p of paths) urls.add(BASE + p);
    console.log(`+ карта сайта: ${sitemapSize} записей, из них новых для этого толкателя ${paths.length}`);
  } catch (e) {
    // Карта недоступна — отправляем курируемый набор, а не падаем.
    console.log(`! карта сайта не прочиталась (${e.message}) — идёт только курируемый набор`);
  }
}

const urlList = [...urls];

/**
 * Партиями по 10 000 — это ЖЁСТКИЙ лимит обеих точек, а не рекомендация.
 *
 * Комментарий «IndexNow allows up to 10000 URLs per request» стоял здесь и раньше, но код
 * отправлял список целиком: пока набор был курируемым, он не дотягивал до лимита, и строка
 * оставалась заметкой на будущее. Будущее наступило вместе с добавлением адресов из карты —
 * 13 142 штуки, и обе точки отказали разом:
 *
 *     yandex.com/indexnow      → 422 "No more than 10000 urls allowed"
 *     api.indexnow.org         → 400 InvalidRequestParameters
 *
 * Отправка при этом не потеряла ничего: состояние пишется только после принятого ответа
 * (см. ниже), так что неудачный прогон не пометил адреса отправленными.
 */
const CHUNK = 10_000;
const chunks = [];
for (let i = 0; i < urlList.length; i += CHUNK) chunks.push(urlList.slice(i, i + CHUNK));
console.log(`Submitting ${urlList.length} URLs to IndexNow${chunks.length > 1 ? ` (${chunks.length} партиями)` : ''}…`);

const ENDPOINTS = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];

let accepted = false;
for (const [n, chunk] of chunks.entries()) {
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: chunk });
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
      const txt = await r.text();
      if (r.ok) accepted = true;
      console.log(`  [${n + 1}/${chunks.length}] ${ep} → ${r.status} ${r.statusText} ${txt ? '| ' + txt.slice(0, 100) : ''}`);
    } catch (e) {
      console.log(`  [${n + 1}/${chunks.length}] ${ep} → ERROR ${e.message}`);
    }
  }
}

// Состояние пишется ТОЛЬКО после принятой отправки. Иначе неудачный прогон «запомнил» бы
// адреса как отправленные, и следующий запуск счёл бы их старыми — то есть один сетевой сбой
// навсегда вычеркнул бы партию новых страниц из очереди.
if (accepted) {
  const now = new Date().toISOString();
  for (const u of urlList) state.sent[new URL(u).pathname] = now;
  state.runs = [...(state.runs ?? []), { at: now, n: urlList.length }].slice(-30);
  saveState(STATE, state);
}
console.log(accepted ? 'Done.' : 'Ни одна точка не приняла отправку — состояние не тронуто.');
