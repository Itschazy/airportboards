'use client';

import { useEffect, useState, useRef } from 'react';
import { DisclosureArrow } from '@/components/DisclosureArrow';
import Link from 'next/link';

const C = { card: 'var(--glass-soft)', border: 'none', sub: 'var(--ab-8a8a8a)', green: 'var(--ab-34c759)', blue: 'var(--ab-0a84ff)' };

// Раньше кнопка исчезала после открытия, и длинную навигацию нельзя было свернуть.
// Native details работает до гидратации; ссылки и текст всегда остаются в SSR HTML.
export function MoreInfo({ label, collapseLabel, children }: { label: string; collapseLabel: string; children: React.ReactNode }) {
  return (
    <details className="airport-disclosure">
      {/* Без подложки и рамки: ниже, в подвале, точно такая же по смыслу подпись
          «Дополнительно» идёт просто текстом, и две одинаковые кнопки подряд — одна
          в рамке, другая без — читались как разные по важности. Высота 44 вместо 52
          держит цель нажатия и заодно убирает лишний зазор между ними. */}
      <summary style={{
        width: '100%', minHeight: 44, marginTop: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        color: 'var(--ab-c7c7cc)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        <span className="disclosure-more">{label}</span><span className="disclosure-less">{collapseLabel}</span><DisclosureArrow />
      </summary>
      {children}
    </details>
  );
}

// ── Live overview metrics (departures/arrivals today) ──
export function OverviewMetrics({ iata, depLabel, arrLabel }: { iata: string; depLabel: string; arrLabel: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [snapshot, setC] = useState<{ iata: string; dep: number | null; arr: number | null } | null>(null);
  const c = snapshot?.iata === iata ? snapshot : null;
  useEffect(() => {
    // Счётчики находятся внутри закрытой справки, но раньше каждый визит сразу
    // делал дополнительный запрос рядом с обновлением рейсов. Нулевой якорь не
    // меняет оформление: загружаем числа только при приближении открытого блока
    // к экрану. Весь SEO-текст/ссылки вокруг по-прежнему отдаются сервером.
    const controller = new AbortController();
    let started = false;
    const load = () => {
      if (started || controller.signal.aborted) return;
      started = true;
      fetch(`/api/airports/counts?codes=${encodeURIComponent(iata)}`, { signal: controller.signal })
        .then(r => { if (!r.ok) throw new Error('Counts unavailable'); return r.json(); })
        .then(d => { if (!controller.signal.aborted) setC(d[iata] ? { ...d[iata], iata } : null); })
        .catch(() => {});
    };
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'undefined') load();
    else if (anchor.current) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); load(); }
      }, { rootMargin: '200px' });
      observer.observe(anchor.current);
    }
    // Abort плюс проверка signal защищают от позднего JSON старого аэропорта,
    // даже когда транспорт уже завершил запрос. Проверка — check-overview-loading.
    return () => { observer?.disconnect(); controller.abort(); };
  }, [iata]);
  const Metric = ({ n, label, color }: { n: number | null | undefined; label: string; color: string }) =>
    typeof n === 'number' ? (
      <div style={{ flex: 1, background: 'rgba(var(--ab-ink),0.03)', border: C.border, borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color }}>{n}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{label}</div>
      </div>
    ) : null;
  return (
    <div ref={anchor} data-overview-metrics>
    {c && (c.dep != null || c.arr != null) && <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
      <Metric n={c.dep} label={depLabel} color={C.green} />
      <Metric n={c.arr} label={arrLabel} color={C.blue} />
    </div>}
    </div>
  );
}

// ── Popular routes — derived from today's live departures ──
export function PopularRoutes({ iata, locale, perDay }: { iata: string; locale: string; perDay: string }) {
  const [routes, setRoutes] = useState<{ iata: string; name: string; n: number }[]>([]);
  useEffect(() => {
    fetch(`/api/flights/${iata}?direction=departures&locale=${locale}`).then(r => r.json()).then(d => {
      const m = new Map<string, { name: string; n: number }>();
      for (const f of d.flights || []) {
        const dest: string = f.destination || '';
        const mt = dest.match(/\(([A-Z]{3})\)\s*$/);
        if (!mt) continue;
        const code = mt[1];
        const name = dest.replace(/\s*\([A-Z]{3}\)\s*$/, '');
        const e = m.get(code) || { name, n: 0 }; e.n++; m.set(code, e);
      }
      setRoutes([...m.entries()].map(([iata, v]) => ({ iata, ...v })).sort((a, b) => b.n - a.n).slice(0, 8));
    }).catch(() => {});
  }, [iata, locale]);
  if (routes.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
      {routes.map(r => (
        <Link key={r.iata} href={`/${locale}/route/${iata}-${r.iata}`} style={{
          flexShrink: 0, width: 160, textDecoration: 'none', color: 'inherit',
          background: C.card, border: C.border, borderRadius: 16, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ab-ffffff)', letterSpacing: '-0.02em' }}>{r.iata}</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: C.green, marginTop: 10, fontWeight: 600 }}>{perDay.replace('{n}', String(r.n))}</div>
        </Link>
      ))}
    </div>
  );
}

// Краткий текст остаётся видимым. Повторное нажатие теперь сворачивает полный текст;
// прежде кнопка исчезала после раскрытия. Обе формы содержат весь исходный текст.
export function AboutCard({ text, readMore, readLess }: { text: string; readMore: string; readLess: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.card, border: C.border, borderRadius: 18, padding: '18px 20px' }}>
      <p style={{
        fontSize: 15, lineHeight: 1.65, color: 'var(--ab-b4b4b4)', margin: 0,
        ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
      }}>
        {text}
      </p>
      {
        <button className="press" aria-expanded={open} onClick={() => setOpen(!open)} style={{ minHeight: 44, marginTop: 8, background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '2px 0' }}>
          {open ? readLess : readMore}
        </button>
      }
    </div>
  );
}

// ── FAQ accordion (answers stay in the DOM for SEO/schema) ──
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: C.card, border: C.border, borderRadius: 16, overflow: 'hidden' }}>
          {/* Раскрывающийся блок по ARIA APG: без aria-expanded программа чтения не сообщает
            СОСТОЯНИЕ — человек слышит вопрос, но не знает, раскрыт ли ответ и что кнопка
            вообще что-то раскрывает. Девять ответов из десяти на странице свёрнуты. */}
        <button
          onClick={() => setOpen(open === i ? null : i)}
          aria-expanded={open === i}
          aria-controls={`faq-a-${i}`}
          id={`faq-q-${i}`}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 16px', background: 'none', border: 'none', color: 'var(--ab-ffffff)', fontSize: 15, fontWeight: 600,
            textAlign: 'start', cursor: 'pointer',
          }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{it.q}</h3>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M3 5L6.5 8.5L10 5" stroke="var(--ab-8a8a8a)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} style={{ display: open === i ? 'block' : 'none', margin: 0, padding: '0 16px 16px', fontSize: 14, lineHeight: 1.55, color: C.sub }}>
            {it.a}
          </p>
        </div>
      ))}
    </div>
  );
}
