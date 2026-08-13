import { NextRequest, NextResponse } from 'next/server';
import { getAirport } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { getBoard, getBoardFetchedAt } from '@/lib/flights';
import { locales, numLocale } from '@/lib/i18n';
import { createTranslator } from 'next-intl';
import { currentIata } from '@/lib/iata-aliases';

export const dynamic = 'force-dynamic';

/**
 * Embeddable mini-board: the widget other sites put on their pages.
 *
 * This is the link machine. avionio has run exactly this since 2019 — a free board widget
 * whose embed snippet carries a plain visible link back to the airport page — and it is the
 * one realistic way for a site with ZERO inbound links (measured: none in either console,
 * SQI 0) to earn its first ones. Wikipedia, Reddit and HN are all nofollow; buying links is
 * out; a genuinely useful free widget for hotel, transfer and tourism sites is what is left,
 * and the incumbent proves it works. The link itself lives in the HOST page's HTML (the
 * snippet is iframe + <a> underneath), so it is a followed, equity-carrying link — nothing
 * inside this iframe needs to be, or is, indexable.
 *
 * Economics: reads the same in-process store the SSR pages read, `live: false` — a million
 * embed views cost zero airlabs quota. Refresh is a plain <meta http-equiv="refresh"> every
 * 10 minutes: no JS to maintain, nothing for a host page's CSP to break, and each refresh
 * lands on the s-maxage cache anyway.
 *
 * A route handler rather than a page on purpose: full control of the response — no site
 * chrome, no client bundle (the page weighs ~3 KB against ~140 KB), no next-intl payload,
 * and the framing headers can be set per-response (frame-ancestors * here, while the rest of
 * the site keeps X-Frame-Options SAMEORIGIN; middleware is told to skip /embed entirely).
 */

