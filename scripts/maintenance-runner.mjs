import {spawnSync} from 'node:child_process';
import {maintain, requireBuildSpace} from './cache-maintenance.mjs';
const mode = process.argv[2];
if (!['build', 'cache'].includes(mode)) throw new Error('Ожидается build или cache');
// Замок вне репозитория: git clean не может удалить inode занятого flock.
// Linux timer и весь build/swap сериализованы; macOS используется для локальной
// проверки без systemd и flock. Блокировка снимается ядром даже при убийстве CI.
if (process.platform === 'linux' && process.argv[3] !== '--locked') {
  const child = spawnSync('flock', ['-E', '75', mode === 'cache' ? '-n' : '-w', ...(mode === 'cache' ? [] : ['120']), '/var/tmp/airportsboard-build-cache.lock', process.execPath, ...process.argv.slice(1), '--locked'], {stdio: 'inherit'});
  process.exit(child.status ?? 1);
}
console.log('cache-maintenance:', JSON.stringify(maintain(process.cwd())));
if (mode === 'build') {
  requireBuildSpace(process.cwd());
  const child = spawnSync('sh', ['-c', 'node scripts/ensure-operator-key.mjs && node scripts/clean-stale-types.mjs && NEXT_DIST_DIR=.next-build next build && node scripts/swap-build.mjs'], {stdio: 'inherit'});
  process.exit(child.status ?? 1);
}
