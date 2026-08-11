import airports from '@/data/airports.json';
import airportLabels from '@/data/airport-labels.json';
import airlines from '@/data/airlines.json';
import { getCityName } from '@/lib/places';
import { getFresh, getStale, getStaleTs, put, canSpend, spend, noteProviderLimit, type SpendKind } from '@/lib/flightStore';
import { archiveBoard } from '@/lib/board-archive';
import { getActiveEventAirports } from '@/lib/event-content';
import { dueAirports, tickBudget } from '@/lib/warm';

const AIRLABS_KEY = process.env.AIRLABS_API_KEY || '';
export const CACHE_SECONDS = 60;
const MAX_FLIGHTS = 80;

export type AirlabsFlight = {
  airline_iata: string;
  flight_iata: string;
  flight_number: string;
  aircraft_icao?: string | null;
  cs_flight_iata?: string | null;
  dep_iata: string;
  dep_terminal?: string;
  dep_gate?: string;
  dep_time: string;
  dep_time_ts?: number;
  dep_estimated?: string | null;
  dep_estimated_ts?: number | null;
  dep_delayed?: number | null;
  arr_iata: string;
  arr_terminal?: string;
  arr_gate?: string;
  arr_baggage?: string | null;
  arr_time: string;
  arr_time_ts?: number;
  arr_estimated?: string | null;
  arr_estimated_ts?: number | null;
  arr_delayed?: number | null;
  status: string;
};

// De-dupe concurrent live fetches of the same query (thundering-herd guard).
const inflight = new Map<string, Promise<AirlabsFlight[]>>();

const CITY_BY_IATA: Record<string, string> = {};
for (const a of airports as { iata: string; city: string }[]) {
  if (a.iata) CITY_BY_IATA[a.iata] = a.city;
}
export const AIRLINE = airlines as Record<string, string>;
export const airlineName = (iata: string) => AIRLINE[iata] ?? AIRLINE[`${iata}*`] ?? iata;

function timePart(datetime: string | null | undefined): string {
  if (!datetime) return '';
  return (datetime.split(' ')[1] ?? '').slice(0, 5);
}

/**
 * Подпись направления в строке табло: «Казань (KZN)», а не «KZN».
 *
 * Провайдер рейсов знает коды, которых нет в нашем срезе OurAirports, и строка печатала голый
 * код — во всех двенадцати локалях, включая aria-label для незрячих. Ни один такой код не
 * имеет измеренных регулярных рейсов, то есть собственной страницы у него нет и не будет; он
 * существует только как пункт назначения в чужой строке. Поэтому подписи лежат в отдельном
 * плоском справочнике (data/airport-labels.json, 2506 записей), который НЕ участвует в
 * генерации страниц: дополнить им data/airports.json значило бы завести 37 884 новых URL на
 * сайте, который уже получал бан за массовые страницы.
 *
 * Если города нет и там — остаётся код. Это честнее выдуманного названия.
 */
const LABELS = airportLabels as Record<string, { city: string; country: string; name: string }>;

function airportLabel(iata: string, locale: string): string {
  const city = CITY_BY_IATA[iata] ?? LABELS[iata]?.city;
  if (!city) return iata;
  return `${getCityName(city, locale)} (${iata})`;
}

/**
 * @param asOfSec Unix seconds of the SNAPSHOT this row came from — not the current time.
 *
 * The distinction is the whole point. The two "the clock has passed it, so it has happened"
 * inferences below cover for airlabs lagging its own `status` field, and they are sound only
 * against the moment the data was taken. Measured against `Date.now()` they keep firing long
 * after the snapshot went stale, and then they are not inference but invention: on 2026-08-08
 * the Kazan arrivals board was serving a 2h19m-old snapshot in which 15 consecutive rows read
 * "Получение багажа" — and for 5 of them the scheduled landing was LATER than the snapshot
 * itself, so nothing in our data said anything about them at all. One was a flight from
 * Hurghada shown in green, "at baggage claim", directly under a line saying the data was two
 * hours old.
 *
 * With the snapshot time, a flight whose schedule expired after the data was taken simply keeps
 * whatever the provider last said. That is less confident and it is true; the board already
 * prints the age of its data next to it.
 *
 * Defaults to now() so the client-side path, which has no snapshot to reason about, behaves as
 * before rather than silently changing meaning.
 */
