// Строгий белый список: тело запроса нельзя писать в файл как есть. В нём не
// сохраняются URL ресурсов, текст/селектор LCP, query, referrer, UA, IP или client id.
export const RUM_METRICS = ['lcp', 'ttfb', 'fcp', 'dns', 'connect', 'request', 'html',
  'resourceLoadDelay', 'resourceLoadDuration', 'elementRenderDelay', 'longTaskTotal',
  'longTaskMax', 'longTaskCount', 'scriptBytes', 'resourceCount', 'slowestResourceMs'] as const;
export const RUM_CATEGORIES = {
  browser: ['yandex', 'yandex-app', 'samsung', 'edge', 'opera', 'chrome-ios', 'chrome', 'firefox', 'safari', 'other'],
  device: ['mobile', 'tablet', 'desktop'], platform: ['android', 'ios', 'other'],
  page: ['home', 'departures', 'arrivals'], locale: ['en', 'ru', 'zh', 'ar', 'de', 'ko', 'ja', 'fr', 'es', 'it', 'hi', 'tr'],
  network: ['slow-2g', '2g', '3g', '4g', 'unknown'], memory: ['low', 'mid', 'high', 'unknown'],
  protocol: ['h2', 'h3', 'http/1.1', 'unknown'], navigation: ['navigate', 'reload', 'back_forward'],
  target: ['heading', 'flight-row', 'text', 'image', 'video', 'other'],
  slowestResource: ['next', 'metrika', 'google', 'font', 'image', 'style', 'other', 'none'],
} as const;
export type RumRecord = { schema: 1; release: string; airport: string; browserMajor: number;
  longTasksSupported: boolean; longTasksTruncated: boolean;
} & Record<keyof typeof RUM_CATEGORIES, string> & Record<typeof RUM_METRICS[number], number>;
export function parseRum(input: unknown): RumRecord | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const x = input as Record<string, unknown>;
  if (x.schema !== 1 || typeof x.release !== 'string' || !/^[a-f0-9]{12,40}$/.test(x.release)) return null;
  if (typeof x.airport !== 'string' || !/^([A-Z]{3})?$/.test(x.airport)) return null;
  if ((x.page === 'home') !== (x.airport === '')) return null;
  const out: Record<string, unknown> = { schema: 1, release: x.release, airport: x.airport };
  for (const [key, values] of Object.entries(RUM_CATEGORIES)) {
    if (typeof x[key] !== 'string' || !(values as readonly string[]).includes(x[key] as string)) return null;
    out[key] = x[key];
  }
  for (const key of RUM_METRICS) {
    const n = x[key];
    const max = key === 'scriptBytes' ? 100_000_000 : 300_000;
    // -1 означает «API/показатель отсутствует», а не мгновенную загрузку.
    if (typeof n !== 'number' || !Number.isFinite(n) || n < -1 || n > max) return null;
    out[key] = Math.round(n);
  }
  if ((out.lcp as number) <= 0) return null;
  if (!Number.isInteger(x.browserMajor) || Number(x.browserMajor) < 0 || Number(x.browserMajor) > 999) return null;
  out.browserMajor = x.browserMajor;
  for (const key of ['longTasksSupported', 'longTasksTruncated']) {
    if (typeof x[key] !== 'boolean') return null;
    out[key] = x[key];
  }
  return out as RumRecord;
}
