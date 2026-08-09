/**
 * How many board rows to render before the "show more" button.
 *
 * Its own module so the test exercises the same function the page runs, rather than a copy that
 * drifts. The rule is small; the reason it exists is not.
 *
 * Twelve rows is right for a hub with eighty flights and wrong for everything else. Measured on
 * production at 14:23 MSK, twelve rows bought a TEN-MINUTE window: IST showed 14:25–14:35, DXB
 * 15:25–15:50, AYT 14:25–14:55. Kazan kept eight hours of evening and night departures behind a
 * tap — 20:55 Novosibirsk through 01:50 Sheremetyevo — directly under a header reading "50
 * departures on the board". The rows were already on the device: KZN ships 8,112 bytes of JSON
 * for 40 flights and rendered twelve of them. Measured cost of the extra rows on real HTML,
 * gzip -6: +53 bytes each.
 *
 * So the window is the number of flights STILL TO COME, with two guards:
 *   - floor 12, so a board whose every row has gone stale does not collapse to nothing;
 *   - cap 30, so a dense hub does not open as an endless ribbon.
 * Small boards (<= 35 rows) render in full, which is what the header already claims.
 *
 * `nowMs` of 0 means the board was never fetched and there is no instant to compare against;
 * the count then falls back to the floor rather than pretending everything is in the past.
 */
export function initialRowCount(rows: Array<{ ts?: number }>, nowMs: number): number {
  const FLOOR = 12;
  const CAP = 30;
  const SMALL_BOARD = 35;

  if (rows.length <= SMALL_BOARD) return Math.max(rows.length, FLOOR);

  const upcoming = rows.reduce((n, r) => n + (r.ts && nowMs && r.ts * 1000 >= nowMs ? 1 : 0), 0);
  return Math.min(Math.max(upcoming, FLOOR), CAP);
}
