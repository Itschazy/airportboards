// Синтетическое хранилище бортов — чтобы проверки можно было прогнать на холодной машине.
//
// ЗАЧЕМ. Половина того, что делает карта сайта, зависит от ЖИВЫХ данных: подстраница прилётов
// заявляется, только если на борту сейчас есть строки; lastmod берётся из отметки хранилища;
// маршруты отбираются по фактическим рейсам. На машине, где прогрев не работал, всего этого
// нет — и карта локально выглядит короче боевой. 13.08 на этом потеряли время: локальные 4 464
// записи против боевых 5 380 выглядели как недоехавший выкат, а разошлись ровно прогревом.
//
// Хранилище пишется в формате lib/flightStore.ts и подсовывается через FLIGHT_STORE_PATH.
// Ни одного обращения к провайдеру: строки синтетические, платить нечем.
//
// Ярусы подобраны ВОКРУГ ПОРОГА ARRIVALS_MIN_DAILY = 10 с обеих сторон, потому что проверять
// надо именно границу: OSS ровно на пороге обязан войти, SUI/LWN/PES ниже — не войти. DME
// стоит отдельно: у него есть отметка времени и НОЛЬ строк, и это единственный способ поймать
// подмену «есть отметка» на «есть борт» — та самая пара, которую уже путали.
//
// ⚠️ ФИКСТУРУ НАДО ОТДАТЬ И СБОРКЕ, А НЕ ТОЛЬКО ЗАПУСКУ. Страницы хабов и карта сайта
// пререндерятся, то есть состояние хранилища ЗАПЕКАЕТСЯ во время build. Сборка без
// FLIGHT_STORE_PATH кладёт на диск холодные страницы, и `next start` с фикстурой отдаёт их
// как есть: карта показала 0 прилётов и 0 lastmod, а схожесть SVO с его подстраницей
// подскочила до 0.808 — две проверки красные, обе на пустом месте. Признак ровно этот:
// цифры совпадают с прогоном на холодной машине, хотя фикстура заведомо на месте.
//
// Usage:  node scripts/make-fixture-store.mjs /tmp/fixture-store.json
//         FLIGHT_STORE_PATH=/tmp/fixture-store.json NEXT_DIST_DIR=.next-audit npx next build
//         FLIGHT_STORE_PATH=/tmp/fixture-store.json NEXT_DIST_DIR=.next-audit npx next start -p 3099
//
// И снести пререндер карты перед прогоном — она SSG с revalidate = 86400 и сама не обновится:
//         rm -rf .next-audit/cache && find .next-audit/server/app -name 'sitemap*' -type f -delete

import fs from 'node:fs';

const OUT = process.argv[2];
if (!OUT) { console.error('укажите путь: node scripts/make-fixture-store.mjs <файл>'); process.exit(1); }

const now = Date.now();
const nowSec = Math.floor(now / 1000);
const hhmm = (ts) => new Date(ts * 1000).toISOString().slice(11, 16);

/** [код, вылетов в сутки (для сверки с data/airport-service.json), строк на борту] */
const AIRPORTS = [
  ['JFK', 1810, 24], ['AYT', 227, 20], ['SVO', 221, 18], ['AER', 39, 16],
  ['KZN', 29, 14], ['UFA', 25, 12], ['MRV', 19, 10], ['CEK', 15, 9],
  ['OSS', 10, 7],                                  // ровно на пороге — должен войти
  ['SUI', 5, 4], ['LWN', 2, 3], ['PES', 1, 2],     // ниже порога — не должны
  ['DME', 51, 0],                                  // отметка есть, строк нет — lastmod нельзя
];

