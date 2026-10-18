// Persistent flight-data store + monthly airlabs budget guard.
//
// Why this exists: airlabs is billed per request (100k/mo plan). Previously every
// on-demand SSR render fetched airlabs, so crawlers across 6072 airports burned the
// whole month's quota in ~2 days. This store decouples airlabs spend from traffic:
//   - reads are served from here (fresh within TTL, or stale as a fallback),
//   - only the human-facing path may spend quota, and only under a hard monthly cap,
//   - a bounded background warmer keeps the top hubs fresh.
// The counter is a best-effort backstop; the real guarantee is structural (crawlers never spend).
//
// 🔴 НЕСКОЛЬКО ПРОЦЕССОВ ОДНОВРЕМЕННО — с 18.10.2026.
//
// До этого хранилище было зеркалом в памяти ОДНОГО процесса, раз в 2 с целиком записываемым в
// один JSON на 69 МБ. 18.10 сайт встал под трафиком: Next.js держал одно ядро из четырёх, и
// разложить нагрузку можно только несколькими процессами (pm2 cluster). Со старым устройством
// каждый процесс считал бы расход сам, затирал бы файл соседей и покупал бы одни и те же борта
// независимо — прямой перерасход у airlabs.
//
// Теперь общее состояние живёт на диске так, чтобы его делили процессы:
//   • борт — свой маленький файл (entries/<ключ>.json), запись атомарная (tmp + rename),
//     чтение сверяет mtime, поэтому купленное одним процессом сразу видят остальные;
//   • расход — журналы только на дозапись, по байту на запрос (spend-<месяц>-<вид>):
//     O_APPEND атомарен между процессами, число запросов = размер файла;
//   • одновременная покупка одного борта склеивается файлом-замком (claimFetch);
//   • предел провайдера — meta.json.
// Заодно ушла синхронная запись 69 МБ, на время которой процесс не отвечал никому.
//
// Каталог данных — НЕ /tmp: Ubuntu очищает /tmp при загрузке (`D /tmp` в tmpfiles.d), и
// перезагрузка стёрла бы все купленные борта. Старый JSON импортируется сам (importLegacy).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AirlabsFlight } from '@/lib/flights';

/** Старый однофайловый JSON — только источник импорта. Фикстуры сборки по-прежнему кладут его. */
const LEGACY_PATH = process.env.FLIGHT_STORE_PATH || path.join(os.tmpdir(), 'airportsboard-flights.json');
/** Постоянный каталог данных сайта на боксе — общий для хранилища, архива и маршрутов. */
export const DATA_DIR = process.env.AIRPORTSBOARD_DATA_DIR || path.join(os.homedir(), 'airportsboard-data');
const STORE_DIR = process.env.FLIGHT_STORE_PATH ? `${process.env.FLIGHT_STORE_PATH}.d` : path.join(DATA_DIR, 'store');
const ENTRY_DIR = path.join(STORE_DIR, 'entries');
const LOCK_DIR = path.join(STORE_DIR, 'locks');
const META = path.join(STORE_DIR, 'meta.json');
const MARK = path.join(STORE_DIR, 'imported.json');

