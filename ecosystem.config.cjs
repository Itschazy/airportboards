// Как pm2 запускает сайт на боксе. Применяется руками, один раз (деплой дальше только делает
// `pm2 restart airportsboard --update-env`):
//
//   cd /var/www/airportsboard && pm2 delete airportsboard && pm2 start ecosystem.config.cjs && pm2 save
//
// 🔴 НЕСКОЛЬКО ПРОЦЕССОВ — с 18.10.2026. До этого pm2 держал `npm start` в fork_mode: один процесс
// Next.js на одном ядре. 18.10 под трафиком у порта 3000 в очереди на приём стояло 274–334
// соединения, ответы шли 3–20 с, хотя nginx сам отвечал за 0.75 с. Тариф подняли — не помогло:
// упирались в один процесс, а не в железо.
//
// Несколько процессов стали возможны только после того, как хранилище рейсов научилось делить
// состояние между ними (lib/flightStore.ts, 55fd8c1d): без этого каждый процесс считал бы
// расход airlabs сам и покупал бы одни и те же борта независимо.
//
// Число процессов — ядра минус одно: на той же машине работают nginx, крон прогрева и сборка при
// выкате, и сборку на 100% занятой машине срезало бы по тайм-ауту деплоя. Число экземпляров
// pm2 фиксирует при `pm2 start`, поэтому после смены тарифа нужно повторить команду выше —
// `pm2 restart` его не пересчитывает.
//
// Секреты не в репозитории: ~/airportsboard.env на боксе (chmod 600) — AIRLABS_API_KEY,
// AIRLABS_MONTHLY_CAP и CRON_TOKEN, по которому root-крон (/usr/local/bin/airportsboard-warm.sh)
// запускает прогрев. Без CRON_TOKEN прогрев молча встанет.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function readEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2];
    }
  } catch { /* файла нет — значит, окружение придёт из shell */ }
  return out;
}

const instances = Math.max(2, os.cpus().length - 1);

module.exports = {
  apps: [{
    name: 'airportsboard',
    cwd: __dirname,
    script: path.join(__dirname, 'node_modules/next/dist/bin/next'),
    args: 'start',
    exec_mode: 'cluster',
    instances,
    max_memory_restart: '1800M',
    env: {
      NODE_ENV: 'production',
      // Число процессов — приложению. pm2 отдаёт процессу его НОМЕР (NODE_APP_INSTANCE),
      // но не количество, а lib/live-budget.ts делит на количество потолок «разных бортов
      // в час на адрес»: таблица решений живёт в памяти процесса, и без деления каждый
      // отдаёт полный лимит, то есть втроём они пропускают втрое больше заявленного.
      WEB_INSTANCES: String(instances),
      ...readEnv(path.join(os.homedir(), 'airportsboard.env')),
    },
  }],
};
