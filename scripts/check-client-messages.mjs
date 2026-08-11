// The browser is sent four of the ten message namespaces. Prove that is still enough.
//
// lib/client-messages.ts trims the catalogue handed to NextIntlClientProvider, which is worth
// roughly 800 bytes of gzip per page and more for the non-Latin locales. The trim is only safe
// while the list matches what client components actually ask for, and it will not stay matched
// on its own: someone adds `useTranslations('board')` to a client component, and next-intl
// answers with the key instead of the translation. That is the dangerous part — it does not
// throw, it does not fail the build, and it is invisible unless you read the page in the
// affected language. English would keep working, because most keys are English words.
//
// So the namespaces are re-derived here from the source, the same way a bundler would: start
// at every file marked 'use client', walk its imports, and collect every namespace reached.
//
// Two shapes defeat static analysis and are rejected outright rather than guessed at:
//   - useTranslations() with no namespace, which reads the catalogue root;
//   - useTranslations(variable), where the namespace is not known until it runs.
// Either one means the trim cannot be verified, so the trim has to go, not the check.
//
// Usage:  npm run check:client-messages

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'hooks'];
const EXTS = ['.tsx', '.ts'];

const files = new Map();
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (EXTS.some((x) => e.name.endsWith(x))) files.set(p, fs.readFileSync(p, 'utf8'));
    }
  };
  walk(root);
}

/** 'use client' must be the first statement, but comments may precede it. */
const isClient = (src) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);

function resolve(spec, from) {
  let cand;
  if (spec.startsWith('@/')) cand = spec.slice(2);
  else if (spec.startsWith('.')) cand = path.normalize(path.join(path.dirname(from), spec));
  else return null;                                  // a package, not our source
  for (const ext of [...EXTS, ...EXTS.map((e) => `/index${e}`)]) {
    if (files.has(cand + ext)) return cand + ext;
  }
  return files.has(cand) ? cand : null;
}

// Everything the browser can reach: the 'use client' entry points and their transitive imports.
const seeds = [...files].filter(([, s]) => isClient(s)).map(([p]) => p);
const reachable = new Set();
const stack = [...seeds];
while (stack.length) {
  const p = stack.pop();
  if (reachable.has(p)) continue;
  reachable.add(p);
  for (const m of files.get(p).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const r = resolve(m[1], p);
    if (r && !reachable.has(r)) stack.push(r);
  }
}

let failures = 0;
const fail = (m) => { console.error(`  ✗ ${m}`); failures++; };
const pass = (m) => console.log(`  ✓ ${m}`);

const used = new Map();                              // namespace → files that ask for it
const unanalysable = [];
for (const p of reachable) {
  const src = files.get(p);
  for (const m of src.matchAll(/useTranslations\(\s*['"]([^'"]+)['"]/g)) {
    used.set(m[1], [...(used.get(m[1]) ?? []), p]);
  }
  if (/useTranslations\(\s*\)/.test(src)) unanalysable.push(`${p}: useTranslations() без пространства — читает корень каталога`);
  if (/useTranslations\(\s*[^'")\s]/.test(src)) unanalysable.push(`${p}: useTranslations(переменная) — пространство неизвестно до выполнения`);
  if (/useMessages\(/.test(src)) unanalysable.push(`${p}: useMessages() — требует каталог целиком`);
}

const declared = new Set(
  [...fs.readFileSync('lib/client-messages.ts', 'utf8')
    .match(/CLIENT_NAMESPACES\s*=\s*\[([^\]]*)\]/s)[1]
    .matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]),
);
const all = new Set(Object.keys(JSON.parse(fs.readFileSync('messages/en.json', 'utf8'))));

console.log(`клиентский граф: ${reachable.size} файлов от ${seeds.length} точек входа с 'use client'\n`);

for (const u of unanalysable) fail(u);
if (!unanalysable.length) pass('нет вызовов, которые нельзя проанализировать статически');

const missing = [...used.keys()].filter((ns) => !declared.has(ns));
missing.length
  ? fail(`клиент просит пространства, которых ему не отправляют: ${missing
      .map((ns) => `${ns} (${used.get(ns)[0]})`).join(', ')} — добавь в CLIENT_NAMESPACES`)
  : pass(`все ${used.size} запрошенных пространств отправляются: ${[...used.keys()].sort().join(' ')}`);

const unknown = [...declared].filter((ns) => !all.has(ns));
unknown.length
  ? fail(`в CLIENT_NAMESPACES перечислены несуществующие пространства: ${unknown.join(' ')}`)
  : pass('все перечисленные пространства есть в каталоге');

// Not a failure — a namespace may be kept deliberately — but silent dead weight otherwise.
const extra = [...declared].filter((ns) => !used.has(ns));
if (extra.length) console.log(`  · отправляются, но клиентом не запрашиваются: ${extra.join(' ')}`);

// What the trim is worth, per locale, so the number in the source comment stays honest.
{
  const { gzipSync } = await import('node:zlib');
  const size = (o) => gzipSync(Buffer.from(JSON.stringify(o)), { level: 6 }).length;
  const rows = [];
  for (const f of fs.readdirSync('messages').filter((f) => f.endsWith('.json'))) {
    const d = JSON.parse(fs.readFileSync(path.join('messages', f), 'utf8'));
    const cut = Object.fromEntries(Object.entries(d).filter(([k]) => declared.has(k)));
    rows.push([f.replace('.json', ''), size(d) - size(cut)]);
  }
  rows.sort((a, b) => b[1] - a[1]);
  const avg = Math.round(rows.reduce((n, r) => n + r[1], 0) / rows.length);
  console.log(`\n  экономия: ${avg} Б gzip на страницу в среднем; больше всего — `
    + rows.slice(0, 3).map(([l, n]) => `${l} ${n}`).join(', '));
}

console.log(failures ? `\n${failures} проблем(ы)` : '\nурезанный каталог покрывает всё, что просит клиент');
process.exit(failures ? 1 : 0);
