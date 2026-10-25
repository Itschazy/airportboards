// Кто из обходчиков ходит на сайт, куда и что получает — по access-логу nginx.
//
// ЗАЧЕМ (25.10.2026). Search Console по этому сайту через API не отдаётся ничего, Вебмастер
// временами лежит, а ИИ-поисковики своих отчётов не дают вовсе. Единственный первичный
// источник о поведении обходчиков — наш собственный лог. Первый же разбор показал вещи,
// которых ни один кабинет не показал бы:
//
//   · ChatGPT-User — это ЖИВЫЕ пользователи ChatGPT, за которых модель забирает страницу, —
//     ~490 обращений в сутки, почти все на английские /en/airport/XXX (RUH, CJU, EBL, BGW).
//     То есть ChatGPT уже использует сайт, но не по русскому рынку, где мы его меряли;
//   · OAI-SearchBot ~17 тыс. в сутки, PerplexityBot ~3 тыс., bingbot ~85 тыс.;
//   · DataForSeoBot и QlyzeBot — по ~20 тыс. в сутки каждый, это сборщики баз для чужих
//     SEO-сервисов: читателей они не приводят, а нагрузку на единственный VDS дают.
//
// Что отчёт НЕ доказывает: строка user-agent — заявление, а не личность; проверки IP здесь
// нет. И «бот скачал страницу» не значит ни «проиндексировал», ни «процитировал».
//
// Денег отчёт не тратит: читает файл лога и SSG-карту сайта с localhost.
//
// Usage (на боксе, от root — лог читается группой adm, а deploy в неё не входит):
//   node scripts/bot-log-report.mjs [/var/log/nginx/access.log.1] [--sitemap http://127.0.0.1:3000]
// Файл может быть .gz. По умолчанию — вчерашний, ротированный в полночь, то есть полные сутки.

import fs from 'node:fs';
import zlib from 'node:zlib';
import readline from 'node:readline';

const args = process.argv.slice(2);
const FILE = args.find(a => !a.startsWith('--')) || '/var/log/nginx/access.log.1';
const smIdx = args.indexOf('--sitemap');
const SITEMAP_BASE = smIdx >= 0 ? args[smIdx + 1] : 'http://127.0.0.1:3000';

// Порядок важен: первое совпадение побеждает. «Пользовательские» выборки ИИ (ChatGPT-User,
// Perplexity-User, Claude-User) отдельно от индексирующих ботов — у них разный смысл.
const BOTS = [
  ['ChatGPT-User', 'ИИ: по запросу', /ChatGPT-User/i],
  ['OAI-SearchBot', 'ИИ: индекс', /OAI-SearchBot/i],
  ['GPTBot', 'ИИ: обучение', /GPTBot/i],
  ['Perplexity-User', 'ИИ: по запросу', /Perplexity-User/i],
  ['PerplexityBot', 'ИИ: индекс', /PerplexityBot/i],
  ['Claude-User', 'ИИ: по запросу', /Claude-User/i],
  ['Claude-SearchBot', 'ИИ: индекс', /Claude-SearchBot/i],
  ['ClaudeBot', 'ИИ: обучение', /ClaudeBot/i],
  ['MistralAI-User', 'ИИ: по запросу', /MistralAI-User/i],
  ['DuckAssistBot', 'ИИ: по запросу', /DuckAssistBot/i],
  ['meta-externalagent', 'ИИ: обучение', /meta-external/i],
  ['Bytespider', 'ИИ: обучение', /Bytespider/i],
  ['CCBot', 'ИИ: обучение', /CCBot/i],
  ['Amazonbot', 'ИИ: индекс', /Amazonbot/i],
  ['ExaSearchBot', 'ИИ: индекс', /ExaSearchBot|ExaUser/i],
  ['YouBot', 'ИИ: индекс', /YouBot/i],
  ['Reflectionbot', 'ИИ: обучение', /Reflectionbot/i],
  ['ShapBot', 'прочие боты', /ShapBot/i],
  ['Applebot', 'поиск', /Applebot/i],
  ['YandexBot', 'поиск', /YandexBot|YandexMobileBot/i],
  ['Yandex (прочие)', 'поиск', /Yandex[A-Za-z]*Bot|YandexRenderResourcesBot/i],
  ['Googlebot', 'поиск', /Googlebot/i],
  ['Google (прочие)', 'поиск', /Google-InspectionTool|GoogleOther|Mediapartners-Google|AdsBot-Google/i],
  ['bingbot', 'поиск', /bingbot/i],
  ['DataForSeoBot', 'SEO-сервисы', /DataForSeoBot/i],
  ['QlyzeBot', 'SEO-сервисы', /QlyzeBot/i],
  ['AhrefsBot', 'SEO-сервисы', /AhrefsBot/i],
  ['SemrushBot', 'SEO-сервисы', /SemrushBot/i],
  ['DotBot', 'SEO-сервисы', /DotBot/i],
  ['MJ12bot', 'SEO-сервисы', /MJ12bot/i],
  ['BLEXBot', 'SEO-сервисы', /BLEXBot/i],
  ['SERankingBot', 'SEO-сервисы', /SERanking/i],
  ['PetalBot', 'поиск', /PetalBot/i],
  ['audit-bot (наш)', 'свои', /audit-bot/],
  ['прочие боты', 'прочие боты', /bot|crawl|spider|slurp/i],
];

