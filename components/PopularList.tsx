'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type A = { iata: string; city: string; name: string };
type Counts = Record<string, { dep: number | null; arr: number | null }>;

export function PopularList({ airports, locale, depLabel, arrLabel }: {
  airports: A[]; locale: string; depLabel: string; arrLabel: string;
}) {
  const [counts, setCounts] = useState<Counts>({});
  /* Пока счётчики не пришли, под них держится место: иначе при загрузке весь
     список дёргается вправо. Как только ответ получен, у аэропортов без цифр
     резерв снимается — пустая колонка в 70px отодвигала подпись от стрелки. */
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const codes = airports.map(a => a.iata).join(',');
    fetch(`/api/airports/counts?codes=${codes}`)
      .then(r => r.json())
      .then(setCounts)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    // Две колонки вместо одной: шестнадцать строк в столбик занимали экран
    // целиком, и ряд стран над ними вместе со списком не помещался. Строки
    // плотнее прежнего по той же причине — каждый лишний пиксель высоты стоит
    // одного видимого аэропорта. На узком экране колонка снова одна: при двух
    // на 375px на строку остаётся около 170px, и город с кодом уже не умещаются.
    <div className="popular-grid">
      {airports.map(a => {
        const c = counts[a.iata];
        return (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} className="glass-soft" style={{
            display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
            textDecoration: 'none', color: 'inherit',
            borderRadius: 16,
            padding: '10px 14px',
          }}>
            {/* Строка в одну линию: код слева, город за ним, название аэропорта
                ушло вправо. Прежние две строки занимали вдвое больше высоты
                ради подписи, которая у половины аэропортов повторяет город. */}
            <div style={{ width: 44, flexShrink: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ab-ffffff)', lineHeight: 1 }}>{a.iata}</div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--ab-e4e4e7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.city}</div>
            <div className="pl-name" style={{ minWidth: 0, maxWidth: '40%', textAlign: 'end', fontSize: 12, color: 'var(--ab-8a8a8a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
            {(() => {
              const has = typeof c?.dep === 'number' || typeof c?.arr === 'number';
              if (!has && loaded) return null;
              return (
                <div style={{ flexShrink: 0, textAlign: 'end', fontSize: 12, color: 'var(--ab-8a8a8a)', minWidth: has ? undefined : 70 }}>
                  {typeof c?.dep === 'number' && <span><span style={{ color: 'var(--ab-34c759)', fontWeight: 700 }}>{c.dep}</span> {depLabel}</span>}
                  {typeof c?.arr === 'number' && <span style={{ marginInlineStart: 10 }}><span style={{ color: 'var(--ab-0a84ff)', fontWeight: 700 }}>{c.arr}</span> {arrLabel}</span>}
                </div>
              );
            })()}
            <svg data-flip width="6" height="11" viewBox="0 0 6 11" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 1L5 5.5L1 10" stroke="var(--ab-3a3a3c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        );
      })}
    </div>
  );
}
