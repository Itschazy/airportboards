// Put a finished build in place of the live one, atomically-ish.
//
// The problem this solves cost 11.5 hours of downtime on 2026-08-05. `next build` writes into
// `.next`, which is also the directory the running server reads from. The deploy runs over an
// SSH session with a 10-minute ceiling, and when a large commit pushed the build past it the
// session was killed mid-write. `pm2 restart` comes after the build in the deploy script, so it
// never ran — the app simply died on the next chunk it could not read, and every route answered
// 502 until someone triggered another deploy.
//
// So the build now goes to NEXT_DIST_DIR (see next.config.ts) and this moves it into place only
// once it has actually finished. Two renames on the same filesystem: the window where `.next`
// does not exist is milliseconds instead of ten minutes, and a killed build leaves the live
// directory untouched. A slow deploy stays a slow deploy.
//
// The previous build is kept as `.next-prev` rather than deleted, so a bad deploy can be undone
// by hand with one `mv` and a pm2 restart. Only one generation is kept — 844 MB each.
//
// The ISR page cache is carried across on purpose: it lives in `.next/cache` and holds rendered
// city and country pages (revalidate = 86400). Losing it on every deploy would make the first
// visitor after each release pay a full render, and would also throw away the fetch cache that
// keeps the next build fast. It is data, not build output.
//
// Usage:  node scripts/swap-build.mjs        (run by `npm run build`)

import fs from 'node:fs';
import path from 'node:path';

const STAGE = process.env.NEXT_DIST_DIR || '.next-build';
const LIVE = '.next';
const PREV = '.next-prev';

const exists = (p) => { try { fs.statSync(p); return true; } catch { return false; } };
const say = (m) => console.log(`  swap: ${m}`);

if (!exists(STAGE)) {
  console.error(`swap-build: каталог сборки ${STAGE} не найден — сборка не дошла до конца, ничего не трогаю`);
  process.exit(1);
}
// Refuse to put an unfinished tree over a working one — that is the whole job of this script.
//
// BUILD_ID alone is NOT enough, and that was measured rather than assumed: a build killed twelve
// seconds in had already written BUILD_ID, routes-manifest.json, required-server-files.json and
// both build manifests, and an earlier version of this guard cheerfully swapped that wreck over
// the live directory. `prerender-manifest.json` is written after static generation finishes, so
// it is the one that actually separates "finished" from "was interrupted".
//
// In the normal path `npm run build` chains this behind `next build &&`, so a failed build never
// reaches here at all. This guard is for the other path — a human running the swap by hand after
// something went wrong, which is exactly when the live build must not be touched.
const REQUIRED = ['BUILD_ID', 'prerender-manifest.json', 'routes-manifest.json', 'required-server-files.json'];
const missing = REQUIRED.filter(f => !exists(path.join(STAGE, f)));
if (missing.length) {
  console.error(`swap-build: сборка в ${STAGE} неполная — нет ${missing.join(', ')}. Подмену НЕ делаю.`);
  process.exit(1);
}

// Carry the ISR/fetch cache forward. Moved, not copied: it can be hundreds of megabytes, and a
// rename is instant on the same filesystem. If the staged build already made its own cache
// (first run after this change), keep that one and leave the old one to be discarded with PREV.
const liveCache = path.join(LIVE, 'cache');
const stageCache = path.join(STAGE, 'cache');
if (exists(liveCache) && !exists(stageCache)) {
  try { fs.renameSync(liveCache, stageCache); say('кэш перенесён в новую сборку'); }
  catch (e) { say(`кэш перенести не удалось (${e.code}) — не критично, соберётся заново`); }
}

if (exists(PREV)) {
  fs.rmSync(PREV, { recursive: true, force: true });
  say('прошлая резервная копия удалена');
}
if (exists(LIVE)) {
  fs.renameSync(LIVE, PREV);
  say(`прежняя сборка сохранена как ${PREV}`);
}
fs.renameSync(STAGE, LIVE);
say(`новая сборка на месте (${LIVE})`);
console.log('  откат при необходимости: rm -rf .next && mv .next-prev .next && pm2 restart airportsboard');