// Класс адреса: то, о чём вообще можно спрашивать «нужно ли боту сюда».
function urlClass(path) {
  const p = path.split('?')[0];
  if (p.startsWith('/api/')) return 'api';
  if (p.startsWith('/_next/')) return '_next';
  if (/^\/sitemap/.test(p)) return 'sitemap';
  if (p === '/robots.txt' || p === '/llms.txt') return p.slice(1);
  const m = /^\/([a-z]{2})(\/([a-z-]+))?/.exec(p);
  if (!m) return p === '/' ? 'root' : 'прочее';
  const kind = m[3] || 'home';
  if (kind === 'airport') return /\/(arrivals|departures)\b/.test(p) ? 'airport/sub' : 'airport';
  return kind;
}

// combined: ip - - [time] "METHOD path HTTP/x" status bytes "ref" "ua"
const LINE = /^(\S+) \S+ \S+ \[[^\]]+\] "(\S+) (\S+) [^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"/;

async function loadSitemap() {
  const urls = new Set();
  try {
    const idx = await (await fetch(`${SITEMAP_BASE}/sitemap.xml`, { headers: { 'user-agent': 'audit-bot' } })).text();
    const subs = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    for (const s of subs) {
      const local = s.replace(/^https?:\/\/[^/]+/, SITEMAP_BASE);
      const xml = await (await fetch(local, { headers: { 'user-agent': 'audit-bot' } })).text();
      for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].replace(/^https?:\/\/[^/]+/, ''));
    }
  } catch (e) {
    console.error(`карта сайта недоступна (${e.message}) — доля «в карте» не считается`);
  }
  return urls;
}

const sitemap = await loadSitemap();
const stream = fs.createReadStream(FILE).pipe(FILE.endsWith('.gz') ? zlib.createGunzip() : new (await import('node:stream')).PassThrough());
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const stats = new Map(); // bot -> {group, hits, status{}, cls{}, inMap, pages, locales{}, top{}}
let total = 0, unparsed = 0;
for await (const line of rl) {
  total++;
  const m = LINE.exec(line);
  if (!m) { unparsed++; continue; }
  const [, , , path, status, ua] = m;
  const bot = BOTS.find(([, , re]) => re.test(ua));
  if (!bot) continue;
  const [name, group] = bot;
  let s = stats.get(name);
  if (!s) stats.set(name, s = { group, hits: 0, status: {}, cls: {}, inMap: 0, pages: 0, locales: {}, top: {} });
  s.hits++;
  const sc = status[0] + 'xx';
  s.status[sc] = (s.status[sc] || 0) + 1;
  const c = urlClass(path);
  s.cls[c] = (s.cls[c] || 0) + 1;
  const clean = path.split('?')[0];
  if (/^\/[a-z]{2}(\/|$)/.test(clean) && !clean.startsWith('/api/')) {
    s.pages++;
    if (sitemap.has(clean)) s.inMap++;
    const loc = clean.slice(1, 3);
    s.locales[loc] = (s.locales[loc] || 0) + 1;
    if (c === 'airport') s.top[clean] = (s.top[clean] || 0) + 1;
  }
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const topN = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

console.log(`обходчики по ${FILE}: строк ${total}${unparsed ? `, не разобрано ${unparsed}` : ''}; в карте сайта ${sitemap.size} адресов\n`);
const rows = [...stats.entries()].sort((a, b) => b[1].hits - a[1].hits);
for (const group of ['поиск', 'ИИ: индекс', 'ИИ: по запросу', 'ИИ: обучение', 'SEO-сервисы', 'прочие боты', 'свои']) {
  const g = rows.filter(([, s]) => s.group === group);
  if (!g.length) continue;
  console.log(`── ${group}`);
  for (const [name, s] of g) {
    const codes = topN(s.status, 4).map(([k, v]) => `${k} ${pct(v, s.hits)}`).join(' ');
    const cls = topN(s.cls, 4).map(([k, v]) => `${k} ${v}`).join(', ');
    const locs = topN(s.locales, 3).map(([k, v]) => `${k} ${pct(v, s.pages)}`).join(' ');
    console.log(`  ${name.padEnd(18)} ${String(s.hits).padStart(7)}  ${codes}`);
    console.log(`  ${''.padEnd(18)} куда: ${cls}`);
    if (s.pages) console.log(`  ${''.padEnd(18)} страниц ${s.pages}, из них в карте ${pct(s.inMap, s.pages)}; языки: ${locs}`);
    if (group === 'ИИ: по запросу' && s.pages) console.log(`  ${''.padEnd(18)} чаще всего: ${topN(s.top, 6).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  }
}

// Единственное, что здесь годится в тревогу без участия человека: поисковый бот получает
// пятисотые — это прямой удар по готовности обходить сайт.
const bad = rows.filter(([, s]) => s.group === 'поиск' && s.hits >= 200 && (s.status['5xx'] || 0) / s.hits > 0.02);
if (bad.length) {
  console.log(`\n✗ поисковые боты получают 5xx больше 2%: ${bad.map(([n, s]) => `${n} ${pct(s.status['5xx'], s.hits)}`).join(', ')}`);
  process.exit(1);
}