export function mapStatus(f: AirlabsFlight, direction: 'departures' | 'arrivals', asOfSec = Date.now() / 1000): string {
  if (f.status === 'cancelled' || f.status === 'diverted') return 'cancelled';
  if (direction === 'arrivals') {
    if (f.status === 'landed') return 'baggage';
    // airlabs often lags the 'landed' status — if the (estimated) arrival time had
    // already passed WHEN THE SNAPSHOT WAS TAKEN, the flight was on the ground.
    const arrTs = f.arr_estimated_ts || f.arr_time_ts;
    if (arrTs && arrTs <= asOfSec) return 'baggage';
    if ((f.arr_delayed ?? 0) > 15) return 'delayed';
    return 'ontime';
  }
  if (f.status === 'active' || f.status === 'landed') return 'departed';
  // Mirror of the arrivals guard above: airlabs lags the status field, so a flight whose
  // (estimated) departure time has passed is gone, whatever `dep_delayed` still says. This
  // check used to sit BELOW the delay check, which left departed flights showing "Delayed"
  // indefinitely — JFK was advertising seven of them 1.5 hours after pushback. Worse, the
  // delay statistics line counts anything not 'departed', so those ghosts inflated both its
  // numerator and its denominator, corrupting the one original figure the hub pages publish.
  const depTs = f.dep_estimated_ts || f.dep_time_ts;
  // Against the snapshot, for the same reason as arrivals: a stale board would otherwise
  // "depart" every flight on it as the clock rolled past, and "Boarding"/"Final call" —
  // statuses that describe a gate right now — would be assigned from data hours old.
  const minsUntil = depTs ? (depTs - asOfSec) / 60 : null;
  if (minsUntil !== null && minsUntil <= 0) return 'departed';
  if ((f.dep_delayed ?? 0) > 15) return 'delayed';
  if (minsUntil !== null) {
    if (minsUntil <= 10) return 'finalcall';
    if (minsUntil <= 30) return 'boarding';
  }
  return 'ontime';
}

export function mapFlight(f: AirlabsFlight, direction: 'departures' | 'arrivals', locale: string, asOfSec = Date.now() / 1000) {
  const flightNum = (f.flight_iata && f.flight_iata.replace('-', ' ').trim())
    || [f.airline_iata, f.flight_number].filter(Boolean).join(' ').trim()
    || '—';
  const airline   = airlineName(f.airline_iata);
  const status    = mapStatus(f, direction, asOfSec);
  const scheduled = timePart(direction === 'departures' ? f.dep_time : f.arr_time);
  const estimated = timePart(direction === 'departures' ? f.dep_estimated : f.arr_estimated);
  // Show the effective (estimated/actual) time as the primary time whenever it
  // differs from scheduled — this keeps the displayed time CONSISTENT with the
  // sort key (fetchRaw orders by the estimated timestamp), so the list never looks
  // out of order. The scheduled time is rendered struck-through next to it.
  const actual    = estimated && estimated !== scheduled ? estimated : undefined;
  const gate     = direction === 'departures' ? f.dep_gate    : f.arr_gate;
  const terminal = direction === 'departures' ? f.dep_terminal : f.arr_terminal;
  const baggage  = direction === 'arrivals' ? f.arr_baggage : undefined;
  const aircraft = f.aircraft_icao || undefined;
  const delay    = (direction === 'departures' ? f.dep_delayed : f.arr_delayed) || undefined;
  return {
    flight: flightNum,
    airline,
    arrIata: f.arr_iata,
    depIata: f.dep_iata,
    airlineIata: f.airline_iata,
    ...(direction === 'departures'
      ? { destination: airportLabel(f.arr_iata, locale) }
      : { origin:      airportLabel(f.dep_iata, locale) }),
    scheduled,
    ...(actual ? { actual } : {}),
    ...(gate     ? { gate }     : {}),
    ...(terminal ? { terminal } : {}),
    ...(baggage  ? { baggage }  : {}),
    ...(aircraft ? { aircraft } : {}),
    ...(delay    ? { delay }    : {}),
    // Effective time as a unix timestamp, alongside the "HH:MM" the row displays.
    //
    // Without it the client can only reason about time through the printed string, and that
    // string cannot tell "already gone" from "still to come": a board that has rolled past
    // midnight prints 23:50 above 00:25, and a row the sort put in the past still carries
    // status 'ontime' (SVO had 24 such rows). Everything downstream that needs the past/future
    // boundary — how many rows to render, which rows to mute — was guessing at it from the
    // status field, which is a different question.
    ts: (direction === 'departures'
      ? (f.dep_estimated_ts || f.dep_time_ts)
      : (f.arr_estimated_ts || f.arr_time_ts)) || 0,
    status,
  };
}

