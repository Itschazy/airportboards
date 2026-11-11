/**
 * CORS для приложений AirportsBoard (Capacitor, mobile/).
 *
 * Зачем вообще. Интерфейс приложения упакован в бандл и открывается в WebView со своего
 * адреса — `capacitor://localhost` на iOS и `https://localhost` на Android, — а данные берёт
 * с сайта. Для WebView это обычный межсайтовый fetch: без `Access-Control-Allow-Origin`
 * браузерный движок ответ получает, но странице его не отдаёт. Нативный HTTP-клиент
 * (CapacitorHttp) CORS обошёл бы, но шлёт не браузерный UA — и lib/live-budget.ts справедливо
 * не признал бы в нём читателя. Поэтому запросы идут из WebView, а сервер отвечает CORS.
 *
 * Что сознательно НЕ делается:
 *   - `*` вместо конкретного значения. Ровно два адреса приложений известны заранее, и
 *     отдавать борт в скрипт любой чужой страницы незачем: так собирали бы табло на чужом
 *     сайте из наших оплаченных данных. Заметим честно: CORS не мешает запросу ДОЙТИ —
 *     простой GET уходит и без него, и решение о покупке (mayFetchLive) от этого модуля не
 *     зависит никак. Он решает только, увидит ли ответ скрипт страницы.
 *   - Ответ на preflight (OPTIONS). Клиент шлёт простой GET без своих заголовков, preflight
 *     ему не нужен; ручка OPTIONS только расширила бы поверхность.
 *   - Отказ чужому Origin ошибкой. Ответ тот же самый, просто без заголовка: CORS — защита
 *     читателя чужой страницы, а не наша, и тело всё равно доступно любому curl.
 *
 * Адреса разработки (`http://localhost:*`, `http://127.0.0.1:*`, `http://10.0.2.2:*` — так
 * эмулятор Android видит машину разработчика) пускаются только вне production: на боевом
 * сервере их появление означало бы чужую страницу, поднятую у кого-то локально.
 *
 * Модуль без импортов намеренно: tests/app-cors.test.mjs транспилирует его и исполняет как
 * есть, без Next.
 */

/** Origin приложений: iOS (WKWebView, схема Capacitor) и Android (WebView, https по умолчанию). */
const APP_ORIGINS = new Set(['capacitor://localhost', 'https://localhost']);

/** Машина разработчика с любым портом. Порт необязателен: `http://localhost` — тоже он. */
const DEV_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1|10\.0\.2\.2)(?::\d{1,5})?$/;

export function isAllowedAppOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (APP_ORIGINS.has(origin)) return true;
  return process.env.NODE_ENV !== 'production' && DEV_ORIGIN.test(origin);
}

/**
 * Заголовки CORS для ответа на этот запрос; пустой объект, если они не положены.
 *
 * Только GET: ручки, к которым это подключено, других методов не объявляют, а HEAD и прочее
 * приложение не шлёт. `Vary: Origin` — потому что ответ с заголовком и без него различаются
 * по Origin, и любой кэш на пути обязан держать их раздельно.
 *
 * Принимает минимальную форму запроса, а не NextRequest — так её можно проверить без Next.
 */
export function appCorsHeaders(req: { method?: string; headers: { get(name: string): string | null } }): Record<string, string> {
  if ((req.method || 'GET').toUpperCase() !== 'GET') return {};
  const origin = req.headers.get('origin');
  if (!isAllowedAppOrigin(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin as string, Vary: 'Origin' };
}

/**
 * Дописывает заголовки CORS в уже собранный ответ и возвращает его же.
 *
 * Подключается обёрткой над ответом, а не правкой каждого `headers: {...}`: так в ручках не
 * меняется ни символа в Cache-Control, и все ветки (200, 400, 404, заглушка разработки)
 * получают заголовок одинаково — забыть одну ветку нельзя.
 */
export function withAppCors<R extends { headers: Headers }>(req: Parameters<typeof appCorsHeaders>[0], res: R): R {
  if ((req.method || 'GET').toUpperCase() !== 'GET') return res;
  // Vary: Origin — на КАЖДЫЙ ответ, а не только приложению. Ответ с заголовком CORS и без
  // него различаются по Origin, и кэш на пути обязан это знать по любому из них: иначе копия,
  // взятая для посетителя сайта (без Origin и без Vary), досталась бы приложению, и WebView
  // не отдал бы её странице. У /api/airports/counts стоит s-maxage — он общий кэш приглашает.
  // Дописывается, а не перезаписывается: Next или ручка могли уже назвать своё.
  const prev = res.headers.get('Vary');
  if (!prev) res.headers.set('Vary', 'Origin');
  else if (!/\borigin\b/i.test(prev)) res.headers.set('Vary', `${prev}, Origin`);
  const allow = appCorsHeaders(req)['Access-Control-Allow-Origin'];
  if (allow) res.headers.set('Access-Control-Allow-Origin', allow);
  return res;
}
