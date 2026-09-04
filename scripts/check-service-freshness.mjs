// Не устарел ли ЗАМЕР ОБСЛУЖИВАНИЯ — файл, на котором держится половина сайта.
//
// data/airport-service.json отвечает на вопрос «сколько рейсов в сутки у этого кода», и от
// этого ответа зависит почти всё: ярус прогрева (TIERS), попадание страницы в карту сайта
// (hasNoService), заявление подстраницы прилётов, текст в описании и в FAQ. Файл собирается
// вручную запуском scripts/discover-schedules.mjs, который стоит 6 069 обращений к провайдеру —
// около 6% месячного плана, — и именно поэтому его запускают редко и легко забывают.
//
// ЧЕМ ЭТО ПЛОХО. Расписания сезонные. Замер 19.07 застал лето: Безье, Сен-Мартен, Мар-дель-Плата
// и десятки подобных полос были «обслуживаемыми». К концу августа сезон кончился, провайдер по
// ним отдаёт пусто, а файл по-прежнему утверждает, что рейсы есть. Следствия расходятся веером:
// прогрев тратит на них запросы, карта сайта их рекламирует, страница обещает борт, которого
// нет. Замер 31.08: около 420 из 2 801 обслуживаемых аэропортов показывают пустой борт, все в
// младшем ярусе.
//
// Само по себе это дёшево — те же 420 страниц дали ОДИН визит за август, 0.01% трафика. Опасно
// не это, а тишина: файл дрейфует, и заметить дрейф можно только специально его измерив.
//
// Проверка делает ровно два утверждения:
//
//   1. Файл не старше MAX_AGE_DAYS. Порог не догма, а срок, после которого сезон успевает
//      смениться и цифрам нельзя верить без пересмотра.
//   2. Доля обслуживаемых аэропортов с ПУСТЫМ бортом не выше EMPTY_BUDGET. Это прямой замер
//      расхождения между тем, что файл обещает, и тем, что провайдер отдаёт. Порог задан с
//      запасом: у младшего яруса борт законно пуст часть суток (собственный замер сайта даёт
//      71% пустых при 1–2 рейсах в день), поэтому ловится систематический разрыв, а не рябь.
//
// ⚠️ ТОЛЬКО ПРОТИВ ПРОДА. Второе утверждение меряет содержимое хранилища бортов, а локальная
// сборка поднимается на ФИКСТУРЕ в два десятка ключей — там пусты все 2 818 обслуживаемых, то
// есть 100% при пороге 25%. Это не находка, а свойство стенда: проверка сообщала бы о дрейфе
// файла там, где нечему дрейфовать. Против localhost она теперь отказывается измерять вслух,
// а не краснеет молча — ровно как check-warm-demand без токена Метрики.
//
// Обращений к провайдеру НОЛЬ: страницы читаются под audit-bot, то есть из хранилища.
//
// Usage:  node scripts/check-service-freshness.mjs [base]

import fs from 'node:fs';

const BASE = process.argv[2] || 'https://airportsboard.live';
const MAX_AGE_DAYS = 60;
/** Доля обслуживаемых аэропортов с пустым бортом, выше которой файл считается разошедшимся. */
const EMPTY_BUDGET = 0.25;
const PER_TIER = { mega: 12, hub: 12, major: 20, mid: 25, small: 45 };

let fails = 0;
/**
 * Стенд не может ответить на вопрос этой проверки: у него фикстурное хранилище бортов.
 * Первое утверждение (возраст файла) от адреса не зависит и проверяется в любом случае.
 */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(BASE);
const say = (ok, msg) => { if (!ok) fails++; console.log(`  ${ok ? '✓' : '✗'} ${msg}`); };

console.log(`свежесть замера обслуживания (${BASE})\n`);

const raw = JSON.parse(fs.readFileSync('data/airport-service.json', 'utf8'));
const LEVEL = raw.airports ?? raw;
const generated = raw.generated ?? null;