export type FlightRow = ReturnType<typeof mapFlight>;

// Show arrivals that landed within the last ~2h, so people meeting a flight can
// see when it touched down (could have been 10 min ago).
const RECENT_ARR_WINDOW = 2 * 60 * 60;
const RECENT_ARR_MAX = 50; // cap recently-landed shown, so upcoming arrivals still fit

// Read flight schedules for a query (board / route / flight), served from the persistent
// store. airlabs is only contacted on the HUMAN-facing path (`opts.live`) and only while
// under the monthly budget — SSR page renders (which crawlers trigger across 6072 airports)
// pass live:false and NEVER spend quota, so airlabs cost is decoupled from crawl volume.
// Falls back to stale store data, then empty. Never throws.
export async function fetchRaw(
  query: string,
  direction: 'departures' | 'arrivals' = 'departures',
  opts: { live?: boolean; kind?: SpendKind } = {},
): Promise<AirlabsFlight[]> {
  const cacheKey = `${direction}:${query}`;
  const fresh = getFresh(cacheKey);
  if (fresh) return fresh;
  if (!opts.live || !AIRLABS_KEY || !canSpend()) return getStale(cacheKey) ?? [];
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const p = doFetch(query, direction, cacheKey, opts.kind ?? 'human').finally(() => inflight.delete(cacheKey));
  inflight.set(cacheKey, p);
  return p;
}

/**
 * Put a board in reading order: what is about to happen first, what just happened around it.
 *
 * Called twice, and that is the point. Ordering used to happen only inside the paid fetch, so
 * the sequence froze at the moment the snapshot was taken while the statuses kept being
 * recomputed — on 2026-08-08 the Kazan arrivals board opened on FIFTEEN consecutive landed
 * flights, and the first arrival still to come was row sixteen, four rows below the twelve the
 * board renders. Someone meeting a flight saw nothing but aircraft already on the ground.
 *
 * `prune` separates the two uses. Inside the fetch it also TRIMS: old arrivals outside the
 * window are dropped so a busy hub does not spend its row budget on history. At read time it
 * must only REORDER — a board that has gone stale would otherwise have every row fall outside
 * the window at once and arrivals would render empty, which is worse than out of order.
 *
 * Ordering uses the reader's clock while statuses use the snapshot's (see mapStatus). Different
 * questions: "what is next" is about now, "did it land" is about what the data actually saw.
 */