const TTL_MS = (Number(process.env.FLIGHT_TTL_SEC) || 600) * 1000;       // 10 min freshness window
// Hard backstop, deliberately just under the plan.
//
// This used to be the whole story, and it was wrong: the operator set
// AIRLABS_MONTHLY_CAP=195000 in anticipation of a larger plan, but airlabs still reports
// limits_by_month=100000, so the warmer was pacing to spend ~127k against a real 100k wall.
// It would have run the plan dry a few days before month end and taken every board on the
// site down with it — silently, because nothing in our own accounting knows the real limit.
//
// So the env var is now only a ceiling we ask for, never a promise. airlabs echoes the true
// figure in `request.key.limits_by_month` on EVERY response, and noteProviderLimit() records
// it; the effective cap is the lower of the two. Upgrading the plan therefore needs no code
// change and no env change — the first response after the upgrade raises the cap by itself.
/**
 * 🔴 ПЕРЕПИСАНО 06.09.2026. Прежняя редакция брала МИНИМУМ из этой переменной и лимита
 * провайдера — и абзац выше обещал, что «upgrading the plan needs no code change and no env
 * change». КОД ДЕЛАЛ ОБРАТНОЕ, и это стоило двух суток мёртвого прогрева.
 *
 * ЧТО СЛУЧИЛОСЬ. 04.09 план подняли до 1 000 000, и я поднял AIRLABS_MONTHLY_CAP в
 * .env.production. До работающего процесса это не доехало: рабочие переменные на VDS приходят
 * из окружения pm2 (`pm2 restart --update-env` + `pm2 save`), а окружение процесса в Next.js
 * ГЛАВНЕЕ файла .env.production. Значит здесь осталось прежнее число, и `Math.min` держал
 * потолок на нём, сколько бы провайдер ни разрешал.
 *
 * Наружу это не проявлялось НИКАК: ответы 200, страницы целые, все 37 проверок зелёные. Первым
 * симптомом стало то, что tickBudget() сел на аварийный пол в 40 запросов — тик брал двадцать
 * аэропортов вместо семисот. Замер 06.09: медиана возраста борта 11 часов, mega держался на
 * 29% норматива вместо вчерашних 100%. Обнаружено это было случайно, при разборе совсем другого
 * вопроса.
 *
 * ПОЧЕМУ ТЕПЕРЬ ПОБЕЖДАЕТ ПРОВАЙДЕР. Локальный потолок ниже провайдерского не защищает ни от
 * чего: перерасход невозможен в принципе — провайдер сам откажет, а тариф фиксированный, и
 * счёта за превышение не существует. То есть число меньше провайдерского способно ТОЛЬКО
 * заморить нас голодом, что оно и сделало. Переменная остаётся лишь на время, пока провайдер
 * ещё не ответил ни разу: после первого же ответа noteProviderLimit() записывает настоящий
 * лимит, и он становится потолком. Апгрейд плана снова не требует ни правки кода, ни правки
 * окружения — теперь уже на самом деле.
 *
 * Откуда взято число, видно в /api/airlabs-usage полем capSource — чтобы следующий разбор не
 * начинался с той же догадки, что и этот.
 */
const CONFIGURED_CAP = Number(process.env.AIRLABS_MONTHLY_CAP) || 0;
/** Потолок до первого ответа провайдера. Заведомо низкий: лучше недобрать, чем упереться. */
const BOOTSTRAP_CAP = 95000;

/** Сколько мы вправе потратить за месяц. Провайдер — источник истины, если он уже ответил. */
export function monthlyCap(): number {
  const observed = meta().providerLimit;
  if (observed && observed > 0) return observed;
  return CONFIGURED_CAP > 0 ? CONFIGURED_CAP : BOOTSTRAP_CAP;
}

/** Откуда взялся потолок — для диагностики, чтобы его происхождение не приходилось угадывать. */
export function capSource(): string {
  const observed = meta().providerLimit;
  if (observed && observed > 0) return `provider:${observed}`;
  return CONFIGURED_CAP > 0 ? `env:${CONFIGURED_CAP}` : `bootstrap:${BOOTSTRAP_CAP}`;
}

/**
 * Record the monthly limit airlabs reports for our key. Persisted so a restart does not
 * briefly forget it and let one over-generous warm cycle through.
 */
export function noteProviderLimit(limit: unknown): void {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return;
  if (meta().providerLimit === n) return;
  writeAtomic(META, JSON.stringify({ ...meta(), providerLimit: n }));
}

type Entry = { ts: number; data: AirlabsFlight[] };
/** Who spent the request. The plan is split between the two (see lib/warm.ts tickBudget),
 *  so a single total cannot answer "did visitors have enough left?". */