/**
 * Партнёры РАЗНЫЕ для вылетов и прилётов, и их МНОГО. Ни то, ни другое не косметика.
 *
 * Первая версия брала один список на оба направления, и раздел «популярные направления» на
 * табло прилётов совпадал с родительским до буквы. Вторая развела списки, но оставила по
 * восемь кодов — ровно столько, сколько раздел и показывает, — и разнообразия всё равно не
 * было: на настоящем борту хаба тридцать с лишним разных концов, у фикстуры восемь. Схожесть
 * SVO с его же подстраницей давала 0.810 при 0.442 на боевых данных, и проверка ругалась на
 * фикстуру, а не на код.
 *
 * Причина в арифметике сравнения: чем беднее уникальная часть страницы, тем большую долю в
 * шинглах занимает общая обвязка — подвал, навигация, FAQ, соседние аэропорты. У SVO это
 * вылезло первым, потому что его родительская страница короче прочих (нет раздела вики-
 * маршрутов, который есть у KZN), и обвязка там весит больше.
 *
 * Отсюда правило для этого файла: фикстура обязана воспроизводить ФОРМУ боевых данных, а не
 * только их схему. Списки по двадцать кодов и непересекающиеся — тогда «направления» и
 * «авиакомпании» расходятся между направлениями так же, как расходятся на проде.
 */
const DEP_PARTNERS = ['LED', 'IST', 'DXB', 'AER', 'SVX', 'OVB', 'KRR', 'MSQ', 'KUF', 'ROV',
                      'UFA', 'CEK', 'PEE', 'TJM', 'KJA', 'VVO', 'KHV', 'MMK', 'ARH', 'GOJ'];
const ARR_PARTNERS = ['AYT', 'TAS', 'GYD', 'EVN', 'VKO', 'KGD', 'NQZ', 'ALA', 'FRU', 'DYU',
                      'BCN', 'AMS', 'CDG', 'FRA', 'PRG', 'HEL', 'ARN', 'VNO', 'RIX', 'TLL'];
const DEP_AIRLINES = ['SU', 'U6', 'DP', 'FV', 'N4', 'A4'];
const ARR_AIRLINES = ['TK', 'PC', 'KC', 'HY', 'J2', 'EK'];

const entries = {};
for (const [iata, , rows] of AIRPORTS) {
  for (const direction of ['departures', 'arrivals']) {
    const param = direction === 'departures' ? `dep_iata=${iata}` : `arr_iata=${iata}`;
    const partners = direction === 'departures' ? DEP_PARTNERS : ARR_PARTNERS;
    const carriers = direction === 'departures' ? DEP_AIRLINES : ARR_AIRLINES;
    const data = [];
    for (let i = 0; i < rows; i++) {
      // Половина в прошлом, половина впереди: так живы и срез борта, и признак allPast.
      const ts = nowSec + (i - Math.floor(rows / 2)) * 1500;
      // Шаг 7 при длине 20 взаимно прост с ней — значит коды не повторяются, пока строк
      // меньше двадцати, и раздел «направления» получает столько же разных концов, сколько
      // получил бы на живом борту.
      const other = partners[(i * 7) % partners.length];
      const dep = direction === 'departures' ? iata : other;
      const arr = direction === 'departures' ? other : iata;
      if (dep === arr) continue;
      data.push({
        airline_iata: carriers[i % carriers.length],
        flight_iata: `${carriers[i % carriers.length]}${100 + i}`,
        flight_number: String(100 + i),
        dep_iata: dep, dep_time: hhmm(ts), dep_time_ts: ts,
        dep_terminal: 'A', dep_gate: String(1 + (i % 20)),
        arr_iata: arr, arr_time: hhmm(ts + 5400), arr_time_ts: ts + 5400, arr_terminal: 'B',
        status: ts < nowSec ? 'active' : 'scheduled',
      });
    }
    // Возраст отметки РАЗНЫЙ по аэропортам: прогрев обходит ярусы с разной частотой, и lastmod
    // обязан это отражать. Одинаковое значение всюду — признак того, что туда снова попало
    // время сборки, и check-sitemap-lastmod ловит именно вырождение разброса.
    const ageMin = iata === 'JFK' ? 20 : iata === 'AYT' ? 90 : 60 + (iata.charCodeAt(0) % 11) * 37;
    entries[`${direction}:${param}`] = { ts: now - ageMin * 60_000, data };
  }
}

const d = new Date();
fs.writeFileSync(OUT, JSON.stringify({
  entries,
  month: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
  count: 0,
  byKind: { warm: 0, human: 0 },
}));
console.log(`${OUT}: ${Object.keys(entries).length} ключей, строк ${Object.values(entries).reduce((n, e) => n + e.data.length, 0)}`);
