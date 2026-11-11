// CORS для приложений (lib/app-cors.ts): кто получает Access-Control-Allow-Origin и Vary.
//
// Модуль транспилируется и исполняется в vm, как lib/track.ts в tests/flight-map/progress.test.mjs:
// так проверяется ровно тот исходник, что уходит в ручки, без Next и без сервера.
// Запуск: node --test tests/app-cors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/app-cors.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

function load(nodeEnv) {
  const context = { exports: {}, process: { env: { NODE_ENV: nodeEnv } } };
  vm.runInNewContext(js, context);
  return context.exports;
}

const req = (origin, method = 'GET') => ({
  method,
  headers: new Headers(origin === undefined ? {} : { Origin: origin }),
});

const APP = ['capacitor://localhost', 'https://localhost'];
const DEV = ['http://localhost:5173', 'http://localhost', 'http://127.0.0.1:3099', 'http://10.0.2.2:3099'];
const FOREIGN = [
  'https://airportsboard.live', 'https://evil.example', 'http://localhost.evil.example',
  'https://localhost:8443', 'capacitor://localhost.evil', 'http://10.0.2.20:3099',
  'http://192.168.0.5:3099', 'null', '',
];

for (const env of ['production', 'development']) {
  const { appCorsHeaders } = load(env);
  test(`${env}: Origin приложений получают свой адрес и Vary: Origin`, () => {
    for (const origin of APP) {
      assert.deepEqual({ ...appCorsHeaders(req(origin)) }, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }, origin);
    }
  });
  test(`${env}: чужой и отсутствующий Origin — без заголовков`, () => {
    for (const origin of FOREIGN) assert.deepEqual({ ...appCorsHeaders(req(origin)) }, {}, origin);
    assert.deepEqual({ ...appCorsHeaders(req(undefined)) }, {});
  });
  test(`${env}: только GET`, () => {
    for (const method of ['POST', 'OPTIONS', 'HEAD', 'PUT']) {
      assert.deepEqual({ ...appCorsHeaders(req(APP[0], method)) }, {}, method);
    }
    assert.equal(appCorsHeaders(req(APP[1], 'get'))['Access-Control-Allow-Origin'], APP[1]);
  });
}

test('адреса разработки — только вне production', () => {
  const prod = load('production').appCorsHeaders, dev = load('development').appCorsHeaders;
  const unset = load(undefined).appCorsHeaders;
  for (const origin of DEV) {
    assert.deepEqual({ ...prod(req(origin)) }, {}, `production: ${origin}`);
    assert.deepEqual({ ...dev(req(origin)) }, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }, `development: ${origin}`);
    assert.equal(unset(req(origin))['Access-Control-Allow-Origin'], origin, `NODE_ENV не задан: ${origin}`);
  }
});

test('withAppCors не трогает Cache-Control и тело, Vary дописывает', async () => {
  const { withAppCors } = load('production');
  const make = (headers) => new Response(JSON.stringify({ ok: 1 }), { status: 404, headers });

  const own = withAppCors(req('capacitor://localhost'), make({ 'Cache-Control': 'private, max-age=0, must-revalidate' }));
  assert.equal(own.status, 404);
  assert.equal(own.headers.get('cache-control'), 'private, max-age=0, must-revalidate');
  assert.equal(own.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  assert.equal(own.headers.get('vary'), 'Origin');
  assert.deepEqual(await own.json(), { ok: 1 });

  const varied = withAppCors(req('https://localhost'), make({ Vary: 'Accept-Encoding' }));
  assert.equal(varied.headers.get('vary'), 'Accept-Encoding, Origin');
  const already = withAppCors(req('https://localhost'), make({ Vary: 'Origin' }));
  assert.equal(already.headers.get('vary'), 'Origin');

  const foreign = withAppCors(req('https://evil.example'), make({ 'Cache-Control': 'public, max-age=3600' }));
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  // Vary — и чужому, и запросу без Origin: кэш должен различать ответы по любому из них.
  assert.equal(foreign.headers.get('vary'), 'Origin');
  const none = withAppCors(req(null), make({ Vary: 'Accept-Encoding' }));
  assert.equal(none.headers.get('access-control-allow-origin'), null);
  assert.equal(none.headers.get('vary'), 'Accept-Encoding, Origin');
  assert.equal(foreign.headers.get('cache-control'), 'public, max-age=3600');
  assert.equal(foreign.status, 404);
});

test('все ветки ответа трёх ручек обёрнуты, Cache-Control на месте', () => {
  const routes = {
    'app/api/flights/[iata]/route.ts': 3,
    'app/api/airports/search/route.ts': 3,
    'app/api/airports/counts/route.ts': 1,
  };
  for (const [file, branches] of Object.entries(routes)) {
    const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const returns = src.match(/return\s+NextResponse\.json\(/g) || [];
    assert.equal(returns.length, 0, `${file}: ответ без withAppCors`);
    const wrapped = src.match(/return\s+withAppCors\(req,\s*NextResponse\.json\(/g) || [];
    assert.equal(wrapped.length, branches, `${file}: веток ответа`);
  }
});
