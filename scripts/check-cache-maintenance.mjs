import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {maintain, requireBuildSpace} from './cache-maintenance.mjs';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ab-cache-test-'));
const write = (name, age = 3600000) => {
  const p = path.join(root, name); fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, 'protected-or-reproducible');
  fs.utimesSync(p, new Date(Date.now() - age), new Date(Date.now() - age)); return p;
};
try {
  const protectedFiles = ['data/store/entries/AYT.json', 'data/archive/AYT.json', '.next/server/app/ru.html', '.next/static/chunk.js', '.next-prev/server/app/ru.html', '.next-prev/BUILD_ID'].map(p => write(p));
  const old = ['.html', '.rsc', '.meta'].map(ext => write('.next/server/route-cache/APP_PAGE/hash/$/ru/old'+ext));
  const recent = write('.next/server/route-cache/APP_PAGE/hash/$/ru/recent.html', 1000);
  const backup = write('.next-prev/server/route-cache/APP_PAGE/hash/$/ru.html');
  fs.symlinkSync(path.join(root, 'data'), path.join(root, '.next/server/route-cache/escape'));
  const r = maintain(root, {maxBytes: 1, targetBytes: 0});
  assert.equal(r.removed, 4); old.forEach(p => assert.equal(fs.existsSync(p), false));
  assert.equal(fs.existsSync(backup), false); assert.ok(fs.existsSync(recent));
  protectedFiles.forEach(p => assert.equal(fs.readFileSync(p, 'utf8'), 'protected-or-reproducible'));
  assert.throws(() => requireBuildSpace(root, 1024), /8 ГБ/);
  requireBuildSpace(root, 9 * 1024 ** 3);
  assert.equal(maintain(root, {maxBytes: 1, targetBytes: 0}).removed, 0);
  fs.rmSync(path.join(root, '.next/server/route-cache'), {recursive: true});
  fs.symlinkSync(path.join(root, 'data'), path.join(root, '.next/server/route-cache'));
  assert.equal(maintain(root, {maxBytes: 1, targetBytes: 0}).removed, 0);
  protectedFiles.forEach(p => assert.ok(fs.existsSync(p)));
  console.log('PASS: eviction, fresh-entry grace, rollback, flight data, symlinks, idempotence, low-space guard');
} finally { fs.rmSync(root, {recursive: true, force: true}); }
