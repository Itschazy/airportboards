import type { NextRequest } from 'next/server';
import { usage, humanReserve, monthlyCap } from '@/lib/flightStore';

/**
 * Who is allowed to spend airlabs quota on a live fetch.
 *
 * The rule this replaces was a blocklist — `live = !BOT_RE.test(ua)` — and it failed OPEN:
 * anything the pattern did not name counted as a person. okhttp, Dart/dart:io, bare
 * node/undici, PostmanRuntime, Guzzle, Faraday, reqwest, .NET HttpClient, an EMPTY User-Agent
 * and any copied Chrome string all passed. Each pass can force one provider call per store key
 * per TTL window, and /api/flights is undocumented but unauthenticated, so walking it cost:
 * 6,072 served airports x 2 directions = 12,144 keys = 12,144 calls = 6.1% of a 195k month,
 * 1.8x an entire day of warming — repeatable every FLIGHT_TTL_SEC (600s). Nothing but the
 * monthly cap stood in the way, i.e. the plan could be emptied in an afternoon and every board
 * on the site would then sit stale until the 1st.
 *
 * Three layers, each failing closed:
 *
 *   1. Positive browser recognition instead of bot naming. A visitor arrives in a browser, and
 *      a browser sends "Mozilla/5.0" AND an engine token; the libraries above send neither, so
 *      they now read the store like crawlers already did. An attacker defeats this by copying a
 *      Chrome string, and that is fine — the layer exists to remove the whole class of
 *      accidental drain by default HTTP clients, which is what an open endpoint actually meets.
 *
 *   2. A per-IP cap on the number of DISTINCT BOARDS per hour, not on requests. That is the
 *      shape difference between the two populations: a visitor polls one or two boards over and
 *      over (free inside the TTL, and at most ~6 calls an hour per board once outside it),
 *      while a sweep needs breadth — 12,144 different keys. Capping breadth leaves normal use
 *      untouched and cuts a single-source sweep by ~300x.
 *      The cap is deliberately loose because 69.7% of this site's traffic is Russian mobile,
 *      where carrier CGNAT puts many unrelated visitors behind one address: a tight per-IP
 *      number would degrade real users on MTS/Beeline long before it caught a scraper.
 *
 *   3. A hard monthly ceiling on human spend, which is the layer that actually bounds a
 *      distributed sweep — many addresses with copied UAs pass both layers above. warm.ts
 *      already reserves a share of the plan for live traffic; holding live traffic to that same
 *      share completes the split and bounds the worst case to the reserve however the requests
 *      arrive.
 *
 * Refusal is never an error and never visible: the caller falls back to the store, exactly as
 * it already does for crawlers, so a throttled client still gets a board — just not a newly
 * paid-for one.
 */

/** A crawler that copies a browser UA still usually names itself. Kept from the old rule. */
const BOT_RE = /bot|crawl|spider|slurp|bing|yandex|google|baidu|duckduck|facebook|embed|preview|fetch|monitor|lighthouse|headless|wget|curl|python|java|go-http|axios|node-fetch/i;

/** Every mainstream browser still opens with this, twenty years of cargo cult later. */
const BROWSER_PREFIX = /^Mozilla\/5\.0\b/;

/**
 * ...and names an engine or a build. AppleWebKit and the bare `Mobile/15E148` form are both
 * accepted on purpose: an iOS in-app WKWebView (a link opened inside VK or Telegram) sends
 * neither `Safari/` nor `Chrome/`, and 32% of this site's visits arrive inside app webviews.
 */
const ENGINE_TOKEN = /\b(?:AppleWebKit|Gecko|Chrome|CriOS|Chromium|Firefox|FxiOS|Safari|Version|Mobile|Edg|EdgiOS|OPR|OPiOS|YaBrowser|SamsungBrowser|Vivaldi)\/[\w.]+/;

const WINDOW_MS = 60 * 60 * 1000;
const PER_IP_BOARDS = Number(process.env.LIVE_BOARDS_PER_IP_HOUR) || 40;
/** Bound on the table itself, so rotating addresses cannot grow it without limit. */
const MAX_TRACKED_IPS = 4000;

/** ip -> boardKey -> last time a live fetch was admitted for it. */
const perIp = new Map<string, Map<string, number>>();

/** Счётчики решений с последнего перезапуска — единственное окно в слой, который молчит. */
let admitted = 0;
const refused = { notBrowser: 0, budget: 0, perIp: 0, localhost: 0 };

/**
 * Явное имя обходчика. Отдельно от BOT_RE, потому что BOT_RE — список ПОДСТРОК, а обходчик
 * всегда называет себя словом: Googlebot/2.1, YandexBot/3.0, AhrefsBot/7.0.
 */
const CRAWLER_NAME = /bot\/|\bbot\b|crawler|spider|slurp|headless|lighthouse/i;

