'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Result = { iata: string; name: string; city: string; country: string };

export function AirportSearch({ locale, placeholder }: { locale: string; placeholder: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.airports || []);
      setOpen(true);
      setActive(-1);
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (iata: string) => {
    router.push(`/${locale}/airport/${iata}`);
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && active >= 0) go(results[active].iata);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKey}
        onFocus={() => results.length > 0 && setOpen(true)}
        style={{
          width: '100%',
          padding: '13px 16px',
          fontSize: 16,
          border: '1px solid #1A1A1A',
          borderRadius: 14,
          outline: 'none',
          background: '#0B0B0B',
          color: '#FFFFFF',
          WebkitAppearance: 'none' as any,
          transition: 'border-color 0.15s',
        }}
      />

      {open && results.length > 0 && (
        <div ref={dropRef} style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: '#111111',
          border: '1px solid #1A1A1A',
          borderRadius: 14,
          overflow: 'hidden',
          zIndex: 100,
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        }}>
          {results.map((a, i) => (
            <button key={a.iata} onMouseDown={() => go(a.iata)} style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem 1.125rem',
              border: 'none',
              borderBottom: i < results.length - 1 ? '1px solid #1A1A1A' : 'none',
              background: i === active ? '#1C1C1E' : 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
            }}>
              <span style={{
                fontSize: '0.8125rem', fontWeight: 700,
                color: '#0A84FF', flexShrink: 0, width: 36,
              }}>
                {a.iata}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#e4e4e7', flex: 1 }}>
                {a.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#71717a', flexShrink: 0 }}>
                {a.city}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
