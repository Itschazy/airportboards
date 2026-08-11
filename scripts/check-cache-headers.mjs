// Заголовки кэша: что именно сайт разрешает браузеру и общему кэшу держать у себя.
//
// Проверка появилась после замера, показавшего три разные ошибки сразу, ни одна из которых
// себя не проявляла:
//
//   1. `/ru` и `/ru/az/a` отдавались с `s-maxage=31536000` — ГОД. Next выводит это число сам
//      для статической страницы без revalidate. Пока общего кэша перед сайтом нет, оно не
//      значит ничего, поэтому и не замечалось; в день, когда встанет CDN, эти страницы
//      замёрзнут в том виде, в каком их однажды забрали.
//   2. `max-age` не было НИ НА ОДНОЙ HTML-странице — Next печатает только s-maxage. Значит
//      браузерного кэша не существовало вовсе, и «назад» стоил полной дороги до сервера:
//      из Москвы ~0.65 с, из Токио ~1.8 с. Условный запрос тут не спасает — 304 экономит
//      трафик, но не расстояние.
//   3. Корневой «/» не имел ни Cache-Control, ни Vary, хотя next-intl отвечает на него
//      по-разному в зависимости от Accept-Language: общий кэш запомнил бы редирект первого
//      зашедшего и раздал бы его всем.
//
// Первая и третья — не про сегодняшнюю скорость, а про то, что их нельзя чинить ПОСЛЕ
// установки CDN: к тому моменту неверные страницы уже разъедутся по точкам присутствия.
//
// Usage:  node scripts/check-cache-headers.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';

/** Потолок s-maxage для HTML. Сутки — это уже щедро; год означает «навсегда». */
const MAX_SHARED = 86400;

/**
 * Потолок браузерного кэша для страниц с живыми данными. На борту рейсы и подпись
 * «Обновлено N назад» — минута это ровно то, на сколько ему позволено отстать.
 */
const MAX_BROWSER_LIVE = 60;

/** Потолок для страниц без живых данных: списки меняются вместе с корпусом аэропортов. */
const MAX_BROWSER_STATIC = 3600;

const CASES = [
  { url: '/', kind: 'redirect-varying' },
  { url: '/ru', kind: 'static' },
  { url: '/en', kind: 'static' },
  { url: '/ru/airports', kind: 'static' },
  { url: '/ru/az/a', kind: 'static' },
  { url: '/ru/city/moscow', kind: 'static' },
  { url: '/ru/airport/SVO', kind: 'live' },
  { url: '/ar/airport/DXB', kind: 'live' },
  { url: '/favicon.ico', kind: 'icon' },
];

const num = (cc, key) => {
  const m = new RegExp(`(?:^|[,\\s])${key}=(\\d+)`).exec(cc || '');
  return m ? Number(m[1]) : null;
};

let fails = 0;
const say = (ok, url, msg) => {
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${url.padEnd(22)} ${msg}`);
};

console.log(`заголовки кэша (${BASE})\n`);

for (const { url, kind } of CASES) {
  let res;
  try {
    res = await fetch(`${BASE}${url}`, { headers: { 'user-agent': 'audit-bot' }, redirect: 'manual' });
  } catch (e) {
    say(false, url, `не ответил: ${e.message}`);
    continue;
  }

  const cc = res.headers.get('cache-control') || '';
  const vary = res.headers.get('vary') || '';
  const shared = num(cc, 's-maxage');
  const browser = num(cc, 'max-age');

  if (kind === 'redirect-varying') {
    // Либо не кэшируем вовсе, либо честно объявляем, от чего зависит ответ.
    const safe = /no-store|private/.test(cc) || /accept-language/i.test(vary);
    say(safe, url, safe
      ? `ответ зависит от языка и это объявлено (${cc || vary})`
      : `ОТВЕТ ЗАВИСИТ ОТ Accept-Language, но кэш об этом не знает: cc="${cc}" vary="${vary}"`);
    continue;
  }

  if (kind === 'icon') {
    const len = Number(res.headers.get('content-length')) || (await res.arrayBuffer()).byteLength;
    say(len < 4096, url, `${len} Б${len < 4096 ? '' : ' — СЛИШКОМ ТЯЖЁЛАЯ, качается на каждый показ страницы'}`);
    say(browser != null && browser > 0, url, browser ? `браузер держит ${browser} с` : 'браузерного кэша НЕТ');
    continue;
  }

  const cap = kind === 'live' ? MAX_BROWSER_LIVE : MAX_BROWSER_STATIC;

  say(browser != null && browser > 0 && browser <= cap, url,
    browser == null ? 'max-age НЕТ — браузер не кэширует, каждый возврат стоит полной дороги'
      : browser > cap ? `max-age=${browser} > ${cap} — данные успеют устареть`
        : `браузер держит ${browser} с`);

  say(shared == null || shared <= MAX_SHARED, url,
    shared == null ? 's-maxage не задан' :
      shared > MAX_SHARED ? `s-maxage=${shared} (${(shared / 86400).toFixed(0)} сут) — общий кэш заморозит страницу`
        : `общий кэш держит ${shared} с`);
}

console.log(`\n${fails ? `ПРОВАЛОВ: ${fails}` : 'все проверки пройдены'}`);
process.exit(fails ? 1 : 0);