const STATUS_COLOR: Record<string, string> = {
  ontime: '#34C759', boarding: '#0A84FF', delayed: '#FF9F0A', finalcall: '#FF453A',
  cancelled: '#FF453A', departed: '#8A8A8A', arrived: '#8A8A8A', baggage: '#34C759',
  scheduled: '#8A8A8A',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(req: NextRequest, ctx: { params: Promise<{ iata: string }> }) {
  const { iata: rawIata } = await ctx.params;
  const iata = (currentIata(rawIata) || rawIata).toUpperCase();
  const airport = getAirport(iata);
  if (!airport || airport.closed) return new NextResponse('Not found', { status: 404 });

  const q = req.nextUrl.searchParams;
  const lang = locales.includes(q.get('lang') as never) ? (q.get('lang') as string) : 'en';
  const dir: 'departures' | 'arrivals' = q.get('dir') === 'arrivals' ? 'arrivals' : 'departures';
  const light = q.get('theme') === 'light';

  // Store read only — this endpoint must stay free at any traffic level.
  //
  // Row selection, audited: taking the head of the stored board replayed its ordering AT
  // FETCH TIME — «upcoming first» — which hours later meant ten «Departed» rows and nothing
  // else on 22 of 30 sampled majors. A widget whose every visible flight has already left is
  // worse than no widget. Non-terminal rows (scheduled / delayed / boarding…) come first;
  // terminal ones only pad the remainder. The data is no fresher — the footer's age label
  // keeps saying exactly how old it is — but what fits into ten rows is now the part a
  // visitor can still act on.
  let rows: Awaited<ReturnType<typeof getBoard>> = [];
  try {
    const all = await getBoard(iata, dir, lang, false);
    const TERMINAL = new Set(['departed', 'arrived', 'baggage', 'cancelled']);
    const active = all.filter(r => !TERMINAL.has(r.status));
    const done = all.filter(r => TERMINAL.has(r.status));
    rows = [...active, ...done].slice(0, 10);
  } catch { /* empty board renders honestly */ }
  const fetchedAt = getBoardFetchedAt(iata, dir);

  const ui = (await import(`@/messages/${lang}.json`)).default.ui as Record<string, string>;
  const name = getAirportName(iata, lang, airport.name);

  const C = light
    ? { bg: '#FFFFFF', surface: '#F5F5F7', border: '#E5E5EA', text: '#111111', sub: '#6E6E73' }
    : { bg: '#050505', surface: '#0B0B0B', border: '#1A1A1A', text: '#FFFFFF', sub: '#8A8A8A' };

  /**
   * Возраст данных форматируется НАСТОЯЩИМ форматтером ICU, а не подменой подстроки.
   *
   * Раньше здесь стояло `.replace('{m}', …)`, и это работало ровно до тех пор, пока в
   * каталогах лежали голые плейсхолдеры. Как только у ключей появились система счисления
   * (`{h, number}`) и множественное число, подмена перестала находить что менять, и виджет
   * стал печатать шаблон целиком. На проде это выглядело так:
   *
   *     ru:  «Обновлено {h, number} ч назад»
   *     ar:  «تم التحديث قبل {h, plural, one {ساعة واحدة} two {ساعتين} few {# ساعات} …}»  — 90 знаков
   *
   * Причём ветка минут не срабатывает практически никогда: борт моложе часа — редкость,
   * так что штатным видом виджета был сырой ICU.
   *
   * numLocale нужен по той же причине, что и везде: без явной системы счисления результат
   * зависит от сборки ICU на хосте (см. NUMERAL_SYSTEM в lib/i18n.ts).
   */
  const ageMin = fetchedAt ? Math.max(1, Math.round((Date.now() - fetchedAt) / 60000)) : null;
  // createTranslator из next-intl, а не intl-messageformat напрямую: второй лежит в дереве
  // лишь транзитивно, и опираться в коде приложения на незаявленную зависимость — значит
  // однажды получить сломанную сборку от чужого обновления.
  const tAge = createTranslator({ locale: numLocale(lang), messages: { ui }, namespace: 'ui' });
  const safe = (key: string, vars: Record<string, number>, fallback: string) => {
    try { return String(tAge(key as never, vars as never)); } catch { return fallback; }
  };
  const ageLabel = ageMin === null ? '' :
    ageMin < 60 ? safe('updated_min_ago', { m: ageMin }, `${ageMin} min ago`) :
    ageMin < 1440 ? safe('updated_h_ago', { h: Math.round(ageMin / 60) }, `${Math.round(ageMin / 60)} h ago`) :
    safe('updated_d_ago', { d: Math.round(ageMin / 1440) }, `${Math.round(ageMin / 1440)} d ago`);

  const rowsHtml = rows.length ? rows.map(r => {
    const place = dir === 'departures' ? (r as { destination?: string }).destination : (r as { origin?: string }).origin;
    const label = ui[`st_${r.status}`] || r.status;
    const color = STATUS_COLOR[r.status] || C.sub;
    return `<tr>
      <td class="t">${esc(r.actual || r.scheduled)}</td>
      <td class="f">${esc(r.flight)}</td>
      <td class="p">${esc((place || '').replace(/\s*\([A-Z]{3}\)\s*$/, ''))}</td>
      <td class="s" style="color:${color}">${esc(label)}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4" class="empty">${esc(ui.board_pending || '—')}</td></tr>`;

  // The visible link INSIDE the frame is a courtesy for readers; the SEO link is the <a> in
  // the host page's own HTML, which the generator on /widgets emits alongside the iframe.
  const pageUrl = `https://airportsboard.live/${lang}/airport/${iata}${dir === 'arrivals' ? '/arrivals' : ''}`;
  const dirLabel = dir === 'departures' ? (ui.departures || 'Departures') : (ui.arrivals || 'Arrivals');

  const html = `<!doctype html>
<html lang="${lang}"${lang === 'ar' ? ' dir="rtl"' : ''}><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="600">
<title>${esc(name)} (${iata}) — ${esc(dirLabel)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${C.bg};color:${C.text};font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{padding:12px 14px}
  .head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
  .head a{color:${C.text};text-decoration:none;font-weight:700;font-size:15px}
  .head .dir{color:${C.sub};font-size:12px;white-space:nowrap}
  table{width:100%;border-collapse:collapse}
  td{padding:7px 6px;border-top:1px solid ${C.border};font-variant-numeric:tabular-nums;white-space:nowrap}
  td.t{font-weight:600;width:1%}
  td.f{color:${C.sub};width:1%}
  td.p{overflow:hidden;text-overflow:ellipsis;max-width:0;width:99%;white-space:nowrap}
  td.s{font-size:12px;font-weight:600;width:1%;text-align:end}
  td.empty{color:${C.sub};text-align:center;padding:18px 6px}
  .foot{margin-top:8px;display:flex;justify-content:space-between;gap:8px;font-size:11px;color:${C.sub}}
  .foot a{color:${C.sub}}
</style></head>
<body><div class="wrap">
  <div class="head">
    <a href="${pageUrl}" target="_blank" rel="noopener">${esc(name)} (${iata})</a>
    <span class="dir">${esc(dirLabel)}</span>
  </div>
  <table>${rowsHtml}</table>
  <div class="foot">
    <span>${ageLabel ? esc(ageLabel) : ''}</span>
    <a href="${pageUrl}" target="_blank" rel="noopener">airportsboard.live</a>
  </div>
</div></body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // The whole point is being framed on other people's sites. CSP frame-ancestors takes
      // precedence over X-Frame-Options in every modern browser, and next.config additionally
      // overrides XFO for /embed so the two never disagree.
      'Content-Security-Policy': 'frame-ancestors *',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
