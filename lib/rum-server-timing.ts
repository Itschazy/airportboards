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

/** Field samples showed multi-second connect durations with fast nginx headers.
 * connectEnd-connectStart includes TLS; it cannot tell whether waiting happened
 * before or during the secure handshake. Keep this one duration in the existing
 * anonymous report, not timestamps or another request. Cached/worker responses,
 * reused connections, missing API and invalid order remain unknown (-1). QUIC
 * combines transport and security, so do not give HTTP/3 the TCP/TLS interpretation.
 * The remainder before TLS may include proxies/clock coarsening; it is not an RTT.
 */
export function readTlsTiming(nav: Pick<PerformanceNavigationTiming,
  'connectStart' | 'secureConnectionStart' | 'connectEnd' | 'requestStart' |
  'nextHopProtocol' | 'transferSize' | 'workerStart'>): number {
  const { connectStart: start, secureConnectionStart: secure, connectEnd: end } = nav;
  if (!(nav.transferSize > 0) || nav.workerStart !== 0
    || !['h2', 'http/1.1'].includes(nav.nextHopProtocol)
    || ![start, secure, end, nav.requestStart].every(Number.isFinite)
    || start < 0 || secure <= 0 || end <= start || secure < start || secure > end
    || end > nav.requestStart || end - start > 300000) return -1;
  return Math.round(end - secure);
}
