// Оболочка карты перелётов (lib/flight-map/shell.ts) собирается обычным node, без Next.
//
// Ради этого функция и вынесена из страницы: сборка приложения вызывает её node-скриптом. Тест
// грузит исходник тем же способом, что tests/app-cors.test.mjs, — транспиляцией TypeScript в
// CommonJS и исполнением в vm, — только с маленьким загрузчиком, который понимает `@/`,
// относительные пути и .json. Любой импорт `next`/`next-intl` загрузчик роняет: если оболочка
// однажды потянет за собой Next, тест покраснеет раньше, чем сломается сборка приложения.
// Запуск: node --test tests/flight-map-shell.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeRequire = createRequire(import.meta.url);
const LOCALES = ['ru', 'en', 'de', 'fr', 'es', 'it', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi'];

function loader() {
  const cache = new Map();
  const resolve = (spec, from) => {
    if (/^(next|next-intl)(\/|$)/.test(spec)) throw new Error(`оболочка карты тянет Next: ${spec}`);
    if (spec.startsWith('node:') || ['fs', 'path', 'os'].includes(spec)) return spec;
    const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
    for (const f of [base, `${base}.ts`, `${base}.js`, `${base}/index.ts`]) {
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    }
    throw new Error(`не найден ${spec} из ${from}`);
  };
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    if (!path.isAbsolute(file)) return nodeRequire(file);
    const module = { exports: {} };
    cache.set(file, module);
    if (file.endsWith('.json')) { module.exports = JSON.parse(fs.readFileSync(file, 'utf8')); return module.exports; }
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, allowJs: true },
    }).outputText;
    const fn = vm.runInThisContext(`(function (exports, require, module, __filename, __dirname) {${js}\n})`, { filename: file });
    fn(module.exports, (spec) => load(resolve(spec, file)), module, file, path.dirname(file));
    return module.exports;
  };
  return (rel) => load(path.join(ROOT, rel));
}

const { flightMapShell } = loader()('lib/flight-map/shell.ts');

for (const locale of LOCALES) {
  test(`${locale}: оболочка заполнена целиком и без SEO-блока`, async () => {
    const out = await flightMapShell(locale);
    assert.equal(out.locale, locale);
    assert.doesNotMatch(out.html, /\{\{\w+\}\}/, 'остался незаполненный {{ключ}}');
    assert.match(out.html, /<div class="stats" id="stats"><div class="stat"><b>0<\/b>/);
    assert.match(out.html, /<div id="flightList"><div class="empty-list">[^<]+<\/div><\/div>/);
    assert.ok(out.html.includes('<!-- flight-map-seo:start --><!-- flight-map-seo:end -->'), 'без info метки остаются пустыми');
    assert.match(out.runtimeUrl, /^\/flight-map\/v9\/runtime\.js(\?b=[0-9a-z]+)?$/);
    assert.equal(typeof out.messages.m097, 'string');
    assert.ok(out.html.includes(String(out.messages.m097).replace(/&/g, '&amp;').replace(/</g, '&lt;')), 'пустой список — из каталога локали');
  });
}

test('info подставляется между метками SEO как строка замены', async () => {
  const out = await flightMapShell('en', { info: '<section id="x">FAQ</section>' });
  assert.ok(out.html.includes('<section id="x">FAQ</section>'));
  assert.ok(!out.html.includes('flight-map-seo:start'));
});

test('неизвестная локаль — ошибка, а не молчаливый en', async () => {
  await assert.rejects(() => flightMapShell('xx'), /unknown locale/);
});