export type SpendKind = 'warm' | 'human';
type Kinds = Record<SpendKind, number>;
type Meta = { providerLimit?: number };
/** Формат старого однофайлового хранилища — только для импорта. */
type LegacyStore = {
  month: string; count: number; entries: Record<string, Entry>;
  byKind?: Kinds; providerLimit?: number;
};

const monthKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM (calendar month)

// ── файловые примитивы ────────────────────────────────────────────────────────

/** tmp + rename в том же каталоге: читатель видит либо старый файл целиком, либо новый. */
function writeAtomic(file: string, body: string): void {
  init();
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* временного файла может и не быть */ }
    throw e;
  }
}

function readJson<T>(file: string): T | null {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return null; }
}

/** Синхронная пауза: импорт идёт внутри синхронных геттеров, ждать там иначе нечем. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Эксклюзивный замок между процессами: создание файла с флагом wx атомарно. Замок старше
 * staleMs считается брошенным (процесс умер посреди работы) и перехватывается.
 */
function acquire(file: string, staleMs: number): boolean {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.closeSync(fs.openSync(file, 'wx'));
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      try {
        if (Date.now() - fs.statSync(file).mtimeMs < staleMs) return false;
        fs.unlinkSync(file);
      } catch { /* соседний процесс успел снять или перехватить — пробуем ещё раз */ }
    }
  }
  return false;
}

function release(file: string): void {
  try { fs.unlinkSync(file); } catch { /* уже снят */ }
}

// ── инициализация и импорт старого JSON ───────────────────────────────────────

let ready = false;
function init(): void {
  if (ready) return;
  ready = true;
  fs.mkdirSync(ENTRY_DIR, { recursive: true });
  fs.mkdirSync(LOCK_DIR, { recursive: true });
  try { importLegacy(); } catch (e) {
    console.error('[flightStore] импорт старого хранилища не удался:', (e as Error)?.message);
  }
}

type Mark = { legacyMtimeMs: number; month: string; byKind: Kinds; at: number; imported: number };

/**
 * Перенос старого /tmp/airportsboard-flights.json в новый каталог.
 *
 * Делается ДВАЖДЫ за выкат, и оба раза нужны. Первый — во время сборки: новый код читает
 * хранилище при пререндере, а старый процесс ещё работает и продолжает писать старый JSON.
 * Второй — при старте новых процессов: за минуты сборки старый процесс успел купить борта и
 * потратить запросы, и их надо дозабрать. Поэтому импорт сравнивает mtime старого файла с
 * отметкой прошлого импорта и переносит только РАЗНИЦУ: борта новее имеющихся и прирост
 * счётчика расхода с прошлого раза. После перезапуска старый JSON никто не пишет, и импорт
 * больше не срабатывает.
 *
 * Расход старого файла за текущий месяц ложится в base-<месяц>.json — к нему прибавляются
 * журналы новых процессов.
 */