function orderBoard(rows: AirlabsFlight[], direction: 'departures' | 'arrivals', nowSec: number,
                    { prune = false }: { prune?: boolean } = {}): AirlabsFlight[] {
  const tsOf = (f: AirlabsFlight) => (direction === 'arrivals'
    ? (f.arr_estimated_ts || f.arr_time_ts)
    : (f.dep_estimated_ts || f.dep_time_ts)) || 0;
  const asc = (a: AirlabsFlight, b: AirlabsFlight) => tsOf(a) - tsOf(b);

  const anyUpcoming = rows.some(f => tsOf(f) >= nowSec);
  // A board whose every row is already in the past is not a board with a past section — it is
  // a stale snapshot, and the only sane presentation is a plain timeline. Both branches below
  // split around "now", which is meaningless when nothing is on the future side: departures
  // came out in REVERSE (most recent first, so 10:40 above 09:30 on a 13-hour-old DME board)
  // and arrivals came out incoherent — head, then an empty middle, then the oldest row last.
  // Measured on production 2026-08-09: DME 13h, VKO 15h, CMN 17h, WAW and ESB a full day,
  // KJA 59h. Not a corner case — MAX_FLIGHTS covers 1–4 hours of a dense board while the warm
  // interval is 6–24 hours, so a busy airport is in this state most of the cycle.
  if (!anyUpcoming) return [...rows].sort(asc);

  if (direction === 'arrivals') {
    const past = rows.filter(f => tsOf(f) < nowSec).sort(asc);
    const upcoming = rows.filter(f => tsOf(f) >= nowSec).sort(asc);
    if (prune) {
      const recent = past.filter(f => tsOf(f) >= nowSec - RECENT_ARR_WINDOW).slice(-RECENT_ARR_MAX);
      return [...recent, ...upcoming];
    }
    // Read time: a couple of just-landed flights answer "has it arrived yet", everything still
    // to come goes next, and the older landings keep their place at the bottom rather than
    // being thrown away.
    const head = past.slice(-RECENT_ARR_HEAD);
    const tail = past.slice(0, Math.max(0, past.length - RECENT_ARR_HEAD));
    return [...head, ...upcoming, ...tail];
  }

  const cmp = (a: AirlabsFlight, b: AirlabsFlight) => {
    const ta = tsOf(a), tb = tsOf(b);
    const aUp = ta >= nowSec, bUp = tb >= nowSec;
    if (aUp !== bUp) return aUp ? -1 : 1;
    return aUp ? ta - tb : tb - ta;   // upcoming ascending, departed most-recent-first
  };
  return [...rows].sort(cmp);
}

async function doFetch(query: string, direction: 'departures' | 'arrivals', cacheKey: string, kind: SpendKind): Promise<AirlabsFlight[]> {
  const url = `https://airlabs.co/api/v9/schedules?${query}&api_key=${AIRLABS_KEY}`;
  let json: {
    response?: AirlabsFlight[];
    error?: { message?: string };
    request?: { key?: { limits_by_month?: number } };
  };
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    spend(kind); // any answered airlabs request counts against the monthly budget
    if (!res.ok) return getStale(cacheKey) ?? [];
    json = await res.json();
  } catch {
    return getStale(cacheKey) ?? []; // network/timeout — keep serving last good data
  }
  // Every response echoes the real monthly allowance for our key. Recording it lets the
  // budget clamp itself to what the plan actually is, instead of trusting an env var that
  // was set in anticipation of an upgrade that had not landed. Done before the validity
  // checks below on purpose: an error response still carries an accurate limit.
  noteProviderLimit(json?.request?.key?.limits_by_month);
  if (!json || json.error || !Array.isArray(json.response)) return getStale(cacheKey) ?? [];
  let raw = (json.response as AirlabsFlight[]).filter(f => !f.cs_flight_iata);
  const now = Date.now() / 1000;
  const tsOf = (f: AirlabsFlight) => (direction === 'arrivals'
    ? (f.arr_estimated_ts || f.arr_time_ts)
    : (f.dep_estimated_ts || f.dep_time_ts)) || 0;

  raw = orderBoard(raw, direction, now, { prune: true });

  raw = raw.slice(0, MAX_FLIGHTS);
  put(cacheKey, raw);
  // Every paid snapshot goes to the append-only archive — the store keeps only the latest
  // board per airport, so without this each refresh destroys the history it replaces. Plain
  // board queries only: route/flight/airline lookups are slices of the same boards.
  const board = query.match(/^(dep|arr)_iata=([A-Z0-9]{3})$/);
  if (board) archiveBoard(board[1] === 'dep' ? 'departures' : 'arrivals', board[2], raw);
  return raw;
}

// High-level helpers.
// Each helper sanity-filters the raw response to rows that ACTUALLY match what was
// requested. airlabs returns a fixed demo set (always the same ~6 Russian flights,
// incl. a nonsensical SVO→SVO) when the API key is invalid / over-quota — without this
// guard every airport board rendered identical fake flights (catastrophic duplicate
// content + user-facing fake data). The filter is a no-op when real data is returned.
/** How many already-landed arrivals stay at the top when re-ordering for display. */
const RECENT_ARR_HEAD = 3;

