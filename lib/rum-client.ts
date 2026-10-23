import type { LCPMetricWithAttribution } from 'web-vitals/attribution';
import { rumAllowed, rumBrowser, rumPage } from './rum-policy';
import { parseRum } from './rum-schema';

declare global {
  interface Window {
    __abRumGate?: { path: string; firstHidden: number; restored: boolean };
    __abRumStarted?: boolean;
  }
}
type NetNavigator = Navigator & { connection?: { effectiveType?: string }; deviceMemory?: number; globalPrivacyControl?: boolean };

function eligible(): boolean {
  try {
    const nav = navigator as NetNavigator;
    return rumAllowed(location.hostname, Intl.DateTimeFormat().resolvedOptions().timeZone,
      localStorage.getItem('ab_consent_v1'),
      !!nav.webdriver || /bot|crawler|spider|headless/i.test(nav.userAgent)
        || (screen.width === 1366 && screen.height === 1366) || (screen.width === 1280 && screen.height === 1200),
      nav.doNotTrack === '1' || nav.globalPrivacyControl === true,
      process.env.NEXT_PUBLIC_RUM_LOCAL_TEST === '1');
  } catch { return false; }
}

function resourceKind(entry: PerformanceResourceTiming): string {
  try {
    const url = new URL(entry.name);
    if (url.origin === location.origin && url.pathname.startsWith('/_next/')) return 'next';
    if (url.hostname === 'mc.yandex.ru' || url.hostname.endsWith('.mc.yandex.ru')) return 'metrika';
    if (url.hostname.endsWith('.googletagmanager.com') || url.hostname.endsWith('.google-analytics.com')) return 'google';
    return ({ css: 'style', img: 'image', font: 'font' } as Record<string, string>)[entry.initiatorType] || 'other';
  } catch { return 'other'; }
}

