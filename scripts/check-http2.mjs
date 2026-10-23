// Сторож доставки: HTTP 200 не означает, что nginx договорился о HTTP/2.
// На 23.10.2026 модуль был установлен, но оба listen 443 оставались без http2.
// Проверяем ALPN настоящим curl (Node fetch здесь использует HTTP/1.1), а также
// совместимость старых клиентов. Только безопасные страницы, всегда audit-bot;
// платные endpoints, браузерный UA и автоматические редиректы не используются.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

for (const protocol of ['--http2', '--http1.1']) {
  for (const path of ['/ru', '/ru/airport/AYT', '/ru/airport/AYT/arrivals']) {
    const response = JSON.parse(execFileSync('curl', [
      protocol, '--compressed', '--silent', '--show-error', '--max-time', '30',
      '--user-agent', 'audit-bot', '--output', '/dev/null', '--write-out', '%{json}',
      `https://airportsboard.live${path}`,
    ], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
    assert.equal(response.http_code, 200, path);
    assert.equal(response.http_version, protocol === '--http2' ? '2' : '1.1',
      `${path}: nginx не согласовал запрошенный протокол`);
    console.log(`PASS ${path}: HTTP/${response.http_version}, 200`);
  }
}
