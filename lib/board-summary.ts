// Board summary shared by the server (pages) and the client (FlightBoard), so the
// answer line and the count row are computed the same way in both places.
//
// What the numbers mean: a board holds UPCOMING plus RECENTLY departed/landed flights
// and is hard-capped at MAX_FLIGHTS (80) in lib/flights.ts — it is NOT a full day's
// schedule. The copy must therefore describe "on the board right now", never "today".

export type BoardSummary = { total: number; delayed: number; next?: string };

type Row = { status: string; scheduled: string; actual?: string };

/** Terminal states — a flight in one of these is behind us, never "next". */
const DONE = ['departed', 'arrived', 'baggage', 'cancelled'];

/** Current wall-clock minute-of-day at the airport, or null if the tz is unusable. */
function localMinutes(tz?: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === 'hour')?.value);
    const m = Number(parts.find(p => p.type === 'minute')?.value);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  } catch { return null; }
}

export function computeBoardSummary(rows: Row[], tz?: string): BoardSummary {
  const total = rows.length;
  const delayed = rows.filter(r => r.status === 'delayed').length;

  // "Next" must be genuinely ahead of the airport's local clock. A non-terminal status
  // is not enough: feeds lag, so a flight can still read "on time" minutes after its
  // slot — announcing that as the next departure would be wrong.
  const now = localMinutes(tz);
  let next: string | undefined;
  for (const r of rows) {
    if (DONE.includes(r.status)) continue;
    const time = r.actual || r.scheduled;
    const [h, m] = (time || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    if (now !== null) {
      let diff = h * 60 + m - now;
      if (diff < -300) diff += 1440;   // slot is tomorrow, not 20 hours ago
      if (diff < 0) continue;          // already past — keep looking
    }
    next = time;
    break;
  }

  return { total, delayed, next };
}
