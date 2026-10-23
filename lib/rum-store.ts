import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { RumRecord } from './rum-schema';

export const RUM_DAYS = 14;
export const RUM_FILE_LIMIT = 1024 * 1024;
export const RUM_SLOTS = 8;
export const rumDirectory = () => path.join(process.env.AIRPORTSBOARD_DATA_DIR || path.join(os.homedir(), 'airportsboard-data'), 'rum');

/** Отдельное кольцо диагностических файлов, не flightStore и не ISR-кэш.
 * 14 дней × максимум 8 процессов × 1 МиБ = не более 112 МиБ. PM2 slot фиксирован,
 * PID в имени не используем: каждый перезапуск иначе создавал бы новые файлы.
 * При заполнении прекращаем приём; отчёт помечает цензурированные файлы.
 * Запись под межпроцессным lock: старый worker при reload не обгонит новый.
 * Если диск/lock недоступны, теряется только замер, а не ответ табло.
 */
export async function storeRum(record: RumRecord, now = new Date(), dir = rumDirectory(), slot = process.env.NODE_APP_INSTANCE || '0'): Promise<boolean> {
  if (!/^[0-7]$/.test(slot)) return false;
  const day = now.toISOString().slice(0, 10);
  const bucket = Math.floor(now.getTime() / 86400000) % RUM_DAYS;
  const file = path.join(dir, `rum-${bucket}-${slot}.jsonl`);
  const lock = file + '.lock';
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  let lease;
  try { lease = await fs.open(lock, 'wx', 0o600); }
  catch {
    // Упавший процесс оставляет lock. Свежий lock не трогаем и не ждём в HTTP.
    try { if (now.getTime() - (await fs.stat(lock)).mtimeMs > 60000) await fs.unlink(lock); } catch { /* другой worker */ }
    return false;
  }
  try {
    const header = JSON.stringify({ day }) + '\n';
    let size = 0;
    try {
      const handle = await fs.open(file, 'r');
      try {
        const first = Buffer.alloc(Buffer.byteLength(header));
        await handle.read(first, 0, first.length, 0);
        if (first.toString() === header) size = (await handle.stat()).size;
      } finally { await handle.close(); }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (!size) { await fs.writeFile(file, header, { mode: 0o600 }); size = Buffer.byteLength(header); }
    // Время округлено до часа; корреляции людей/сессий и уникального metric.id нет.
    const line = JSON.stringify({ hour: now.toISOString().slice(0, 13), ...record }) + '\n';
    if (size + Buffer.byteLength(line) > RUM_FILE_LIMIT) return false;
    await fs.appendFile(file, line, { mode: 0o600 });
    return true;
  } finally { await lease.close(); await fs.unlink(lock).catch(() => {}); }
}
