'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type R = { iata: string; city: string };

export function RecentlyViewed({ locale, title }: { locale: string; title: string }) {
  const [recent, setRecent] = useState<R[]>([]);
  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem('ab_recent') || '[]')); } catch {}
  }, []);
  if (recent.length === 0) return null;

  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {recent.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            padding: '8px 14px', borderRadius: 999, border: '1px solid #1A1A1A',
            background: '#0B0B0B', textDecoration: 'none', color: 'inherit',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{a.iata}</span>
            <span style={{ fontSize: 12, color: '#8A8A8A' }}>{a.city}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
