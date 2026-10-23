'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type R = { iata: string; city: string };

export function RecentlyViewed({ locale, title, exclude }: { locale: string; title: string;
  /** IATA of the page being viewed — a chip pointing at the page you are on is noise. */
  exclude?: string;
}) {
  const [recent, setRecent] = useState<R[]>([]);
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem('ab_recent') || '[]') as R[];
      setRecent(exclude ? all.filter(a => a.iata !== exclude) : all);
    } catch {}
  }, [exclude]);
  if (recent.length === 0) return null;

  return (
    <section style={{ marginTop: 44 }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ab-8a8a8a)', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {recent.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            padding: '8px 14px', borderRadius: 999, border: '1px solid var(--ab-1a1a1a)',
            background: 'var(--ab-0b0b0b)', textDecoration: 'none', color: 'inherit',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ab-ffffff)' }}>{a.iata}</span>
            <span style={{ fontSize: 12, color: 'var(--ab-8a8a8a)' }}>{a.city}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
