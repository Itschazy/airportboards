// Коды ответа на пробы, которых на сайте нет.
//
// Проверка появилась после того, как Google Search Console показал флаг «Server connectivity
// — высокий процент отказов за неделю», и причина нашлась не в сервере, а в маршрутизации:
// сайт отдавал HTTP 500 вместо 404 на ЛЮБОЙ путь с точкой.
//
//     /apple-touch-icon.png   500      /site.webmanifest     500
//     /browserconfig.xml      500      /wp-login.php         500
//     /foo.bar/airports       500      /foo.bar/airport/JFK  500
//
// Механика. Матчер middleware намеренно пропускает пути с точкой (`.*\..*`), чтобы не
// префиксовать локалью метаданные вроде /favicon.ico. Такой путь доходит до маршрутизатора,
// совпадает с `/[locale]`, и локалью становится сама строка «apple-touch-icon.png». Проверка
// в layout есть, но layout и page рисуются ПАРАЛЛЕЛЬНО, и Number.toLocaleString на главной
// успевает бросить RangeError раньше, чем сработает notFound().
//
// Почему это дороже, чем выглядит. Перечисленные пути запрашивают не люди, а машины: iOS
// тянет apple-touch-icon, Windows — browserconfig.xml, сканеры — wp-login.php. Каждый ответ
// 5xx поисковик засчитывает как отказ ХОСТА и снижает темп обхода всего сайта. На домене,
// у которого проиндексирована шестая часть, это прямая потеря.
//
// Проверяются обе стороны: несуществующее обязано быть 404, а живое — 200. Вторая половина
// не для симметрии: первая попытка починки (`dynamicParams = false` в layout) дала правильные
// 404 и одновременно КАСКАДОМ убила вложенные сегменты — /ru/airport/AAF стал 404, и даже
// /ru/airport/KZN/arrivals, подстраница самой посещаемой страницы сайта. Проверка, которая
// смотрела бы только на пробы, эту катастрофу пропустила бы и отрапортовала успех.
//
// Usage:  node scripts/check-status-codes.mjs [base]

const BASE = process.argv[2] || 'http://localhost:3002';

/** Пробы, которых на сайте нет. Ждём 404, категорически не 5xx. */
const ABSENT = [
  ['/apple-touch-icon.png', 'просит iOS при добавлении на экран'],
  ['/site.webmanifest', 'просят браузеры по привычке'],
  ['/browserconfig.xml', 'просит Windows'],
  ['/wp-login.php', 'типовая проба сканеров'],
  ['/index.html', 'типовая проба'],
  ['/a.b', 'минимальный путь с точкой'],
  ['/foo.bar/airports', 'точка в первом сегменте, дальше живой путь'],
  ['/foo.bar/airport/JFK', 'то же на два сегмента глубже'],
  ['/zz', 'неверная локаль без точки — её ловит middleware'],
];

/** Живое. Ждём 200 — половина проверки, без которой она бесполезна. */
const ALIVE = [
  ['/ru/airport/SVO', 'борт из верхнего яруса'],
  ['/ru/airport/AAF', 'борт ВНЕ generateStaticParams — его убивал каскадный вариант починки'],
  ['/en/airport/AAO', 'то же в другой локали'],
  ['/ru/airport/KZN/arrivals', 'подстраница самой посещаемой страницы'],
  ['/ru/airport/AER/departures', 'подстраница с живым поисковым трафиком'],
  ['/ru/airports', 'каталог'],
  ['/ru/az/a', 'буквенный указатель'],
  ['/hi/city/moscow', 'город в дальней локали'],
  ['/ru/route/SVO-LED', 'маршрут'],
  ['/ar', 'локальная главная, RTL'],
  ['/favicon.ico', 'путь с точкой, который СУЩЕСТВУЕТ'],
  ['/sitemap.xml', 'то же'],
  ['/robots.txt', 'то же'],
  ['/llms.txt', 'то же'],
  ['/ads.txt', 'то же'],
];

let fails = 0;
const code = async (url) => {
  try {
    const r = await fetch(`${BASE}${url}`, { headers: { 'user-agent': 'audit-bot' }, redirect: 'manual' });
    return r.status;
  } catch (e) { return `ошибка: ${e.message}`; }
};

console.log(`коды ответа (${BASE})\n`);
console.log('несуществующее — обязано быть 404, ни в коем случае не 5xx:\n');
for (const [url, why] of ABSENT) {
  const c = await code(url);
  // 404 или редирект (middleware уводит неверную локаль без точки) — оба приемлемы.
  const ok = c === 404 || (typeof c === 'number' && c >= 300 && c < 400);
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${String(c).padEnd(4)} ${url.padEnd(24)} ${ok ? why : 'ОТКАЗ ХОСТА — тормозит обход всего сайта'}`);
}

console.log('\nживое — обязано быть 200:\n');
for (const [url, why] of ALIVE) {
  const c = await code(url);
  const ok = c === 200;
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${String(c).padEnd(4)} ${url.padEnd(28)} ${why}`);
}

console.log(fails
  ? `\nПРОВАЛОВ: ${fails}`
  : '\nпробы отдают 404, живое отдаёт 200');
process.exit(fails ? 1 : 0);
