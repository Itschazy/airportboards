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
    <div className="scroll-row">
      {airports.map(a => {
        const c = counts[a.iata];
        return (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            width: 160, minWidth: 160, height: 170, textDecoration: 'none', color: 'inherit',
            background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderInlineStart: '3px solid var(--ab-34c759)',
            borderRadius: 20, padding: '18px 18px', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--ab-ffffff)', lineHeight: 1 }}>{a.iata}</div>
            <div style={{ fontSize: 18, color: 'var(--ab-8a8a8a)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {typeof c?.dep === 'number' && (
                <div style={{ fontSize: 16, color: 'var(--ab-8a8a8a)' }}>
                  <span style={{ color: 'var(--ab-34c759)', fontWeight: 700 }}>{c.dep}</span> {depLabel}
                </div>
              )}
              {typeof c?.arr === 'number' && (
                <div style={{ fontSize: 16, color: 'var(--ab-8a8a8a)' }}>
                  <span style={{ color: 'var(--ab-0a84ff)', fontWeight: 700 }}>{c.arr}</span> {arrLabel}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
