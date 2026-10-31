import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { NextResponse } from 'next/server';
import { persistStats } from '@/lib/flightStore';
import { cronTokenConfigured } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// Состояние процесса и машины — чтобы видеть нагрузку без SSH.
//
// 18.10.2026 сайт встал под трафиком: даже /robots.txt из кэша отвечал 15–20 с, а доступа на
// сервер не было (ключ не принимается, панель хостера падает). Эта ручка отвечает на вопросы,
// без которых нагрузку не распределить: сколько ядер видит процесс, загружена ли машина,
// сколько процесс стоит на месте (задержка цикла событий) и во что обходится запись хранилища.
//
// Публичная, потому что денег в ней нет: ни расхода, ни лимитов (это /api/airlabs-usage по
// токену). Только техника. Провайдера не трогает, /api/ закрыт в robots.txt.
//
//   GET /api/health

// Гистограмма задержки цикла событий копится с первого обращения к модулю и сбрасывается при
// каждом чтении, поэтому каждое число — «за время с прошлого запроса к /api/health».
const loop = monitorEventLoopDelay({ resolution: 20 });
loop.enable();

const ms = (ns: number) => Math.round(ns / 1e6);

export function GET() {
  const mem = process.memoryUsage();
  const body = {
    at: new Date().toISOString(),
    // SHA встроен Next во время build: очередь IndexNow проверяет именно запущенный
    // релиз после pm2 restart, а не обновлённый git HEAD перед завершением сборки.
    release: process.env.NEXT_PUBLIC_RUM_RELEASE ?? 'unknown',
    pid: process.pid,
    instance: process.env.NODE_APP_INSTANCE ?? process.env.pm_id ?? null,
    execMode: process.env.exec_mode ?? null,
    uptimeSec: Math.round(process.uptime()),
    cpus: os.cpus().length,
    // Настроен ли токен прогрева. Без него /api/cron/warm остаётся открытым всему миру
    // (намеренный заслон от молчаливой остановки прогрева, разбор в lib/api-auth.ts), и
    // это единственное место, где такое состояние видно бесплатно и без токена.
    cronToken: cronTokenConfigured() ? 'set' : 'missing',
    loadavg: os.loadavg().map(n => Math.round(n * 100) / 100),
    memMB: {
      rss: Math.round(mem.rss / 1048576),
      heapUsed: Math.round(mem.heapUsed / 1048576),
      systemFree: Math.round(os.freemem() / 1048576),
      systemTotal: Math.round(os.totalmem() / 1048576),
    },
    eventLoopMs: {
      mean: ms(loop.mean),
      p50: ms(loop.percentile(50)),
      p99: ms(loop.percentile(99)),
      max: ms(loop.max),
    },
    storePersist: persistStats(),
  };
  loop.reset();
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
