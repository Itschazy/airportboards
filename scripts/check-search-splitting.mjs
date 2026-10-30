// Production build, localhost с фикстурой и пустым AIRLABS_API_KEY.
// not-found присутствует в RSC-дереве исправных страниц. Прямой импорт поиска
// незаметно возвращает его JS всем аэропортам, даже если DOM не изменился.
// Проверяем результат компилятора, а не наличие слова dynamic в исходнике.
// Учитываем и preload: отложенный script с ранним preload не экономит трафик.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

const base = new URL(process.argv[2] || 'http://localhost:3099');
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Только локальная fixture-сборка');
const cache = new Map();
async function read(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin);
  return fetch(url, { headers: { 'user-agent': 'audit-bot' } });
}
for (const [path, needsSearch, status] of [
  ['/ru/airport/AYT', false, 200],
  ['/ru/airport/AYT/arrivals', false, 200],
  ['/ar/airport/AYT', false, 200],
  ['/ru', true, 200],
]) {
  const response = await read(path);
  assert.equal(response.status, status, path);
  const html = await response.text();
  const urls = new Set();
  for (const [tag] of html.matchAll(/<(?:script|link)\b[^>]*>/g)) {
    if (/noModule/i.test(tag)) continue; // современные Chrome не исполняют этот fallback
    if (tag.startsWith('<link') && !/rel="(?:preload|modulepreload)"/.test(tag)) continue;
    const url = tag.match(/(?:src|href)="([^"]+\.js(?:\?[^"]*)?)"/)?.[1];
    if (url) urls.add(url.replaceAll('&amp;', '&'));
  }
  let search = false, bytes = 0;
  for (const url of urls) {
    if (!cache.has(url)) {
      const r = await read(url);
      assert.equal(r.status, 200, url);
      cache.set(url, await r.text());
    }
    const js = cache.get(url);
    // Короткий запрос FavoriteToggle к тому же API не означает загрузку
    // AirportSearch. Отличаем настоящий компонент по его bootstrap-ошибке;
    // endpoint проверяем вместе с ней, чтобы не считать посторонний текст.
    search ||= js.includes('/api/airports/search') && js.includes('Search bootstrap');
    bytes += gzipSync(js).length;
  }
  assert.equal(search, needsSearch, path + ': JS поиска только там, где есть поиск');
  if (needsSearch) assert.match(html, /<input\b[^>]*role="combobox"/, path + ': поле поиска в SSR');
  console.log(`PASS ${path}: ${urls.size} JS, ${bytes} B gzip, поиск=${search}`);
}
// У существующей архитектуры Next root layout без html/body ошибка маршрута
// приходит в RSC error shell и восстанавливается браузером. Здесь проверяем
// HTTP/robots; наличие поля и работоспособность поиска — отдельно в браузере.
const missing = await read('/ru/airport/ZZZ');
assert.equal(missing.status, 404);
assert.match(await missing.text(), /<meta name="robots" content="noindex"/);
console.log('PASS invalid airport: HTTP 404, noindex');
