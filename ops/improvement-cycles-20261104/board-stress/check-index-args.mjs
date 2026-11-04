// Проверяем настоящий CLI, включая адрес фактических 20 HTTP-проверок.
// Неверные аргументы обязаны завершиться до заголовка аудита/сетевых запросов.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const base = process.argv[2];
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base || ''), 'Нужен локальный fixture server');
function run(args, envBase) {
  return spawnSync(process.execPath, ['scripts/check-index.mjs', ...args], {
    env: {...process.env, BASE: envBase, RESOLVE_IP: ''}, encoding: 'utf8', timeout: 30000,
  });
}
for (const [args, envBase] of [[[base], 'http://127.0.0.1:1'], [[], base]]) {
  const r = run(args, envBase);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.ok(r.stdout.includes(`Indexability audit -> ${base}`));
  assert.ok(r.stdout.includes('20/20 passed'));
}
for (const args of [['--typo'], [base, 'extra'], ['ftp://localhost'],
  [`${base}/subpath`], [`${base}?q=1`], [`${base}#fragment`], ['http://user:pass@localhost']]) {
  const r = run(args, base);
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.includes('Indexability audit ->'), false);
}
console.log('PASS: positional URL overrides BASE, BASE compatibility, 7 invalid-input controls');
