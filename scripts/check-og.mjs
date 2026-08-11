// Every social card, in every locale, must actually render.
//
// Written after all 13 event cards returned 500 on /ar and 200 on the other eleven locales.
// Satori — the renderer behind next/og — ships no Arabic font, and a missing script does not
// degrade to blank glyphs there, it throws. At 500 the social platform shows a bare link with
// no card at all, so the failure is invisible in the app and total on the platform.
//
// The airport cards never hit it because they render only the IATA code and the domain, both
// Latin. That is exactly why this check walks BOTH kinds: a card that ignores locale proves
// nothing about one that does not.
//
// Usage:  node scripts/check-og.mjs [base-url]     (default http://localhost:3002)

const BASE = process.argv[2] || 'http://localhost:3002';
const LOCALES = ['en', 'ru', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];
const AIRPORTS = ['KZN', 'LHR', 'DXB'];

const head = async (url) => {
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'og-check' } });
    return { status: r.status, type: r.headers.get('content-type') || '' };
  } catch (e) { return { status: 0, type: e.message }; }
};

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };

// Discover the events from the index rather than hard-coding them, so a new event is covered
// the day it ships.
let slugs = [];
try {
  const html = await (await fetch(`${BASE}/en/events`, { headers: { 'user-agent': 'og-check' } })).text();
  slugs = [...new Set([...html.matchAll(/\/event\/([a-z0-9-]+)/g)].map((m) => m[1]))];
} catch { /* handled below */ }
if (!slugs.length) fail('не удалось получить список событий с /en/events');

const check = async (label, path) => {
  const bad = [];
  for (const locale of LOCALES) {
    const { status, type } = await head(`${BASE}/${locale}${path}`);
    if (status !== 200) bad.push(`${locale}:${status}`);
    else if (!type.startsWith('image/')) bad.push(`${locale}:${type}`);
  }
  bad.length ? fail(`${label} — ${bad.join(' ')}`) : console.log(`  ✓ ${label}: 12/12`);
};

for (const slug of slugs) await check(`событие ${slug}`, `/event/${slug}/opengraph-image`);
for (const iata of AIRPORTS) await check(`аэропорт ${iata}`, `/airport/${iata}/opengraph-image`);
// The site-wide card lives at the ROOT, not under a locale segment (app/opengraph-image.tsx),
// so it is one URL shared by all twelve languages — checking it per locale returns 404 and says
// nothing. It renders Latin only, which is why it never hit the Arabic failure.
{
  const { status, type } = await head(`${BASE}/opengraph-image`);
  status === 200 && type.startsWith('image/')
    ? console.log('  ✓ общая карточка сайта: 200')
    : fail(`общая карточка сайта — ${status} ${type}`);
}

console.log(failures ? `\n${failures} карточек не рендерятся` : '\nвсе социальные карточки рендерятся на 12 языках');
process.exit(failures ? 1 : 0);
