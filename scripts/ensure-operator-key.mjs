// Ключ оператора в authorized_keys пользователя, который собирает сайт на боксе.
//
// 18.10.2026 сайт встал под трафиком, а зайти на сервер было нечем: пароль root утерян, ключ
// не принимается, переход в панель FirstVDS отдаёт «Fatal error». Единственное, что на боксе
// выполняется по нашей воле, — сборка при выкате (GitHub Actions → SSH → npm run build). Этот
// шаг кладёт публичный ключ оператора в ~/.ssh/authorized_keys, чтобы на сервер можно было
// зайти без пароля и без панели. Решение Евгения от 18.10.
//
// Только на боксе: локальная сборка на машине разработчика не должна трогать её ~/.ssh.
// Признак бокса — каталог выката /var/www/airportsboard (см. .github/workflows/deploy.yml).
//
// Идемпотентно: ключ, который уже есть, второй раз не дописывается. Ошибка не валит сборку —
// доступ полезен, но не ценой выката.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BOX_DIR = '/var/www/airportsboard';
const KEY = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIP/zsOIqY9036zas43BVMT+HcButkZqat3ZSbp9dVZSg whereiszhenya@brothershub';

if (process.cwd() !== BOX_DIR) process.exit(0);

try {
  const dir = path.join(os.homedir(), '.ssh');
  const file = path.join(dir, 'authorized_keys');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const body = KEY.split(' ').slice(0, 2).join(' ');
  if (!have.includes(body)) {
    fs.appendFileSync(file, (have && !have.endsWith('\n') ? '\n' : '') + KEY + '\n');
    console.log(`[operator-key] ключ добавлен в ${file}`);
  }
  fs.chmodSync(dir, 0o700);
  fs.chmodSync(file, 0o600);
} catch (e) {
  console.error('[operator-key] не удалось записать ключ:', e?.message);
}