const norm = (s?: string) => (s || '').toUpperCase().replace(/[\s-]/g, '');

// `live` = may this call spend airlabs quota? Pages (SSR / crawler-triggered) pass false
// (read store only). The client /api/* path passes true for human (non-bot) requests.
export async function getBoard(iata: string, direction: 'departures' | 'arrivals', locale: string, live = false, kind: SpendKind = 'human'): Promise<FlightRow[]> {
  const code = iata.toUpperCase();
  const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  const raw = await fetchRaw(param, direction, { live, kind });
  const own = raw.filter(f => (direction === 'departures' ? f.dep_iata : f.arr_iata) === code);
  // Statuses are derived against the moment the data was taken, not the moment we answer.
  // getStaleTs is the same value getBoardFetchedAt() publishes as "updated N ago", so the
  // status and the freshness line can no longer tell the reader different stories.
  const asOfMs = getStaleTs(`${direction}:${param}`);
  const asOfSec = asOfMs ? asOfMs / 1000 : Date.now() / 1000;
  const ordered = orderBoard(own, direction, Date.now() / 1000);
  return ordered.map(f => mapFlight(f, direction, locale, asOfSec));
}

/** When the stored board for this airport/direction was last written by airlabs, or null.
 *  This is the age of the DATA, which is not the same as when we answered the request —
 *  a tail airport is refreshed daily, so a board served instantly can still be a day old.
 *  The UI shows this rather than the response time, so "updated now" is never a lie. */
export function getBoardFetchedAt(iata: string, direction: 'departures' | 'arrivals'): number | null {
  const code = iata.toUpperCase();
  const param = direction === 'departures' ? `dep_iata=${code}` : `arr_iata=${code}`;
  return getStaleTs(`${direction}:${param}`);
}

export async function getRoute(from: string, to: string, locale: string, live = false): Promise<FlightRow[]> {
  const F = from.toUpperCase(), T = to.toUpperCase();
  let raw = await fetchRaw(`dep_iata=${F}&arr_iata=${T}`, 'departures', { live });
  // The pair query has its own store key ("dep_iata=LHR&arr_iata=JFK") which the warmer
  // never writes — it warms whole boards ("dep_iata=LHR"). So for a crawler, which cannot
  // trigger a live fetch, every route page was permanently empty and told the world "no
  // direct flights found today" about routes that run several times a day. The origin's
  // warmed board already contains those flights: filter it. No extra airlabs spend, same
  // store, and the noindex-when-empty guard still holds for routes that genuinely have none.
  if (!raw.length) {
    const board = await fetchRaw(`dep_iata=${F}`, 'departures', { live });
    raw = board.filter(f => f.arr_iata === T);
  }
  const own = raw.filter(f => f.dep_iata === F && f.arr_iata === T);
  return own.map(f => mapFlight(f, 'departures', locale));
}

export async function getFlightByNumber(flightIata: string, locale: string, live = false): Promise<FlightRow | null> {
  const code = norm(flightIata);
  const raw = await fetchRaw(`flight_iata=${flightIata}`, 'departures', { live });
  const match = raw.filter(f => norm(f.flight_iata) === code);
  if (!match.length) return null;
  // pick the soonest upcoming (or most recent) instance
  return mapFlight(match[0], 'departures', locale);
}

export async function getAirlineFlights(iata: string, locale: string, live = false): Promise<FlightRow[]> {
  const code = iata.toUpperCase();
  const raw = await fetchRaw(`airline_iata=${code}`, 'departures', { live });
  const own = raw.filter(f => (f.airline_iata || '').toUpperCase() === code);
  return own.map(f => mapFlight(f, 'departures', locale));
}

