// Ручка экрана аэропорта для приложений (app/api/app/airport/[iata]/route.ts): форма ответа,
// 404 на неизвестное и — главное — что она НИКОГДА НЕ ПОКУПАЕТ.
//
// Почему проверка против сервера, а не юнит-тест. Ручка и lib/airport-page-props.ts берут
// строки через next-intl/server, а борт — через lib/flights.ts с хранилищем на диске;
// транспиляция в vm (как tests/app-cors.test.mjs) потребовала бы подменить половину
// окружения Next, и проверялась бы подмена, а не ручка. Здесь — тот же собранный код, что
// уйдёт на сервер.
//
// Как доказывается «не покупает». Решение о покупке у сайта одно — mayFetchLiveFor
// (lib/live-budget.ts), и КАЖДЫЙ его вызов оставляет след в /api/airlabs-usage: либо
// liveBudget.admitted, либо один из счётчиков liveBudget.refused (localhost, notBrowser, …).
// Расход поставщику виден там же полями count/human/warm. Проверка снимает их до и после
// серии запросов к ручке с браузерным UA, Host: airportsboard.live и Origin приложения — то
// есть ровно с тем, с чем покупает /api/flights, — и требует, чтобы не сдвинулось НИЧЕГО.
// Положительный контроль: тот же запрос к /api/flights обязан сдвинуть liveBudget (admitted
// или refused) — иначе счётчики слепы, и «ничего не сдвинулось» ничего не доказывает.
//
// 🔴 ТОЛЬКО ЛОКАЛЬНЫЙ СЕРВЕР НА ФИКСТУРЕ С ПУСТЫМ AIRLABS_API_KEY. Проверка шлёт браузерный
// UA с Host боевого сайта: на production /api/flights с такими заголовками — платный запрос.
// Поэтому любой адрес, кроме localhost/127.0.0.1/[::1], — отказ до первого запроса.
//
// Usage:  node scripts/check-app-airport.mjs [http://localhost:3099] [--token=localtest]
//         (CRON_TOKEN сервера; по умолчанию localtest, как в инструкции к фикстуре)

import http from 'node:http';

const args = process.argv.slice(2);
const BASE = (args.find(a => !a.startsWith('--')) || 'http://localhost:3099').replace(/\/$/, '');
const TOKEN = (args.find(a => a.startsWith('--token=')) || '--token=localtest').slice(8);

if (!/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`✗ ${BASE}: только локальный сервер на фикстуре — проверка шлёт браузерный UA и Host боевого сайта`);
  process.exit(2);
}

const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 16; sdk_gphone64_arm64 Build/BE2A.250530.026.F3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.137 Mobile Safari/537.36 AirportsBoardApp/0.1.0',
  Host: 'airportsboard.live',
  Origin: 'https://localhost',
};
const BOT = { 'User-Agent': 'audit-bot' };

let failed = 0;
const ok = (cond, msg) => { if (cond) console.log(`✓ ${msg}`); else { failed++; console.log(`✗ ${msg}`); } };

