// Проверять production build: в dev Next намеренно не встраивает CSS.
// Только HTML и статический CSS с audit-bot, без платного API рейсов.
// Ловим возврат блокирующего запроса и повреждение стилей при встраивании;
// время рисования измеряется отдельно в браузере, этот тест не подменяет LCP.
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';

const base = process.argv[2] || 'http://localhost:3097';
async function read(path) {
  const r = await fetch(new URL(path, base), { headers: { 'user-agent': 'audit-bot' } });
  assert.equal(r.status, 200, path);
  return r.text();
}
for (const path of ['/ru', '/ru/airport/AYT', '/ru/airport/AYT/arrivals', '/ar/airport/AYT', '/en/airport/JFK']) {
  const html = await read(path);
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(!/<link\b[^>]*rel="stylesheet"/i.test(head), path + ': блокирующий CSS');
  const styles = [...head.matchAll(/<style[^>]*data-href="([^"]+)"[^>]*>([\s\S]*?)<\/style>/g)];
  assert.ok(styles.length, path + ': стили должны прийти до body');
  let bytes = 0;
  for (const [, href, css] of styles) {
    assert.equal(css, await read(href), path + ': встроен полный исходный CSS');
    bytes += gzipSync(css).length;
  }
  assert.ok(bytes < 12_000, path + ': рост CSS требует повторного замера выигрыша');
  console.log(`PASS ${path}: CSS в head, без блокирующего запроса, ${bytes} B gzip`);
}
