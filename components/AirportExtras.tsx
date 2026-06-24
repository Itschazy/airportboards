'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const C = { card: '#0B0B0B', border: '1px solid #1A1A1A', sub: '#8A8A8A', green: '#34C759', blue: '#0A84FF' };

// ── Collapse wrapper: content is in the DOM (SSR/SEO), revealed on tap ──
export function MoreInfo({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} style={{
          width: '100%', height: 52, marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
          borderRadius: 14, color: '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          {label}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 5L6.5 8.5L10 5" stroke="#8A8A8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: C.border, borderRadius: 16, padding: '14px 16px' }}>
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
        <Link key={r.iata} href={`/${locale}/airport/${r.iata}`} style={{
          flexShrink: 0, width: 160, textDecoration: 'none', color: 'inherit',
          background: C.card, border: C.border, borderRadius: 16, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>{r.iata}</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: C.green, marginTop: 10, fontWeight: 600 }}>{perDay.replace('{n}', String(r.n))}</div>
        </Link>
      ))}
    </div>
  );
}

// ── About card with read-more ──
export function AboutCard({ text, readMore }: { text: string; readMore: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.card, border: C.border, borderRadius: 18, padding: '18px 20px' }}>
      <p style={{
        fontSize: 15, lineHeight: 1.65, color: '#B4B4B4', margin: 0,
        ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
      }}>
        {text}
      </p>
      {!open && (
        <button onClick={() => setOpen(true)} style={{ marginTop: 10, background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
          {readMore}
        </button>
      )}
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
          <button onClick={() => setOpen(open === i ? null : i)} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '14px 16px', background: 'none', border: 'none', color: '#FFFFFF', fontSize: 15, fontWeight: 600,
            textAlign: 'left', cursor: 'pointer',
          }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{it.q}</h3>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M3 5L6.5 8.5L10 5" stroke="#8A8A8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p style={{ display: open === i ? 'block' : 'none', margin: 0, padding: '0 16px 16px', fontSize: 14, lineHeight: 1.55, color: C.sub }}>
            {it.a}
          </p>
        </div>
      ))}
    </div>
  );
}
