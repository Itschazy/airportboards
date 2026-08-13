// Квота переобхода Яндекс.Вебмастера — 150 адресов в сутки, и до 14.08 из неё не был
// израсходован ни один.
//
//     daily_quota 150 · quota_remainder 150
//
// Это единственный рычаг, который бьёт прямо в единственный живой канал: 99.7% показов сайта
// приходят из Яндекса, 98.3% визитов садятся на /ru/airport/XXX. Средняя позиция показа 8.2 —
// низ первой страницы, — и всё, что ускоряет попадание новой или изменившейся страницы в
// индекс, работает ровно там, где есть спрос.
//
// Что отправляем и в каком порядке — решает scripts/seo-priority.mjs: сначала адреса, которых
// ещё не было в карте сайта, потом страницы по измеренному спросу из Метрики. Отправленное
// запоминается в .yandex-recrawl-state.json, поэтому запуски не долбят один и тот же список,
// а прокручивают очередь.
//
// Никаких обращений к провайдеру рейсов: карта сайта и Метрика, больше ничего.
//
// Usage:  node scripts/yandex-recrawl.mjs            → потратить остаток квоты
//         node scripts/yandex-recrawl.mjs --dry      → показать очередь и не отправлять
//         node scripts/yandex-recrawl.mjs --limit 20 → потратить не больше 20

import { BASE, readEnvFile, priorityPaths, loadState, saveState } from './seo-priority.mjs';

const STATE = '.yandex-recrawl-state.json';
const USER = 712865004;
const HOST_ID = 'https:airportsboard.live:443';
const API = `https://api.webmaster.yandex.net/v4/user/${USER}/hosts/${encodeURIComponent(HOST_ID)}`;

const dry = process.argv.includes('--dry');
const limitArg = process.argv.indexOf('--limit');
const hardLimit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const env = readEnvFile('yandex-webmaster');
const TOKEN = env.YANDEX_WEBMASTER_TOKEN;
if (!TOKEN) {
  console.error('нет YANDEX_WEBMASTER_TOKEN в ~/.env.yandex-webmaster');
  process.exit(1);
}
const auth = { Authorization: `OAuth ${TOKEN}` };

// ── Сколько сегодня можно ────────────────────────────────────────────────────────────────
const quotaRes = await fetch(`${API}/recrawl/quota`, { headers: auth });
if (!quotaRes.ok) {
  console.error(`квота недоступна: HTTP ${quotaRes.status} ${await quotaRes.text()}`);
  process.exit(1);
}
const quota = await quotaRes.json();
const budget = Math.min(quota.quota_remainder ?? 0, hardLimit);
console.log(`квота: ${quota.quota_remainder}/${quota.daily_quota} в сутки → берём ${Number.isFinite(budget) ? budget : 0}`);
if (budget <= 0) { console.log('на сегодня всё выбрано'); process.exit(0); }

// ── Что именно ───────────────────────────────────────────────────────────────────────────
const state = loadState(STATE);
const known = new Set(Object.keys(state.sent));
const { paths, sitemapSize } = await priorityPaths({ known, locales: ['ru'], limit: budget });
console.log(`карта сайта: ${sitemapSize} записей | к отправке: ${paths.length}`);
if (!paths.length) { console.log('очередь пуста'); process.exit(0); }

for (const p of paths.slice(0, 8)) console.log('   ', p);
if (paths.length > 8) console.log(`    … и ещё ${paths.length - 8}`);
if (dry) { console.log('\n--dry: ничего не отправлено'); process.exit(0); }

// ── Отправка ─────────────────────────────────────────────────────────────────────────────
// Ручка принимает ОДИН адрес за запрос. Идём последовательно: параллельные запросы к этому
// API отвечают 429 и сжигают квоту впустую.
let ok = 0, fail = 0;
for (const p of paths) {
  const url = BASE + p;
  try {
    const res = await fetch(`${API}/recrawl/queue`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const body = await res.text();
    if (res.ok) {
      ok++;
      state.sent[p] = new Date().toISOString();
    } else {
      fail++;
      // Квота могла кончиться посреди прогона — тогда останавливаемся, а не долбим впустую.
      if (/quota/i.test(body)) { console.log(`  квота исчерпана на ${ok + fail}-м адресе`); break; }
      if (fail <= 3) console.log(`  ✗ ${p} → HTTP ${res.status} ${body.slice(0, 120)}`);
    }
  } catch (e) {
    fail++;
    if (fail <= 3) console.log(`  ✗ ${p} → ${e.message}`);
  }
}

state.runs = [...(state.runs ?? []), { at: new Date().toISOString(), ok, fail }].slice(-30);
saveState(STATE, state);
console.log(`\nотправлено ${ok}, отказов ${fail} | всего в состоянии: ${Object.keys(state.sent).length}`);