// Airline directory (from airlines.json; '*' keys are airlabs' secondary assignments).
export function getAirline(code: string): string | undefined {
  const u = code.toUpperCase();
  return AIRLINE[u] ?? AIRLINE[`${u}*`];
}
export function getAirlines(): { code: string; name: string }[] {
  return Object.entries(AIRLINE)
    .filter(([k]) => /^[A-Z0-9]{2}$/.test(k))
    .map(([code, name]) => ({ code, name }));
}

// Hubs kept warm by the background refresher (instrumentation.ts) so their boards have
// fresh live data without a per-render airlabs call. Bounded + budget-checked:
// ~WARM_AIRPORTS × 2 directions × (24h / WARM_INTERVAL_MIN) requests/day.
const WARM_HUBS = [
  'JFK','LHR','CDG','DXB','SVO','DME','VKO','LED','SIN','HND','NRT','LAX','SFO','ORD','ATL','DFW','DEN','MIA','BOS','SEA',
  'FRA','AMS','IST','SAW','ICN','PEK','PVG','CAN','HKG','BKK','KUL','DEL','BOM','MAD','BCN','FCO','MUC','ZRH','VIE','CPH',
  'OSL','ARN','HEL','WAW','LIS','ATH','SVX','OVB','AER','KZN','KRR','ROV','UFA','GOJ','MRV','YYZ','YVR','GRU','GIG','MEX','SYD',
];

/** Refresh whatever is most overdue, within this run's share of the monthly budget.
 *
 *  Airports are tiered by real scheduled-flight volume (see lib/warm.ts), so coverage no
 *  longer depends on someone remembering to add a busy airport to a list — which is how
 *  Phuket, Cagliari and Trabzon ended up serving empty boards. Airports of imminent events
 *  jump the queue so an event guide's "money block" never links to a cold board.
 *
 *  Falls back to the legacy fixed hub list until scripts/discover-schedules.mjs has
 *  produced data/airport-service.json.
 */
export async function warmHubs(): Promise<{
  warmed: number; skippedBudget: number; eventAirports: string[]; tiers: Record<string, number>;
}> {
  const eventAirports = getActiveEventAirports();
  const tiers: Record<string, number> = {};
  if (!AIRLABS_KEY) return { warmed: 0, skippedBudget: 0, eventAirports, tiers };

  const due = dueAirports();
  // Events first, then the most overdue. Legacy list only while service data is missing.
  //
  // Event airports are prepended, which put them OUTSIDE the overdue filter entirely: one was
  // refreshed on every two-hourly run regardless of its tier, so ANR — a small field with one
  // departure a day and a 24-hour target — was being warmed twelve times a day while nothing
  // in its tier got touched at all. Six of them cost ~5% of a budget already in deficit.
  // Priority is worth keeping; exemption is not. An hour is well inside every tier's target,
  // so an event airport still gets far more attention than its size would earn it.
  const EVENT_MIN_AGE_MS = 60 * 60_000;
  const now = Date.now();
  const staleEvents = eventAirports.filter(iata => {
    const ts = getStaleTs(`departures:dep_iata=${iata}`);
    return !ts || now - ts >= EVENT_MIN_AGE_MS;
  });
  const queue: string[] = due.length
    ? [...staleEvents, ...due.map(d => d.iata)]
    : [...staleEvents, ...WARM_HUBS];
  const tierByIata = new Map(due.map(d => [d.iata, d.tier.name]));

  const budget = tickBudget();
  let spentHere = 0, warmed = 0;
  const seen = new Set<string>();

  for (const iata of queue) {
    if (seen.has(iata)) continue;
    seen.add(iata);
    if (spentHere + 2 > budget || !canSpend()) break;
    try { await fetchRaw(`dep_iata=${iata}`, 'departures', { live: true, kind: 'warm' }); } catch { /* ignore */ }
    try { await fetchRaw(`arr_iata=${iata}`, 'arrivals', { live: true, kind: 'warm' }); } catch { /* ignore */ }
    spentHere += 2;
    warmed++;
    const t = tierByIata.get(iata) ?? 'event/legacy';
    tiers[t] = (tiers[t] ?? 0) + 1;
    await new Promise(r => setTimeout(r, 120)); // gentle stagger
  }
  return { warmed, skippedBudget: Math.max(0, due.length - warmed), eventAirports, tiers };
}
