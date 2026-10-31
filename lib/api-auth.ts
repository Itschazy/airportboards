import type { NextRequest } from 'next/server';

/**
 * Did this request reach us through nginx rather than from the box itself?
 *
 * 🔴 ИЗМЕРЕНО 31.10.2026: эта функция истинна ВСЕГДА, то есть «с бокса» не бывает никогда.
 * Next сам дописывает отсутствующие x-forwarded-* перед тем, как отдать запрос приложению
 * (node_modules/next/dist/server/base-server.js, «Update the `x-forwarded-*` headers»:
 * x-forwarded-host получает значение из Host и потому не пуст никогда). Замер на стенде:
 * петлевой curl без токена к /api/airlabs-usage получает публичную заглушку, а не цифры.
 *
 * Значит isOperatorRequest сводится к «только по предъявленному токену», а обещание «on-box,
 * from the VDS itself, no token is needed» из комментариев и CLAUDE.md не работает и, судя по
 * всему, не работало никогда. Оставлено как есть НАМЕРЕННО: строже — лучше, а токен для
 * операторских команд в CLAUDE.md и так указан. Исправлены комментарии, а не поведение.
 */
function cameThroughProxy(req: NextRequest): boolean {
  return !!(req.headers.get('x-forwarded-for')
    || req.headers.get('x-forwarded-host')
    || req.headers.get('x-forwarded-proto')
    || req.headers.get('x-real-ip'));
}

function hasToken(req: NextRequest): boolean {
  const token = process.env.CRON_TOKEN || '';
  return !!token && req.nextUrl.searchParams.get('token') === token;
}

function isLoopbackHost(req: NextRequest): boolean {
  const host = req.nextUrl.hostname.toLowerCase();
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * Strict operator check, for endpoints that only disclose information.
 *
 * Loopback alone is NOT sufficient, and this is measured rather than theoretical: on
 * production 2026-07-19, /api/airlabs-usage kept answering external callers in full after a
 * host-only check shipped. nginx hands this app a loopback Host for internet traffic too, so
 * every request in the world was passing as "the operator".
 *
 * A request that came through the proxy carries forwarding headers; a curl from the box itself
 * carries none. Requiring both fails closed.
 */
export function isOperatorRequest(req: NextRequest): boolean {
  if (hasToken(req)) return true;
  if (cameThroughProxy(req)) return false;
  return isLoopbackHost(req);
}

/** Кто пришёл за прогревом. null — никто, кому можно. */
export type Warmer = 'token' | 'unconfigured';

/**
 * Право запустить прогрев — строгая проверка с одним заслоном от собственной ошибки.
 *
 * 'token' — крон: предъявил CRON_TOKEN. Только ему позволено задавать число тиков в сутки и
 * обходить минимальный интервал между прогревами (см. app/api/cron/warm/route.ts).
 *
 * 🔴 'unconfigured' и есть тот самый заслон, и он тут не из осторожности. Если CRON_TOKEN в
 * окружении процесса НЕ задан, токен не сможет предъявить НИКТО, включая крон, — а другого
 * пути нет: «петлевой» вход строгой проверки недостижим, Next дописывает x-forwarded-*
 * каждому запросу (разбор у cameThroughProxy, измерено). Прогрев встал бы молча — ровно та
 * катастрофа, из-за которой прежний автор и не стал закрывать ручку: ответы 200, страницы
 * целые, борт стареет до первого числа.
 *
 * Поэтому при НЕнастроенном токене поведение остаётся прежним, открытым, — но перестаёт быть
 * невидимым: исход возвращается наружу, попадает в ответ ручки и в крон-лог, а /api/health
 * показывает `cronToken: "missing"` бесплатно и без токена. Выбор здесь не между «дыра» и
 * «нет дыры», а между дырой видимой и дырой молчащей. В этом же исходе работает минимальный
 * интервал между тиками — единственный тормоз, когда ручка открыта всем.
 */
export function warmerVerdict(req: NextRequest): Warmer | null {
  if (hasToken(req)) return 'token';
  return cronTokenConfigured() ? null : 'unconfigured';
}

/** Задан ли токен прогрева в окружении процесса. Наружу — чтобы /api/health это показывал. */
export function cronTokenConfigured(): boolean {
  return !!(process.env.CRON_TOKEN || '');
}

/**
 * 🔴 ЗДЕСЬ БЫЛ isCronRequest — `hasToken(req) || isLoopbackHost(req)`, то есть ОТКРЫТАЯ РУЧКА.
 *
 * Снят 31.10.2026 по аудиту. Он задумывался как «петля или токен», но за nginx петлёй
 * выглядит КАЖДЫЙ запрос из интернета: `next start` строит nextUrl из адреса, на котором
 * слушает сам. Это не рассуждение, а измеренное — ровно по этой причине 18.10 живая покупка
 * не срабатывала ни разу (`refused.localhost` на каждого читателя, см. lib/live-budget.ts), и
 * ровно по этой причине /api/revalidate с самого начала стоит на строгой проверке.
 *
 * Оставлять было нельзя: прогрев — единственный путь, который тратит деньги по собственной
 * воле, и его тик берёт до половины дневной доли плана (tickBudget в lib/warm.ts). Прежняя
 * оговорка «идемпотентен внутри TTL и ограничен потолком месяца» верна, но защищает не от
 * того: потолок не даёт превысить ПЛАН, а не вытянуть его вперёд.
 *
 * Условие, при котором автор не стал закрывать ручку — «неизвестно, как крон её зовёт» —
 * выполнено: CLAUDE.md и ecosystem.config.cjs говорят одно и то же. Крон на боксе ходит
 * с токеном из /root/.airportsboard-cron-token, без CRON_TOKEN прогрев встаёт и так.
 */
