import { parseRum } from '@/lib/rum-schema';
import { storeRum } from '@/lib/rum-store';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let minute = 0, received = 0;
const reply = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
// Только запись, без публичного чтения телеметрии. Один небольшой запрос на загрузку,
// не платный API. Origin, потоковый предел тела и общий лимит не требуют хранить IP.
export async function POST(req: Request) {
  if (process.env.RUM_DISABLED === '1') return reply(204);
  const origin = req.headers.get('origin') || '';
  const local = process.env.RUM_ALLOW_LOCAL === '1' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  if (!['https://airportsboard.live', 'https://www.airportsboard.live'].includes(origin) && !local) return reply(403);
  if (/bot|crawler|spider|headless/i.test(req.headers.get('user-agent') || '')) return reply(204);
  const tick = Math.floor(Date.now() / 60000);
  if (tick !== minute) { minute = tick; received = 0; }
  if (++received > 120) return reply(429);
  if (Number(req.headers.get('content-length') || 0) > 4096) return reply(413);
  try {
    const reader = req.body?.getReader();
    if (!reader) return reply(400);
    let total = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.length;
      if (total > 4096) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    const data = parseRum(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    if (!data) return reply(400);
    await storeRum(data);
    return reply(204);
  } catch { return reply(400); }
}
