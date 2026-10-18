'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const C = { card: 'var(--color-surface)', border: '1px solid var(--color-border)', sub: 'var(--color-secondary)', green: 'var(--color-green)', blue: 'var(--color-blue)' };

// ── Collapse wrapper: content is in the DOM (SSR/SEO), revealed on tap ──
export function MoreInfo({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button className="press" onClick={() => setOpen(true)} style={{
          width: '100%', height: 52, marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: '1px solid rgba(var(--ink-rgb),0.08)', background: 'rgba(var(--ink-rgb),0.03)',
          borderRadius: 14, color: 'var(--color-text)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          {label}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 5L6.5 8.5L10 5" stroke="var(--color-secondary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      <div style={{ display: open ? 'block' : 'none' }}>{children}</div>
    </>
  );
}

// ── Live overview metrics (departures/arrivals today) ──
export function OverviewMetrics({ iata, depLabel, arrLabel }: { iata: string; depLabel: string; arrLabel: string }) {
  const [c, setC] = useState<{ dep: number | null; arr: number | null } | null>(null);
  useEffect(() => {
    fetch(`/api/airports/counts?codes=${iata}`).then(r => r.json()).then(d => setC(d[iata] || null)).catch(() => {});
  }, [iata]);
  const Metric = ({ n, label, color }: { n: number | null | undefined; label: string; color: string }) =>
    typeof n === 'number' ? (
      <div style={{ flex: 1, background: 'rgba(var(--ink-rgb),0.03)', border: C.border, borderRadius: 16, padding: '14px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color }}>{n}</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 4 }}>{label}</div>
      </div>
    ) : null;
  if (!c || (c.dep == null && c.arr == null)) return null;
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
      <Metric n={c.dep} label={depLabel} color={C.green} />
      <Metric n={c.arr} label={arrLabel} color={C.blue} />
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
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>{r.iata}</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: C.green, marginTop: 10, fontWeight: 600 }}>{perDay.replace('{n}', String(r.n))}</div>
        </Link>
      ))}
    </div>
  );
}

// Каждый вопрос раскрывается независимо без JS. Ответ всегда находится в SSR HTML,
// а не появляется только после клика; FAQPage строится из того же массива в AirportBottom.
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return <div className="faq-list">{items.map((it, i) => (
    <details className="seo-section faq-item" key={i}>
      <summary><h3>{it.q}<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></h3></summary>
      <p className="seo-section-content">{it.a}</p>
    </details>
  ))}</div>;
}
