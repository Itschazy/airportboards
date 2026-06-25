'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type A = { iata: string; city: string; name: string };
type Counts = Record<string, { dep: number | null; arr: number | null }>;

export function PopularList({ airports, locale, depLabel, arrLabel }: {
  airports: A[]; locale: string; depLabel: string; arrLabel: string;
}) {
  const [counts, setCounts] = useState<Counts>({});
  useEffect(() => {
    const codes = airports.map(a => a.iata).join(',');
    fetch(`/api/airports/counts?codes=${codes}`).then(r => r.json()).then(setCounts).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {airports.map(a => {
        const c = counts[a.iata];
        return (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16,
            padding: '12px 16px',
          }}>
            <div style={{ width: 56, flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF', lineHeight: 1 }}>{a.iata}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: '#E4E4E7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</div>
              <div style={{ fontSize: 12, color: '#8A8A8A', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'right', fontSize: 12, color: '#8A8A8A', minWidth: 70 }}>
              {typeof c?.dep === 'number' && <div><span style={{ color: '#34C759', fontWeight: 700 }}>{c.dep}</span> {depLabel}</div>}
              {typeof c?.arr === 'number' && <div style={{ marginTop: 2 }}><span style={{ color: '#0A84FF', fontWeight: 700 }}>{c.arr}</span> {arrLabel}</div>}
            </div>
            <svg width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
