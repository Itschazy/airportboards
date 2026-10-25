import { guideDate, type AirportGuide as Guide } from '@/lib/airport-guide';

/**
 * Справочная по аэропорту — плитки, раскрываются на месте (25.10.2026, макет согласован).
 *
 * Без клиентского JS: каждая плитка — нативный <details>, открытая растягивается на всю ширину
 * сетки (CSS .ag-tile[open]). Текст всех блоков лежит в SSR HTML даже в свёрнутом виде —
 * поисковик и читатель без JS видят то же самое. Источник и дата проверки — под каждым текстом:
 * это не украшение, а то, что отличает справку от сгенерированного абзаца (см. lib/airport-guide.ts).
 */

// Порядок — по тому, что спрашивают чаще: дорога и терминал раньше залов и Wi‑Fi.
const ORDER = ['transport', 'taxi', 'terminals', 'lounges', 'storage', 'sleep', 'kids', 'parking', 'wifi'];

const ICONS: Record<string, string> = {
  transport: 'M6 17h12M7 4h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM5 10h14M8 20l1-3m7 3-1-3',
  taxi: 'M5 16V11l2-5h10l2 5v5M5 16h14v3h-3v-3M5 16v3h3v-3M3 11h18M9 4h6M7.5 13.5h.01M16.5 13.5h.01',
  terminals: 'M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6',
  lounges: 'M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3zM6 17v3m12-3v3',
  storage: 'M4 8h16v12H4zM9 8V5h6v3M4 13h16',
  sleep: 'M3 18V8m0 6h18v4M21 18v-4a3 3 0 0 0-3-3h-7v3M7 11.5a1.5 1.5 0 1 0 0-.01',
  kids: 'M12 4a2 2 0 1 0 0 .01M8 21l1-7-3-3 3-3h6l3 3-3 3 1 7',
  parking: 'M5 3h14v18H5zM10 17V8h3a2.5 2.5 0 0 1 0 5h-3',
  wifi: 'M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M2 8.8a15 15 0 0 1 20 0',
};

/** Строки интерфейса — из messages (ui.aguide_*), чтобы справочная говорила на языке страницы. */
export type GuideLabels = {
  leadOfficial: string; leadThird: string; checked: string;
  src: string; srcAnd: string; srcMore: string; srcThird: string;
};

export function AirportGuide({ guide, title, labels, numLocale }: { guide: Guide; title: string; labels: GuideLabels; numLocale: string }) {
  const blocks = [...guide.blocks].sort((a, b) => (ORDER.indexOf(a.id) + 99) % 99 - (ORDER.indexOf(b.id) + 99) % 99);
  const checked = guideDate(guide.checked, numLocale);
  return (
    <section style={{ marginTop: 36 }} aria-labelledby="ag-title">
      <h2 id="ag-title" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ab-8a8a8a)' }}>{title}</h2>
      {/* Откуда факты — одной строкой, до плиток: так читатель и answer-engine видят метод, а
          не только результат (skill seo-aeo-geo, «methodology disclosure»). */}
      <p className="ag-lead">{guide.basis === 'third-party' ? labels.leadThird : labels.leadOfficial} {labels.checked} <time dateTime={guide.checked}>{checked}</time>.</p>
      <div className="ag-grid">
        {blocks.map((b) => (
          <details key={b.id} className="ag-tile">
            <summary>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ag-ico">
                <path d={ICONS[b.id] ?? ICONS.terminals} />
              </svg>
              <h3 className="ag-t">{b.title}</h3>
              <span className="ag-h">{b.hint}</span>
            </summary>
            <div className="ag-body">
              <p>{b.text}</p>
              {guide.basis === 'third-party' ? (
                <p className="ag-src">
                  {labels.srcThird} <a href={b.url} target="_blank" rel="noopener noreferrer">{b.source}</a> {labels.srcAnd} <a href={b.url2} target="_blank" rel="noopener noreferrer">{b.source2}</a>
                </p>
              ) : (
                <p className="ag-src">
                  {labels.src} <a href={b.url} target="_blank" rel="noopener noreferrer">{b.source}</a>
                  {b.url2 ? <> {labels.srcAnd} <a href={b.url2} target="_blank" rel="noopener noreferrer">{labels.srcMore}</a></> : null}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