/**
 * Встроенные браузеры приложений, в названии которых сидит подстрока из BOT_RE.
 *
 * Приложение Яндекса на iOS отдаёт «… Mobile/15E148 YandexSearch/23.101.1», и BOT_RE ловил в
 * этом «yandex» — то есть живой читатель, пришедший из главного поставщика трафика сайта,
 * считался обходчиком и свежих данных не получал никогда. 88% визитов приходят из Яндекса, и
 * заметная их часть открывает страницу внутри его же приложения.
 *
 * Проверяется ПОСЛЕ имени обходчика, поэтому «YandexBot» сюда не проскочит.
 */
const APP_BROWSER = /\b(?:YaSearchApp|YaSearchBrowser|YandexSearch|YaApp_[A-Za-z]+|YaBrowser)\/[\w.]+/;

function looksLikeBrowser(ua: string): boolean {
  if (!BROWSER_PREFIX.test(ua) || !ENGINE_TOKEN.test(ua)) return false;
  if (CRAWLER_NAME.test(ua)) return false;
  if (APP_BROWSER.test(ua)) return true;
  return !BOT_RE.test(ua);
}

/**
 * The client address, taken from the RIGHT-most X-Forwarded-For entry.
 *
 * Not the left-most, which is the usual reading: nginx's `$proxy_add_x_forwarded_for` APPENDS
 * the peer to whatever the client sent, so the left-most entry is client-controlled and using
 * it would let one attacker present a fresh identity per request and walk straight through
 * layer 2. The right-most entry is the hop our own proxy added. X-Real-IP is preferred when
 * present for the same reason — nginx sets it from `$remote_addr`.
 */
function clientKey(h: Headers): string {
  const real = h.get('x-real-ip')?.trim();
  if (real) return real;
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const hops = xff.split(',');
    return hops[hops.length - 1].trim();
  }
  return 'direct';
}

function dropExpired(seen: Map<string, number>, now: number): void {
  for (const [key, ts] of seen) if (now - ts > WINDOW_MS) seen.delete(key);
}

function sweepTable(now: number): void {
  for (const [ip, seen] of perIp) {
    dropExpired(seen, now);
    if (seen.size === 0) perIp.delete(ip);
  }
}

/**
 * Layer 2. Repeat views of a board already admitted this hour stay free — that is the visitor
 * pattern, and the TTL bounds what it can cost — while reaching a new board consumes budget.
 */
function admitBoard(ip: string, boardKey: string): boolean {
  const now = Date.now();
  let seen = perIp.get(ip);
  if (!seen) {
    if (perIp.size >= MAX_TRACKED_IPS) sweepTable(now);
    if (perIp.size >= MAX_TRACKED_IPS) return false; // still full of live entries: fail closed
    seen = new Map();
    perIp.set(ip, seen);
  }
  dropExpired(seen, now);
  if (!seen.has(boardKey) && seen.size >= PER_IP_BOARDS) return false;
  seen.set(boardKey, now);
  return true;
}

/** Layer 3. Visitors get the reserve warm.ts leaves them, and not the warmer's share. */
function withinHumanReserve(): boolean {
  return usage().human < humanReserve();
}

/**
 * Сколько борт вправе быть старым, прежде чем читатель видит вчерашнее.
 *
 * То же окно, что у TTL хранилища (FLIGHT_TTL_SEC, 600 с): внутри него getFresh отдаёт
 * запись и до оплаты дело вообще не доходит, значит просить свежесть раньше бессмысленно.
 */
const STALE_MS = (Number(process.env.FLIGHT_TTL_SEC) || 600) * 1000;

/**
 * Доля месячного плана, которую нельзя отнять у прогрева ни при каких обстоятельствах.
 *
 * Нижний слой обороны для случая, когда живых читателей внезапно много: прогрев — то, что
 * наполняет борта, которых никто не смотрит прямо сейчас, но которые завтра откроют из
 * поиска. Отдать ему ноль значит выменять сегодняшний день на все следующие.
 */
const WARM_FLOOR_PCT = 0.35;


/**
 * Слой 3-бис: СВЕЖЕСТЬ ДЛЯ ТОГО, КТО СМОТРИТ, важнее очереди прогрева.
 *
 * Замер 04.09 в 04:38: ни один борт из двадцати одного самого посещаемого аэропорта не был
 * свежее десяти минут. Ни один. Медиана — девять часов, при том что девятью часами раньше
 * шёл вечерний пик и одну только Казань за это время открыли десятки раз. Разница с
 * контрольной группой без трафика (20 часов) объясняется целиком закреплением в прогреве, а
 * не посетителями. То есть живой путь не покупал данные НИКОГДА.
 *
 * Виноват потолок: withinHumanReserve сравнивает месячный счётчик людей с долей плана, и как
 * только доля выбрана, отказ становится вечным до первого числа. Отказ по построению молчит —
 * читатель просто видит вчерашний борт, и снаружи это неотличимо от исправной работы. Так оно
 * и жило.
 *
 * Здесь потолок перестаёт быть обрывом. Читателю, у которого борт СТАРШЕ окна свежести,
 * разрешено взять запрос сверх людской доли — но не дальше пола, оставленного прогреву.
 * Ограничение сверху остаётся, меняется только то, что упирается в него не человек с
 * устаревшей страницей, а фоновая задача.
 *
 * Расход этим не отпускается на волю: getFresh внутри TTL отдаёт запись бесплатно, поэтому
 * цена ограничена ЧИСЛОМ РАЗНЫХ БОРТОВ, а не числом посетителей — не больше шести обращений
 * в час на борт, сколько бы человек его ни открыло.
 */
