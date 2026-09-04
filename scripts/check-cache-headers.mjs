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
 * Табло НЕ КЭШИРУЕТСЯ ВОВСЕ — ни у читателя, ни в общем кэше.
 *
 * Прежде тут стоял потолок в минуту, и это было верно, пока страница жила в ISR: борт всё
 * равно приходил из хранилища, и лишняя минута ничего не меняла. 04.09 страницы аэропортов
 * стали динамическими и покупают свежие данные на приходе живого читателя (lib/live-board.ts).
 * С этого момента любое разрешение кэшировать ответ отменяет саму правку: сервер честно
 * сходит к провайдеру, а следующим посетителям отдадут копию из кэша.
 *
 * Свежесть на первом экране и кэширование ответа несовместимы by construction, поэтому
 * проверка требует РОВНО ноль и отсутствие s-maxage, а не «немного».
 */
const LIVE_MUST_NOT_CACHE = true;

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
  { url: '/ru/airport/SVO/arrivals', kind: 'live' },
  { url: '/ru/airport/SVO/departures', kind: 'live' },
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

  if (kind === 'live') {
    // Ноль ровно, а не «мало»: любое ненулевое окно отдаёт следующему читателю копию.
    say(LIVE_MUST_NOT_CACHE && browser === 0, url,
      browser === 0 ? 'браузер не кэширует (max-age=0) — каждый заход спрашивает сервер'
        : `max-age=${browser ?? '—'} — табло кэшируется, живой рендер обесценен`);
    // s-maxage опаснее вдвое: общий кэш отдаёт ОДНУ копию всем сразу.
    say(shared == null, url,
      shared == null ? 's-maxage не задан — общий кэш табло не хранит'
        : `s-maxage=${shared} — общий кэш раздаст одну копию всем читателям`);
    // must-revalidate, а не no-store: no-store убил бы и возврат кнопкой «назад».
    say(/must-revalidate/.test(cc), url,
      /must-revalidate/.test(cc) ? 'must-revalidate на месте — «назад» не перерисовывает с нуля'
        : `нет must-revalidate: cc="${cc}"`);
    continue;
  }

  say(browser != null && browser > 0 && browser <= MAX_BROWSER_STATIC, url,
    browser == null ? 'max-age НЕТ — браузер не кэширует, каждый возврат стоит полной дороги'
      : browser > MAX_BROWSER_STATIC ? `max-age=${browser} > ${MAX_BROWSER_STATIC} — данные успеют устареть`
        : `браузер держит ${browser} с`);

  say(shared == null || shared <= MAX_SHARED, url,
    shared == null ? 's-maxage не задан' :
      shared > MAX_SHARED ? `s-maxage=${shared} (${(shared / 86400).toFixed(0)} сут) — общий кэш заморозит страницу`
        : `общий кэш держит ${shared} с`);
}

console.log(`\n${fails ? `ПРОВАЛОВ: ${fails}` : 'все проверки пройдены'}`);
process.exit(fails ? 1 : 0);
