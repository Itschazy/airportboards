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
      // История переживает версии сайта. Валидный JSON может содержать объект
      // вместо city: React тогда роняет всё табло, а не только этот блок.
      // Как и поиск, ограничиваем чтение 16 тысячами символов и пятью уникальными аэропортами.
      // Старые записи с одними iata/city остаются пригодны; storage не переписываем.
      const raw = localStorage.getItem('ab_recent');
      const all: unknown = raw && raw.length <= 16_384 ? JSON.parse(raw) : [];
      const valid: R[] = [];
      const seen = new Set<string>();
      if (Array.isArray(all)) for (const row of all) {
        if (!row || typeof row !== 'object') continue;
        const { iata, city } = row;
        if (typeof iata !== 'string' || !/^[A-Z]{3}$/.test(iata) || iata === exclude || seen.has(iata)) continue;
        if (typeof city !== 'string' || city.length > 256) continue;
        seen.add(iata);
        valid.push({ iata, city });
        if (valid.length === 5) break;
      }
      setRecent(valid);
    } catch { setRecent([]); }
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
            padding: '8px 14px', borderRadius: 999,
            background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', textDecoration: 'none', color: 'inherit',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ab-ffffff)' }}>{a.iata}</span>
            <span style={{ fontSize: 12, color: 'var(--ab-8a8a8a)' }}>{a.city}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
