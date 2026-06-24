'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type A = { iata: string; city: string };
type Counts = Record<string, { dep: number | null; arr: number | null }>;

export function PopularNow({ airports, locale, depLabel, arrLabel }: {
  airports: A[]; locale: string; depLabel: string; arrLabel: string;
}) {
  const [counts, setCounts] = useState<Counts>({});
  useEffect(() => {
    const codes = airports.map(a => a.iata).join(',');
    fetch(`/api/airports/counts?codes=${codes}`).then(r => r.json()).then(setCounts).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {airports.map(a => {
        const c = counts[a.iata];
        return (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            flexShrink: 0, width: 152, textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderLeft: '3px solid #34C759',
            borderRadius: 20, padding: '16px 16px 18px',
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1 }}>{a.iata}</div>
            <div style={{ fontSize: 14, color: '#8A8A8A', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 38 }}>
              {typeof c?.dep === 'number' && (
                <div style={{ fontSize: 13, color: '#8A8A8A' }}>
                  <span style={{ color: '#34C759', fontWeight: 700 }}>{c.dep}</span> {depLabel}
                </div>
              )}
              {typeof c?.arr === 'number' && (
                <div style={{ fontSize: 13, color: '#8A8A8A' }}>
                  <span style={{ color: '#0A84FF', fontWeight: 700 }}>{c.arr}</span> {arrLabel}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