function freshnessOverride(ageMs: number | null): boolean {
  // ageMs === null — записи нет вовсе: борт холодный, это самая устаревшая из возможных
  // ситуаций, и право на свежесть тут тем более уместно.
  if (ageMs !== null && ageMs < STALE_MS) return false;   // борт свежий — доплачивать не за что
  return usage().count < monthlyCap() * (1 - WARM_FLOOR_PCT);
}

/**
 * True if this request may trigger a paid provider call. False means "read the store", which
 * is a normal, complete answer — see the note on refusal above.
 *
 * `ageMs` ПРИХОДИТ СНАРУЖИ, а не считается здесь, и это не мелочь. Первая версия звала
 * getStaleTs(boardKey) сама, но boardKey тут — ключ для слоя 2 («departures:BJV»), а ключ
 * хранилища выглядит иначе («departures:dep_iata=BJV»). getStaleTs возвращал null всегда,
 * условие «борт устарел» не срабатывало ни разу, и право на свежесть молча раздавалось всем
 * подряд. Формат ключа хранилища знает lib/flights.ts (getBoardFetchedAt) — пусть он один и
 * знает; заводить его второе описание здесь значит заводить второй источник правды.
 */
export function mayFetchLive(req: NextRequest, boardKey: string, ageMs: number | null): boolean {
  return mayFetchLiveFor(req.headers, req.nextUrl.hostname, boardKey, ageMs);
}

/**
 * То же решение, но по одним заголовкам — для СЕРВЕРНОГО РЕНДЕРА страницы.
 *
 * Зачем понадобилось. Читатель приходит из поиска и первым экраном видит то, что отрисовал
 * сервер. Клиентский опрос догоняет свежесть за секунду-полторы, но эту секунду человек уже
 * смотрит на вчерашнее табло — а на странице, где половина строк «вылетел», секунды хватает,
 * чтобы закрыть вкладку. Значит решение «покупать или читать хранилище» нужно и на рендере.
 *
 * Ядро ОДНО на оба пути намеренно. Развести их значило бы завести два набора правил про
 * деньги, которые разъедутся при первой же правке одного из них.
 *
 * Хост берётся из заголовка, а не из NextRequest: на рендере страницы объекта запроса нет.
 * Порт отрезается — слой 0 сравнивает имена, а не «localhost:3000».
 */
export function mayFetchLiveFor(h: Headers, host: string, boardKey: string, ageMs: number | null): boolean {
  const name = (host || '').toLowerCase().split(':')[0];
  if (name === 'localhost' || name === '127.0.0.1' || name === '::1' || name.endsWith('.local')) {
    refused.localhost++;
    return false;
  }
  if (!looksLikeBrowser(h.get('user-agent') || '')) { refused.notBrowser++; return false; }
  // Людская доля ИЛИ право на свежесть — второе не обходит слой 2, только слой 3.
  if (!withinHumanReserve() && !freshnessOverride(ageMs)) { refused.budget++; return false; }
  if (!admitBoard(clientKey(h), boardKey)) { refused.perIp++; return false; }
  admitted++;
  return true;
}

/** Operator visibility, for /api/airlabs-usage: is either throttle actually being reached? */
export function liveBudgetStats() {
  const now = Date.now();
  sweepTable(now);
  let boards = 0;
  let widest = 0;
  for (const seen of perIp.values()) {
    boards += seen.size;
    if (seen.size > widest) widest = seen.size;
  }
  const u = usage();
  return {
    trackedIps: perIp.size,
    boardsThisHour: boards,
    widestIpThisHour: widest,
    perIpLimit: PER_IP_BOARDS,
    humanSpent: u.human,
    humanCeiling: humanReserve(),
    // Отказы по причинам. Их не было видно ВООБЩЕ, и именно поэтому мёртвый живой путь
    // прожил незамеченным: каждый отказ по построению молчит и выглядит как исправная
    // отдача из хранилища. Считаем с последнего перезапуска процесса.
    admitted,
    refused: { ...refused },
    warmFloor: Math.round(monthlyCap() * WARM_FLOOR_PCT),
    staleWindowSec: Math.round(STALE_MS / 1000),
  };
}
