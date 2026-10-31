// Насколько свежие данные видит человек, взвешенно по РЕАЛЬНОМУ спросу.
//
// «70% бортов старше суток» — верная, но бесполезная метрика: две трети корпуса это аэродромы,
// которые никто не открывает. Значение имеет другое — какая доля живых заходов приходит на
// борт, которому нельзя верить. Спрос берётся из Яндекс.Вебмастера (единственный твёрдый
// источник: Google по этому сайту не даёт ничего), возраст — с отданной прод-страницы.
//
// Меряется ДВЕ вещи, и вторая важнее первой:
//   1. ВОЗРАСТ данных — подпись «Обновлено N назад», которую сайт печатает честно;
//   2. ПОЛЕЗНОСТЬ борта — есть ли на нём хоть один рейс, который ещё не улетел. Борт может
//      быть шестичасовой давности и при этом состоять целиком из прошлого: в плотном
//      аэропорту MAX_FLIGHTS покрывает 1–4 часа, а интервал прогрева 6–24 часа, поэтому
//      «свежий» и «полезный» — разные вопросы. Человек, приехавший встречать рейс, смотрит
//      именно на второе.
//
// Провайдерские эндпоинты не трогаются: страница читается обычным GET с не-браузерным UA,
// что по построению не тратит платную квоту (см. lib/live-budget.ts, слой 1).
//
// 🔴 ОТКУДА СПРОС, 31.10.2026. Путь к файлу спроса был вписан как
// /tmp/claude-501/demand.json — временный каталог другой машины, которого нет нигде и
// никогда не будет. Сторож падал ENOENT ВСЕГДА: красный по построению, то есть хуже
// отсутствующего — к вечному красному привыкают, и настоящая просрочка в нём тонет.
//
// Теперь спрос берётся оттуда, откуда его берёт сам сайт: airportsByDemand() из
// scripts/seo-priority.mjs — посадочные страницы из Метрики, только органика. Это
// единственный честный источник приоритета в этом проекте (см. CLAUDE.md), и он уже
// отфильтрован от фермы обходчиков. Файл по-прежнему можно передать аргументом:
// выгрузка Вебмастера меряет ПОКАЗЫ, а не визиты, и это другой, тоже полезный срез.
// Нет ни файла, ни токена — отказ измерять вслух, а не провал.
//
// Usage:  node scripts/check-freshness-by-demand.mjs [base] [путь-к-demand.json]

import fs from 'node:fs';
import { airportsByDemand } from './seo-priority.mjs';

const BASE = process.argv[2] || 'https://airportsboard.live';
const DEMAND = process.argv[3] || process.env.DEMAND_JSON || '';

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const svcRaw = read('data/airport-service.json');
const levels = svcRaw.airports ?? svcRaw;
const rawAir = read('data/airports.json');
const airports = new Map((rawAir.airports ?? rawAir).map((a) => [a.iata, a]));

/** Ярусы прогрева — копия из lib/warm.ts; расхождение здесь означало бы, что меряем не то. */
const TIERS = [[400, 6], [150, 12], [40, 24], [10, 24], [1, 24]];
const PINNED = new Set(['AER', 'MRV', 'SUI', 'KZN', 'GYD', 'TAS', 'HOR', 'AYT', 'SVX', 'LWN', 'PES', 'CAN']);
const targetHours = (iata) => {
  const n = Number(levels[iata]) || 0;
  const base = TIERS.find(([min]) => n >= min)?.[1] ?? 24;
  return PINNED.has(iata) ? Math.min(base, 6) : base;
};

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
const text = (h) => strip(h).replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** «Обновлено 16 ч назад» / «2 дн. назад» / «5 мин назад» → часы. */
function ageHours(t) {
  let m = t.match(/Обновлено\s+(\d+)\s*мин/);
  if (m) return Number(m[1]) / 60;
  m = t.match(/Обновлено\s+(\d+)\s*ч/);
  if (m) return Number(m[1]);
  m = t.match(/Обновлено\s+(\d+)\s*дн/);
  if (m) return Number(m[1]) * 24;
  if (/Обновлено\s+только что|сейчас/.test(t)) return 0;
  return null;
}

/**
 * Сколько строк борта ещё НЕ улетело.
 *
 * Время на борту показано в поясе аэропорта, поэтому и «сейчас» берётся в нём же. Строки
 * читаются из отданного HTML: это ровно то, что видит человек до того, как отработает
 * клиентский опрос, и то, что видит поисковый робот всегда.
 */
