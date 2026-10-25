// Граф внутренних ссылок одной локали — ТОЛЬКО по локальному серверу, никогда по проду.
//
// Вопросы (скиллы internal-linking / seo-architecture, 25.10.2026): на какой глубине от
// главной стоят страницы, на которые приходит спрос; сколько внутренних ссылок на них ведёт;
// какая часть заявленного в карте сайта вообще достижима за N кликов. Search Console этого не
// покажет, а обходить прод нельзя — страница табло сама опрашивает поставщика. Поэтому обход
// идёт по `next start` на фикстуре (см. CLAUDE.md, «Прогретое хранилище»): табло там
// фикстурное, но перелинковка та же — она из шаблонов и каталога, а не из рейсов. Исключение —
// блок «Популярные направления»: он строится по строкам табло, и на фикстуре его ссылки другие.
//
// Usage:
//   node scripts/link-graph-local.mjs [base=http://localhost:3099] [locale=ru] [maxDepth=3] [maxPages=4000]

const [BASE = 'http://localhost:3099', LOC = 'ru', MAXD = '3', MAXP = '4000'] = process.argv.slice(2);
if (!/localhost|127\.0\.0\.1/.test(BASE)) { console.error('только локальный сервер: обход прода покупает данные'); process.exit(1); }
const MAX_DEPTH = Number(MAXD), MAX_PAGES = Number(MAXP);
// Страницы, на которые приходит спрос (Метрика, визиты за 30 дней до 25.10.2026).
const TARGETS = ['HRG', 'SSH', 'AYT', 'IST', 'GYD', 'DME', 'DXB', 'LWN', 'BJV', 'OVB', 'UFA', 'KZN'].map(c => `/${LOC}/airport/${c}`);

const strip = html => html.replace(/<script[\s\S]*?<\/script>/g, '');
function links(html) {
  const out = new Set();
  for (const m of strip(html).matchAll(/href="([^"#?]+)/g)) {
    let h = m[1].replace(/^https?:\/\/(airportsboard\.live|localhost:\d+)/, '');
    if (!h.startsWith(`/${LOC}`) || h.startsWith('/api/')) continue;
    if (h.length > 1 && h.endsWith('/')) h = h.slice(0, -1);
    out.add(h);
  }
  return out;
}

const depth = new Map([[`/${LOC}`, 0]]);
const inbound = new Map();
let queue = [`/${LOC}`], fetched = 0, failed = 0;
while (queue.length && fetched < MAX_PAGES) {
  const next = [];
  for (let i = 0; i < queue.length && fetched < MAX_PAGES; i += 6) {
    const batch = queue.slice(i, i + 6);
    const pages = await Promise.all(batch.map(async p => {
      try {
        const r = await fetch(BASE + p, { headers: { 'user-agent': 'audit-bot' }, redirect: 'manual' });
        return r.ok ? [p, await r.text()] : (failed++, [p, '']);
      } catch { failed++; return [p, '']; }
    }));
    fetched += batch.length;
    for (const [from, html] of pages) {
      const d = depth.get(from);
      for (const to of links(html)) {
        if (to === from) continue;
        inbound.set(to, (inbound.get(to) || 0) + 1);
        if (!depth.has(to)) { depth.set(to, d + 1); if (d + 1 < MAX_DEPTH) next.push(to); }
      }
    }
  }
  queue = next;
}

// Карта сайта той же локали — сколько заявленного достижимо за MAX_DEPTH кликов.
const sm = new Set();
try {
  const idx = await (await fetch(`${BASE}/sitemap.xml`)).text();
  for (const s of [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, BASE))) {
    const xml = await (await fetch(s)).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = m[1].replace(/^https?:\/\/[^/]+/, '');
      if (p.startsWith(`/${LOC}/`) || p === `/${LOC}`) sm.add(p);
    }
  }
} catch { /* карты нет — пропускаем этот раздел */ }

const byDepth = {};
for (const d of depth.values()) byDepth[d] = (byDepth[d] || 0) + 1;
console.log(`обход ${BASE}/${LOC}: загружено ${fetched} страниц (ошибок ${failed}), найдено адресов ${depth.size}`);
console.log('по глубине:', Object.entries(byDepth).map(([d, n]) => `${d}: ${n}`).join(', '));
console.log('\nстраницы спроса (глубина / входящих ссылок среди загруженных):');
for (const t of TARGETS) console.log(`  ${t.padEnd(18)} ${depth.has(t) ? depth.get(t) : 'не найдена'} / ${inbound.get(t) || 0}`);
if (sm.size) {
  const reach = [...sm].filter(p => depth.has(p)).length;
  const byKind = {};
  for (const p of sm) {
    const k = (p.split('/')[2] || 'home') + (/(arrivals|departures)$/.test(p) ? '/sub' : '');
    const e = (byKind[k] ??= [0, 0]); e[0]++; if (depth.has(p)) e[1]++;
  }
  console.log(`\nкарта сайта /${LOC}: ${sm.size} адресов, достижимо за ${MAX_DEPTH} клика: ${reach} (${Math.round(100 * reach / sm.size)}%)`);
  for (const [k, [n, r]] of Object.entries(byKind).sort((a, b) => b[1][0] - a[1][0])) console.log(`  ${k.padEnd(14)} ${r}/${n}`);
}