function importLegacy(): void {
  let st: fs.Stats;
  try { st = fs.statSync(LEGACY_PATH); } catch { return; }
  const done = () => (readJson<Mark>(MARK)?.legacyMtimeMs ?? -1) >= st.mtimeMs;
  if (done()) return;

  const lock = path.join(STORE_DIR, 'import.lock');
  if (!acquire(lock, 5 * 60_000)) {
    // Импортирует соседний процесс (сборка параллелит пререндер по воркерам). Ждём его, иначе
    // этот процесс отрисует пустые борта и запечёт их в кэш.
    for (let waited = 0; waited < 180_000 && !done(); waited += 200) sleepSync(200);
    return;
  }
  try {
    if (done()) return;
    const legacy = readJson<LegacyStore>(LEGACY_PATH);
    if (!legacy) return;
    let imported = 0;
    for (const [key, e] of Object.entries(legacy.entries ?? {})) {
      const cur = readEntryFile(key);
      if (cur && cur.ts >= e.ts) continue;
      writeEntry(key, e);
      imported++;
    }
    if (legacy.providerLimit && !meta().providerLimit) {
      writeAtomic(META, JSON.stringify({ ...meta(), providerLimit: legacy.providerLimit }));
    }
    const warm = legacy.byKind?.warm ?? 0;
    const now: Kinds = { warm, human: Math.max(0, (legacy.count ?? 0) - warm) };
    const prev = readJson<Mark>(MARK);
    if (legacy.month === monthKey()) {
      const before: Kinds = prev?.month === legacy.month ? prev.byKind : { warm: 0, human: 0 };
      const baseFile = path.join(STORE_DIR, `base-${legacy.month}.json`);
      const base = readJson<Kinds>(baseFile) ?? { warm: 0, human: 0 };
      base.warm += Math.max(0, now.warm - before.warm);
      base.human += Math.max(0, now.human - before.human);
      writeAtomic(baseFile, JSON.stringify(base));
    }
    writeAtomic(MARK, JSON.stringify({ legacyMtimeMs: st.mtimeMs, month: legacy.month, byKind: now, at: Date.now(), imported } satisfies Mark));
    console.log(`[flightStore] импортировано из ${LEGACY_PATH}: бортов ${imported}`);
  } finally {
    release(lock);
  }
}

// ── борта ─────────────────────────────────────────────────────────────────────

const entryFile = (key: string) => path.join(ENTRY_DIR, `${encodeURIComponent(key)}.json`);

function readEntryFile(key: string): Entry | null {
  return readJson<Entry>(entryFile(key));
}

function writeEntry(key: string, e: Entry): void {
  const file = entryFile(key);
  writeAtomic(file, JSON.stringify(e));
  // mtime = время покупки: getStaleTs читает только его, не разбирая файл (прогрев опрашивает
  // тысячи ключей за тик).
  const t = new Date(e.ts);
  try { fs.utimesSync(file, t, t); } catch { /* не критично: ts есть и внутри файла */ }
}

/**
 * Разобранные борта этого процесса — LRU. Не весь корпус: при нескольких процессах полная копия
 * в каждом съела бы память машины. Свежесть сверяется по mtime файла при каждом чтении.
 */
const CACHE_MAX = 2500;
const cache = new Map<string, { mtimeMs: number; e: Entry }>();

function readEntry(key: string): Entry | null {
  init();
  let mtimeMs: number;
  try { mtimeMs = fs.statSync(entryFile(key)).mtimeMs; } catch { cache.delete(key); return null; }
  const hit = cache.get(key);
  if (hit && hit.mtimeMs === mtimeMs) {
    cache.delete(key); cache.set(key, hit); // освежить место в LRU
    return hit.e;
  }
  const e = readEntryFile(key);
  if (!e) return hit?.e ?? null; // файл подменяют прямо сейчас — отдаём прежний
  cache.delete(key);
  cache.set(key, { mtimeMs, e });
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
  return e;
}

/**
 * Сколько стоит одна запись борта — для /api/health. Раньше здесь была синхронная запись всего
 * JSON на 69 МБ, теперь — маленький файл одного борта.
 */
let persistStat = { at: 0, writeMs: 0, bytes: 0, count: 0 };
export function persistStats() { return persistStat; }

/** Fresh data within the TTL window, or null. */
export function getFresh(key: string): AirlabsFlight[] | null {
  const e = readEntry(key);
  return e && Date.now() - e.ts < TTL_MS ? e.data : null;
}
/** Any stored data regardless of age (serve-stale fallback), or null. */
export function getStale(key: string): AirlabsFlight[] | null {
  return readEntry(key)?.data ?? null;
}
/** When this key was last written, or null if never. Used by the warmer to decide what is due. */
export function getStaleTs(key: string): number | null {
  init();
  try { return Math.round(fs.statSync(entryFile(key)).mtimeMs); } catch { return null; }
}
export function put(key: string, data: AirlabsFlight[]) {
  const e: Entry = { ts: Date.now(), data };
  const t0 = Date.now();
  try {
    writeEntry(key, e);
    cache.delete(key);
    try { cache.set(key, { mtimeMs: fs.statSync(entryFile(key)).mtimeMs, e }); } catch { /* прочтётся с диска */ }
    persistStat = { at: t0, writeMs: Date.now() - t0, bytes: 0, count: persistStat.count + 1 };
  } catch (err) {
    console.error('[flightStore] не удалось записать борт', key, (err as Error)?.message);
  }
}