function upcomingRows(html, tz) {
  const rows = [...strip(html).matchAll(/\b([0-2]\d):([0-5]\d)\b/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
  if (!rows.length) return { rows: 0, upcoming: 0 };
  let nowMin;
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date());
    nowMin = Number(p.find((x) => x.type === 'hour').value) * 60 + Number(p.find((x) => x.type === 'minute').value);
  } catch { nowMin = new Date().getUTCHours() * 60 + new Date().getUTCMinutes(); }
  // Окно суток замкнутое: рейс в 00:20 при «сейчас» 23:50 — предстоящий, а не двадцатичасовой давности.
  const upcoming = rows.filter((r) => {
    const d = (r - nowMin + 1440) % 1440;
    return d < 720;
  }).length;
  return { rows: rows.length, upcoming };
}

const { shows, source } = await (async () => {
  if (DEMAND) return { shows: read(DEMAND).shows, source: `выгрузка ${DEMAND}` };
  const byVisits = await airportsByDemand(30);
  return byVisits.length
    ? {
      shows: Object.fromEntries(byVisits.map((a) => [a.code, a.visits])),
      source: 'Метрика: визиты из органики за 30 дней',
    }
    : { shows: null, source: null };
})();
if (!shows) {
  console.log('НЕ ИЗМЕРЕНО: спрос взять негде — токена Метрики нет (~/.env.yandex-metrika),'
    + ' выгрузка не передана. Взвешивать возраст бортов без спроса нечем:'
    + ` node scripts/check-freshness-by-demand.mjs ${BASE} путь-к-demand.json`);
  process.exit(0);
}
const demand = { shows };
const ranked = Object.entries(demand.shows).sort((a, b) => b[1] - a[1]).slice(0, 25);
const totalShows = Object.values(demand.shows).reduce((a, b) => a + b, 0);

console.log(`возраст данных на страницах, взвешенно по спросу (${BASE})`);
console.log(`источник спроса: ${source}\n`);
console.log(`${'код'.padEnd(5)}${'показы'.padStart(8)}${'доля'.padStart(7)}${'ярус'.padStart(7)}${'цель'.padStart(6)}${'возраст'.padStart(9)}  борт`);

let staleShows = 0, uselessShows = 0, measured = 0;
const problems = [];

for (const [iata, shows] of ranked) {
  let html;
  try {
    const r = await fetch(`${BASE}/ru/airport/${iata}`, { headers: { 'user-agent': 'audit-bot' } });
    html = await r.text();
  } catch { problems.push(`${iata}: страница не ответила`); continue; }

  const t = text(html);
  const age = ageHours(t);
  const target = targetHours(iata);
  const { rows, upcoming } = upcomingRows(html, airports.get(iata)?.tz);
  measured++;

  const overdue = age != null && age > target;
  const useless = rows > 0 && upcoming === 0;
  if (overdue) staleShows += shows;
  if (useless) uselessShows += shows;

  const share = (100 * shows / totalShows).toFixed(1);
  // Возраст приходит в ЧАСАХ и бывает дробным: борт, обновлённый двадцать минут назад, давал
  // «0.3333333333333333 ч» и разъезжал всю таблицу. Минуты — не косметика: для закреплённых
  // аэропортов норматив шесть часов, и разница между «20 мин» и «0 ч» это и есть измерение.
  const ageStr = age == null ? '—'
    : age >= 24 ? `${(age / 24).toFixed(1)} дн`
      : age < 1 ? `${Math.round(age * 60)} мин`
        : `${age.toFixed(1)} ч`;
  const board = rows === 0 ? 'пусто' : `${upcoming} из ${rows} впереди`;
  const flag = overdue ? '  ⚠ просрочен' : useless ? '  ⚠ весь в прошлом' : '';
  console.log(`${iata.padEnd(5)}${String(shows).padStart(8)}${(share + '%').padStart(7)}${(PINNED.has(iata) ? 'закр.' : '').padStart(7)}${(target + 'ч').padStart(6)}${ageStr.padStart(9)}  ${board}${flag}`);
}

console.log(`\nизмерено страниц: ${measured} из ${ranked.length}`);
console.log(`доля спроса на просроченных бортах: ${(100 * staleShows / totalShows).toFixed(1)}% (${staleShows} показов)`);
console.log(`доля спроса на бортах, где всё уже улетело: ${(100 * uselessShows / totalShows).toFixed(1)}% (${uselessShows} показов)`);
for (const p of problems) console.log(`  ! ${p}`);