// ── 1. Возраст файла ─────────────────────────────────────────────────────────────────────
if (!generated) {
  say(false, 'в файле нет поля generated — возраст замера неизвестен');
} else {
  const ageDays = Math.round((Date.now() - Date.parse(generated)) / 86400_000);
  say(ageDays <= MAX_AGE_DAYS,
    `замер от ${generated}, возраст ${ageDays} дн (порог ${MAX_AGE_DAYS})`
    + (ageDays > MAX_AGE_DAYS ? ' — пора перезапустить scripts/discover-schedules.mjs' : ''));
}

// ── 2. Расхождение с тем, что реально отдаётся ───────────────────────────────────────────
const TIERS = [['mega', 400], ['hub', 150], ['major', 40], ['mid', 10], ['small', 1]];
const tierOf = (n) => TIERS.find(([, m]) => n >= m)?.[0] ?? null;

const byTier = {};
for (const [code, n] of Object.entries(LEVEL)) {
  const t = tierOf(n ?? 0);
  if (t) (byTier[t] ||= []).push(code);
}

if (LOCAL) {
  console.log('  · адрес локальный — второе утверждение пропущено: борта на стенде фикстурные');
  console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nвозраст замера в порядке; расхождение меряется только против прода');
  process.exit(fails ? 1 : 0);
}

const sample = [];
for (const [t, list] of Object.entries(byTier)) {
  const want = PER_TIER[t] ?? 20;
  const step = Math.max(1, Math.floor(list.length / want));
  for (let i = 0, k = 0; i < list.length && k < want; i += step, k++) sample.push([list[i], t]);
}

/** Строка рейса в разметке. Считаем по РАЗМЕТКЕ, а не по счётчику на странице: счётчик — текст,
 *  а текст уже один раз соврал (в JS `\w` не покрывает кириллицу, и «вылетов» не совпадало). */
const ROWS = /<div role="button"[^>]*aria-label="[^"]*\d{2}:\d{2}/g;

const seen = [];
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < sample.length) {
    const [code, t] = sample[i++];
    try {
      const html = await (await fetch(`${BASE}/ru/airport/${code}`, { headers: { 'user-agent': 'audit-bot' } })).text();
      seen.push({ code, t, svc: LEVEL[code] ?? 0, rows: (html.match(ROWS) || []).length });
    } catch { /* страница не ответила — не предмет этой проверки */ }
  }
}));

say(seen.length >= sample.length * 0.8, `снято страниц: ${seen.length} из ${sample.length}`);
if (!seen.length) {
  console.log('\nнечего измерять');
  process.exit(fails ? 1 : 0);
}

// Взвешиваем по РАЗМЕРУ ЯРУСА, а не по выборке: младший ярус — 62% обслуживаемых, и
// равномерная выборка занизила бы его вклад втрое.
let corpus = 0, emptyEst = 0;
console.log('\n  ярус     n   пустых');
for (const [t] of TIERS) {
  const g = seen.filter((x) => x.t === t);
  if (!g.length) continue;
  const share = g.filter((x) => x.rows === 0).length / g.length;
  corpus += byTier[t].length;
  emptyEst += byTier[t].length * share;
  console.log(`  ${t.padEnd(8)}${String(g.length).padStart(3)}${(100 * share).toFixed(0).padStart(8)}%`);
}
const ratio = emptyEst / Math.max(corpus, 1);
say(ratio <= EMPTY_BUDGET,
  `обслуживаемых без борта ~${Math.round(emptyEst)} из ${corpus} (${(100 * ratio).toFixed(0)}%, порог ${(100 * EMPTY_BUDGET).toFixed(0)}%)`);

console.log(fails ? `\nПРОВАЛОВ: ${fails}` : '\nзамер обслуживания не разошёлся с тем, что отдаётся');
process.exit(fails ? 1 : 0);
