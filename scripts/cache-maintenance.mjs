/**
 * В октябре 2026 runtime ISR вырос до 35 ГБ, а его копия в .next-prev заполнила
 * диск во время сборки. Next 15.5.28 отделяет эти воспроизводимые ответы в
 * server/route-cache от server/app (исходные prerender-страницы и код).
 * Удаляем ТОЛЬКО runtime-ответы; store/archive с купленными рейсами сюда
 * принципиально не передаются. Пропущенный ответ Next строит заново из данных.
 * Обслуживание и весь build/swap используют один flock через maintenance-runner.
 */
import fs from 'node:fs';
import path from 'node:path';
const GiB = 1024 ** 3;
export function maintain(root, {maxBytes = 4 * GiB, targetBytes = 3 * GiB, graceMs = 600000, now = Date.now()} = {}) {
  const result = {bytesBefore: 0, bytesAfter: 0, removed: 0};
  for (const build of ['.next-prev', '.next']) {
    // lstat каждого предка: даже случайная ссылка не должна вывести очистку
    // из двух разрешённых каталогов сборки в постоянные данные.
    let dir = path.resolve(root);
    let valid = true;
    for (const part of [build, 'server', 'route-cache']) {
      dir = path.join(dir, part);
      try { if (!fs.lstatSync(dir).isDirectory()) valid = false; }
      catch (e) { if (e.code !== 'ENOENT') throw e; valid = false; }
      if (!valid) break;
    }
    if (!valid) continue;
    const groups = new Map();
    function walk(folder) {
      for (const item of fs.readdirSync(folder, {withFileTypes: true})) {
        const file = path.join(folder, item.name);
        if (item.isDirectory()) walk(file);
        else if (item.isFile()) {
          const stat = fs.lstatSync(file);
          const key = file.replace(/\.(html|rsc|meta|body|json)$/, '');
          const group = groups.get(key) || {files: [], size: 0, newest: 0};
          group.files.push({file, stat}); group.size += stat.size;
          group.newest = Math.max(group.newest, stat.mtimeMs);
          groups.set(key, group);
        }
      }
    }
    walk(dir);
    let size = [...groups.values()].reduce((s, g) => s + g.size, 0);
    result.bytesBefore += size;
    const limit = build === '.next-prev' ? 0 : maxBytes;
    const target = build === '.next-prev' ? 0 : targetBytes;
    if (size > limit) {
      for (const group of [...groups.values()].sort((a, b) => a.newest - b.newest)) {
        if (size <= target) break;
        if (now - group.newest < graceMs) continue;
        // Работающие pm2-процессы могут обновить запись после обхода. Такие
        // группы оставляем до следующего тика; недавние записи защищены 10 минут.
        if (!group.files.every(({file, stat}) => {
          try { const current = fs.lstatSync(file); return current.isFile() && current.ino === stat.ino && current.mtimeMs === stat.mtimeMs && current.size === stat.size; }
          catch { return false; }
        })) continue;
        for (const {file, stat} of group.files) {
          try { fs.unlinkSync(file); size -= stat.size; result.removed++; }
          catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
      }
    }
    // Пустые ветки тоже расходуют inode. rmdir не удалит каталог, если Next
    // успел записать в него новый ответ; ссылки при обходе не раскрываются.
    function emptyFolders(folder) {
      for (const item of fs.readdirSync(folder, {withFileTypes: true})) {
        if (item.isDirectory()) emptyFolders(path.join(folder, item.name));
      }
      if (folder !== dir) {
        try { fs.rmdirSync(folder); }
        catch (e) { if (!['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes(e.code)) throw e; }
      }
    }
    emptyFolders(dir);
    result.bytesAfter += size;
  }
  return result;
}
export function requireBuildSpace(root, availableBytes) {
  const free = availableBytes ?? (() => { const s = fs.statfsSync(root); return s.bavail * s.bsize; })();
  // Реальная сборка ~1 ГБ; 8 ГБ оставляют запас на stage, npm и рост live ISR.
  // При нехватке места останавливаемся ДО next build, сохраняя live и rollback.
  if (free < 8 * GiB) throw new Error(`Для безопасной сборки нужно 8 ГБ свободного места, доступно ${(free / GiB).toFixed(2)} ГБ. Рабочая сборка сохранена.`);
}
