/** nginx measures these fields at the response-header filter, not after the body.
 * We previously knew only browser TTFB, which also includes DNS/connection/transit.
 * A browser cache or service worker can replay OLD Server-Timing headers: require
 * a transferred document and no worker before interpreting them as current work.
 * Missing/unsupported values stay -1; HIT/STALE must never inherit the origin's
 * duration from the request that populated the cache. No arbitrary descriptions,
 * resource URLs, request ids or additional fetches enter the diagnostic record.
 */
const cacheStates = ['MISS', 'BYPASS', 'EXPIRED', 'REVALIDATED', 'HIT', 'STALE', 'UPDATING'];
type TimingNav = Pick<PerformanceNavigationTiming, 'transferSize' | 'workerStart' | 'requestStart' | 'responseStart'> & {
  serverTiming?: readonly { name: string; duration: number; description: string }[];
};
export function readServerTiming(nav: TimingNav): { edgeHeader: number; originHeader: number; serverCache: string } {
  const unknown = { edgeHeader: -1, originHeader: -1, serverCache: 'unknown' };
  if (!(nav.transferSize > 0) || nav.workerStart > 0 || !nav.serverTiming) return unknown;
  const entries = Array.from(nav.serverTiming).filter(e => ['ab-edge', 'ab-origin', 'ab-cache'].includes(e.name));
  if (new Set(entries.map(e => e.name)).size !== entries.length) return unknown;
  const edge = entries.find(e => e.name === 'ab-edge')?.duration;
  const origin = entries.find(e => e.name === 'ab-origin')?.duration;
  const state = entries.find(e => e.name === 'ab-cache')?.description;
  const valid = (x: number | undefined): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 300000;
  // Allow rounded/coarsened clocks a small tolerance; don't treat wildly different
  // durations as a network decomposition. This does not subtract population p75s.
  const request = nav.responseStart - nav.requestStart;
  if (!valid(edge) || !state || !cacheStates.includes(state) || !Number.isFinite(request) || request < 0 || edge > request + 100) return unknown;
  const hasOrigin = ['MISS', 'BYPASS', 'EXPIRED', 'REVALIDATED'].includes(state);
  return { edgeHeader: Math.round(edge), originHeader: hasOrigin && valid(origin) && origin <= edge + 10 ? Math.round(origin) : -1, serverCache: state };
}