/**
 * Замок на покупку борта между процессами. Внутри процесса одновременные обращения склеивает
 * карта inflight в lib/flights.ts; эта функция делает то же между процессами pm2 cluster.
 * false — борт уже покупает соседний процесс: ждать его результата, а не покупать второй раз.
 */
export function claimFetch(key: string): boolean {
  init();
  return acquire(path.join(LOCK_DIR, encodeURIComponent(key)), 20_000);
}
export function releaseFetch(key: string): void {
  release(path.join(LOCK_DIR, encodeURIComponent(key)));
}

// ── расход ────────────────────────────────────────────────────────────────────

const ledger = (month: string, kind: SpendKind) => path.join(STORE_DIR, `spend-${month}-${kind}`);
const size = (file: string) => { try { return fs.statSync(file).size; } catch { return 0; } };

function spentByKind(): Kinds {
  init();
  const month = monthKey();
  const base = readJson<Kinds>(path.join(STORE_DIR, `base-${month}.json`)) ?? { warm: 0, human: 0 };
  return {
    warm: base.warm + size(ledger(month, 'warm')),
    human: base.human + size(ledger(month, 'human')),
  };
}

function meta(): Meta {
  init();
  return readJson<Meta>(META) ?? {};
}

/** True while we are still under the monthly airlabs budget. */
export function canSpend(): boolean {
  const s = spentByKind();
  return s.warm + s.human < monthlyCap();
}

/**
 * The share of the plan held for live visitor traffic, as a number of requests.
 *
 * Held as a SHARE of the cap rather than an absolute number so the split survives a plan
 * change: the intended 130k warm / 70k human split on a 200k plan is 35% reserved, and on a
 * 100k plan the same 35% keeps the ratio instead of starving the warmer down to 25k.
 * AIRLABS_HUMAN_RESERVE still overrides with an absolute figure if that is wanted.
 *
 * Both directions of the split read this one function, because they have to agree: warm.ts
 * stops warming once only the reserve is left, and lib/live-budget.ts stops serving live
 * fetches once visitors have spent it. Only the first half of that existed for a long time —
 * `canSpend()` looks at the total alone — so live traffic was free to eat the warmer's 88%.
 */
export function humanReserve(): number {
  const abs = process.env.AIRLABS_HUMAN_RESERVE;
  if (abs !== undefined) return Number(abs);
  const pct = Number(process.env.AIRLABS_HUMAN_RESERVE_PCT ?? 35) / 100;
  return Math.round(monthlyCap() * pct);
}

/** Один байт в журнал месяца: дозапись с O_APPEND атомарна между процессами. */
export function spend(kind: SpendKind = 'human') {
  init();
  try { fs.appendFileSync(ledger(monthKey(), kind), '.'); } catch (e) {
    console.error('[flightStore] не удалось учесть расход:', (e as Error)?.message);
  }
}

export function usage() {
  const byKind = spentByKind();
  const count = byKind.warm + byKind.human;
  const m = meta();
  return {
    month: monthKey(), count, cap: monthlyCap(),
    configuredCap: CONFIGURED_CAP || null, providerLimit: m.providerLimit ?? null, capSource: capSource(),
    remaining: Math.max(0, monthlyCap() - count),
    warm: byKind.warm, human: byKind.human,
  };
}