export async function startRum(): Promise<void> {
  const gate = window.__abRumGate;
  if (window.__abRumStarted || !gate || gate.restored || gate.firstHidden === 0 || !eligible()) return;
  const page = rumPage(gate.path);
  if (!page || typeof PerformanceObserver === 'undefined'
    || !PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')
    || typeof Array.prototype.at !== 'function' || typeof Array.prototype.findLast !== 'function') return;
  window.__abRumStarted = true;
  let sent = false;
  let longTasksTruncated = false;
  const tasks: { startTime: number; duration: number }[] = [];
  let longTasksSupported = PerformanceObserver.supportedEntryTypes.includes('longtask');
  let observer: PerformanceObserver | undefined;
  function collect(entries: PerformanceEntry[]) {
    for (const e of entries) {
      if (tasks.length < 512) tasks.push({ startTime: e.startTime, duration: e.duration });
      else longTasksTruncated = true;
    }
  }
  try {
    if (longTasksSupported) {
      try {
        observer = new PerformanceObserver(list => collect(list.getEntries()));
        observer.observe({ type: 'longtask', buffered: true });
      } catch { longTasksSupported = false; observer?.disconnect(); observer = undefined; }
    }
    // Библиотека и её observer ресурсов нужны только разрешённым посетителям.
    // Отдельный async chunk не увеличивает JS, необходимый для гидратации табло;
    // buffered entries сохраняют ранний paint. Ошибка загрузки не ломает страницу.
    const { onLCP } = await import('web-vitals/attribution');
    if (!eligible() || gate.restored) { observer?.disconnect(); return; }
    onLCP((metric: LCPMetricWithAttribution) => {
      if (sent) return;
      sent = true;
      if (observer) { collect(observer.takeRecords()); observer.disconnect(); }
      try {
        // Только первая настоящая загрузка документа. BFCache и SPA не сравниваем с
        // холодной навигацией. Отказ, сделанный после старта, проверяем ещё раз.
        if (!eligible() || gate.restored || metric.navigationType === 'back-forward-cache'
          || metric.navigationType === 'restore' || metric.value >= gate.firstHidden) return;
        const a = metric.attribution;
        if (a.url && !/^https?:/.test(a.url)) return; // не мерим overlay расширений
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        if (!nav || (nav.activationStart || 0) > 0 || !['navigate', 'reload', 'back_forward'].includes(nav.type)) return;
        const lcp = metric.value;
        const n = navigator as NetNavigator;
        const before = tasks.filter(t => t.startTime < lcp).map(t => Math.min(t.duration, lcp - t.startTime));
        const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
          .filter(r => r.responseEnd > 0 && r.responseEnd <= lcp).slice(0, 300);
        const slowest = resources.reduce<PerformanceResourceTiming | null>((best, r) => !best || r.duration > best.duration ? r : best, null);
        const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
        const isIos = /iPhone|iPad|iPod/.test(n.userAgent) || (/Macintosh/.test(n.userAgent) && n.maxTouchPoints > 1);
        const element = a.lcpEntry?.element;
        const target = element?.tagName?.toLowerCase();
        const textTarget = element?.closest('h1,h2,h3') ? 'heading' : element?.closest('.frow') ? 'flight-row' : 'text';
        const payload = parseRum({
          schema: 1, release: process.env.NEXT_PUBLIC_RUM_RELEASE, ...page, ...rumBrowser(n.userAgent),
          device: /iPad/.test(n.userAgent) || (isIos && !/iPhone|iPod/.test(n.userAgent)) ? 'tablet' : /Android|iPhone|iPod|Mobile/.test(n.userAgent) ? 'mobile' : 'desktop',
          platform: /Android/.test(n.userAgent) ? 'android' : isIos ? 'ios' : 'other',
          network: ['slow-2g', '2g', '3g', '4g'].includes(n.connection?.effectiveType || '') ? n.connection?.effectiveType : 'unknown',
          memory: n.deviceMemory ? n.deviceMemory <= 2 ? 'low' : n.deviceMemory <= 4 ? 'mid' : 'high' : 'unknown',
          protocol: ['h2', 'h3', 'http/1.1'].includes(nav.nextHopProtocol) ? nav.nextHopProtocol : 'unknown',
          navigation: nav.type, target: target === 'img' ? 'image' : target === 'video' ? 'video' : a.url ? 'other' : textTarget,
          lcp, fcp, ttfb: a.timeToFirstByte,
          dns: nav.domainLookupEnd - nav.domainLookupStart, connect: nav.connectEnd - nav.connectStart,
          request: nav.responseStart - nav.requestStart, html: nav.responseEnd - nav.responseStart,
          resourceLoadDelay: a.resourceLoadDelay, resourceLoadDuration: a.resourceLoadDuration,
          elementRenderDelay: a.elementRenderDelay,
          longTasksSupported, longTasksTruncated,
          longTaskCount: longTasksSupported ? before.length : -1,
          longTaskTotal: longTasksSupported ? before.reduce((sum, t) => sum + t, 0) : -1,
          longTaskMax: longTasksSupported ? Math.max(0, ...before) : -1,
          scriptBytes: resources.filter(r => r.initiatorType === 'script').reduce((sum, r) => sum + r.transferSize, 0),
          resourceCount: resources.length, slowestResource: slowest ? resourceKind(slowest) : 'none',
          slowestResourceMs: slowest?.duration || 0,
        });
        if (!payload) return;
        // Один запрос после финализации LCP; не ждёт load/внешних счётчиков. Cookies и
        // referrer не пересылаем. При закрытии вкладки keepalive даёт браузеру довести
        // запрос, но гарантии доставки нет; никаких повторов и фоновых таймеров.
        void fetch('/api/rum', { method: 'POST', body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, keepalive: true,
          credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }).catch(() => {});
      } catch { /* Диагностика не имеет права ломать табло. */ }
    }, { generateTarget: () => '' }); // не создаём CSS-селектор с пользовательским текстом/id
  } catch { observer?.disconnect(); }
}
