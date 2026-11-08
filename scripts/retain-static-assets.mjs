// Cached HTML and already open tabs can reference chunks from an older release.
// Carry only public immutable build assets into the next completed build; never
// copy server/route-cache, HTML, flight stores or user data. The manifest lives
// outside static/ and preserves expiry across deploys (no sliding retention).
import fs from 'node:fs';
import path from 'node:path';
const MANIFEST = 'retained-static-assets.json';
export const LIMITS = {ttlMs: 7 * 86400000, maxBytes: 128 * 1024 ** 2, maxFiles: 8000};
function directory(dir) {
  try { if (!fs.lstatSync(dir).isDirectory()) throw new Error(`Not a regular directory: ${dir}`); return true; }
  catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}
function inventory(build) {
  const files = new Map();
  if (!directory(build) || !directory(path.join(build, 'static'))) return files;
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const relative = prefix + entry.name, file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, relative + '/');
      else if (entry.isFile()) files.set(relative, {file, size: fs.lstatSync(file).size});
      else throw new Error(`Non-regular static asset: ${file}`);
    }
  }
  walk(path.join(build, 'static')); return files;
}
function expiryManifest(build) {
  const file = path.join(build, MANIFEST);
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size > 2 * 1024 ** 2) throw new Error(`Invalid retention manifest: ${file}`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 1 || !data.files || typeof data.files !== 'object' || Array.isArray(data.files)) throw new Error(`Invalid retention manifest: ${file}`);
    for (const expiry of Object.values(data.files)) if (!Number.isFinite(expiry) || expiry <= 0) throw new Error(`Invalid asset expiry: ${file}`);
    return data.files;
  } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}
export function retainStaticAssets(stage, sources, {now = Date.now(), ...options} = {}) {
  const {ttlMs, maxBytes, maxFiles} = {...LIMITS, ...options};
  const current = inventory(stage), pending = new Map(), seen = new Set(current.keys());
  if (fs.existsSync(path.join(stage, MANIFEST))) throw new Error('Stage already has retained assets; rebuild before another swap');
  for (const build of sources) {
    const files = inventory(build), expiries = expiryManifest(build);
    for (const [relative, asset] of files) {
      if (seen.has(relative)) continue; // Fresh/live paths outrank rollback, even when expired.
      seen.add(relative);
      const expiry = Object.hasOwn(expiries, relative) ? expiries[relative] : now + ttlMs;
      if (expiry <= now) continue;
      pending.set(relative, {...asset, expiry: Math.min(expiry, now + ttlMs)});
    }
  }
  const bytes = [...pending.values()].reduce((sum, item) => sum + item.size, 0);
  if (pending.size > maxFiles || bytes > maxBytes) throw new Error(`Static retention exceeds safety limit: ${pending.size} files / ${bytes} bytes. Live build unchanged.`);
  const copied = [], manifest = Object.create(null);
  try {
    for (const [relative, item] of pending) {
      const target = path.join(stage, 'static', relative);
      fs.mkdirSync(path.dirname(target), {recursive: true});
      // Reserve our own destination so cleanup also removes a partial copy.
      const fd = fs.openSync(target, 'wx'); fs.closeSync(fd); copied.push(target);
      fs.copyFileSync(item.file, target); manifest[relative] = item.expiry;
    }
    fs.writeFileSync(path.join(stage, MANIFEST), JSON.stringify({version: 1, files: manifest}) + '\n', {flag: 'wx'});
  } catch (error) {
    for (const file of copied) fs.unlinkSync(file);
    throw error;
  }
  return {files: pending.size, bytes, ttlDays: ttlMs / 86400000};
}