// node:http, а не fetch: fetch (undici) молча заменяет заголовок Host адресом сервера, и
// запрос приходил бы как «localhost» — слой 0 отказал бы любому, и проверка денег ничего не
// доказывала бы. Первая редакция на этом и попалась: контроль показал refused.localhost.
function get(path, headers = BOT) {
  return new Promise((resolve, reject) => {
    const req = http.request(BASE + path, { headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(text); } catch { /* не JSON */ }
        resolve({ res: { status: res.statusCode, headers: { get: (k) => res.headers[k.toLowerCase()] ?? null } }, json });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function counters() {
  const { json } = await get(`/api/airlabs-usage?token=${encodeURIComponent(TOKEN)}`);
  if (!json?.liveBudget) {
    console.error('✗ /api/airlabs-usage не отдал полные цифры — неверный --token или сервер без CRON_TOKEN');
    process.exit(2);
  }
  const lb = json.liveBudget;
  return {
    count: json.count, human: json.human, warm: json.warm,
    admitted: lb.admitted,
    refused: Object.values(lb.refused).reduce((a, b) => a + b, 0),
    raw: { count: json.count, human: json.human, warm: json.warm, admitted: lb.admitted, refused: lb.refused },
  };
}

// ── Форма ответа ─────────────────────────────────────────────────────────────────────────────
{
  const { res, json } = await get('/api/app/airport/KZN?locale=ru&dir=departures', BROWSER);
  ok(res.status === 200, `KZN ru departures → ${res.status}`);
  ok(res.headers.get('cache-control') === 'private, max-age=0, must-revalidate', `Cache-Control: ${res.headers.get('cache-control')}`);
  ok(res.headers.get('access-control-allow-origin') === 'https://localhost', `CORS для Origin приложения: ${res.headers.get('access-control-allow-origin')}`);
  ok(json?.iata === 'KZN' && json.locale === 'ru' && json.dir === 'departures', 'iata/locale/dir эхом');
  ok(json?.airport?.tz === 'Europe/Moscow', `airport.tz = ${json?.airport?.tz}`);
  const b = json?.board ?? {};
  for (const k of ['displayName', 'cityName', 'lead', 'aboutTitle']) ok(typeof b[k] === 'string' && b[k].length > 0, `board.${k} — строка`);
  for (const k of ['noService', 'infoOnly', 'initialAllPast']) ok(typeof b[k] === 'boolean', `board.${k} — boolean`);
  ok('statusLine' in b && 'pendingNote' in b, 'board.statusLine и board.pendingNote присутствуют (строка или null)');
  ok(Array.isArray(b.initialFlights) && b.initialFlights.length > 0 && b.initialFlights.length <= 40, `initialFlights: ${b.initialFlights?.length} строк (срез первого экрана ≤ 40)`);
  ok(Number.isInteger(b.boardTotal) && b.boardTotal >= b.initialFlights?.length, `boardTotal ${b.boardTotal} ≥ среза`);
  ok(typeof json?.fetchedAt === 'number' && json.fetchedAt === b.initialFetchedAt, 'fetchedAt — отметка хранилища, та же, что initialFetchedAt');
  ok(!('view' in b), 'служебное поле view наружу не уходит');
  ok(json?.guide && typeof json.guide.title === 'string' && Array.isArray(json.guide.guide?.blocks) && json.guide.guide.blocks.length > 0, 'справочная KZN на ru есть');
  ok(json?.closed === null, 'closed: null у действующего аэропорта');
}
{
  const { json } = await get('/api/app/airport/KZN?locale=ru&dir=arrivals');
  const b = json?.board ?? {};
  ok(json?.dir === 'arrivals' && b.defaultMode === 'arrivals' && typeof b.headingNote === 'string', 'arrivals: defaultMode и headingNote подстраницы');
  ok(!('lead' in b) && !('noService' in b), 'arrivals: набор подстраницы — без lead/noService, как на сайте');
}
{
  const { json } = await get('/api/app/airport/SUI?locale=de&dir=departures');
  ok(json?.guide === null, 'SUI: справочной нет → guide: null');
  const tx = (await get('/api/app/airport/TXL?locale=en&dir=departures')).json;
  ok(tx?.closed?.year === 2020 && tx.closed.successor?.iata === 'BER', `TXL закрыт: 200 и преемник ${tx?.closed?.successor?.iata}`);
  const tse = await get('/api/app/airport/tse?locale=en&dir=departures');
  ok(tse.res.status === 200 && tse.json?.iata === 'NQZ', `выведенный код tse → ${tse.json?.iata} (lib/iata-aliases.ts)`);
  const kbp = (await get('/api/app/airport/KBP?locale=en&dir=departures')).json;
  ok(kbp?.board?.noService === true && kbp.guide === null, 'KBP: noService и без справочной');
}

// ── 404 на неизвестное, с CORS ───────────────────────────────────────────────────────────────
for (const [path, why] of [
  ['/api/app/airport/ZZZ?locale=en&dir=departures', 'неизвестный код'],
  ['/api/app/airport/KZN?locale=xx&dir=departures', 'неизвестная локаль'],
  ['/api/app/airport/KZN?dir=departures', 'нет локали (не молчаливый en)'],
  ['/api/app/airport/KZN?locale=en&dir=both', 'неизвестное направление'],
  ['/api/app/airport/KZN?locale=en', 'нет направления'],
]) {
  const { res, json } = await get(path, BROWSER);
  ok(res.status === 404 && typeof json?.error === 'string' && res.headers.get('access-control-allow-origin') === 'https://localhost', `${why} → ${res.status} ${json?.error ?? ''}`);
}

// ── Деньги ───────────────────────────────────────────────────────────────────────────────────
{
  const before = await counters();
  const codes = ['KZN', 'JFK', 'AYT', 'SVO', 'DME', 'CEK', 'SUI', 'UFA', 'ZZZ'];
  for (const c of codes) for (const dir of ['departures', 'arrivals']) {
    await get(`/api/app/airport/${c}?locale=ru&dir=${dir}`, BROWSER);
    await get(`/api/app/airport/${c}?locale=en&dir=${dir}`, { ...BROWSER, Origin: 'capacitor://localhost', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AirportsBoardApp/0.1.0' });
  }
  const after = await counters();
  ok(after.admitted === before.admitted, `ручка: liveBudget.admitted ${before.admitted} → ${after.admitted}`);
  ok(after.refused === before.refused, `ручка: liveBudget.refused (сумма) ${before.refused} → ${after.refused} — mayFetchLiveFor не вызывался вовсе`);
  ok(after.count === before.count && after.human === before.human && after.warm === before.warm, `ручка: расход поставщику ${JSON.stringify([before.count, before.human, before.warm])} → ${JSON.stringify([after.count, after.human, after.warm])}`);

  // Положительный контроль: те же заголовки на /api/flights доходят до решения о покупке.
  await get('/api/flights/KZN?direction=departures&locale=ru', BROWSER);
  const control = await counters();
  // Ждём именно admitted: refused.localhost значил бы, что Host не дошёл и слой 0 отказал до
  // всякого решения о деньгах — то есть заголовки серии выше были не те, что у покупателя.
  ok(control.admitted === after.admitted + 1 && control.refused === after.refused,
    `контроль: /api/flights с теми же заголовками допущен к покупке (admitted ${after.admitted} → ${control.admitted}, refused ${JSON.stringify(after.raw.refused)} → ${JSON.stringify(control.raw.refused)}) — счётчики не слепы, заголовки покупательские`);
}

console.log(failed ? `\n✗ провалов: ${failed}` : '\n✓ check-app-airport: всё зелёное');
process.exit(failed ? 1 : 0);
