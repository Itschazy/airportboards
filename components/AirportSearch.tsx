'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Result = { iata: string; name: string; city: string; country: string; iso2: string };

const RECENT_KEY = 'ab_recent';
const MAX_RECENT = 5;

const flag = (iso2: string) => {
  if (!iso2 || iso2.length !== 2) return '';
  return [...iso2.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
};

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function getRecent(): Result[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(a: Result) {
  try {
    const prev = getRecent().filter(r => r.iata !== a.iata);
    localStorage.setItem(RECENT_KEY, JSON.stringify([a, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}

export function AirportSearch({ locale, placeholder }: { locale: string; placeholder: string }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [recent, setRecent]   = useState<Result[]>([]);
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const [focused, setFocused] = useState(false);
  const router    = useRouter();
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Load popular airports on mount
  useEffect(() => {
    fetch('/api/airports/search?q=')
      .then(r => r.json())
      .then(d => { if (!query) setResults(d.airports || []); })
      .catch(() => {});
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!focused) return;
    if (!query.trim()) {
      fetch('/api/airports/search?q=')
        .then(r => r.json())
        .then(d => setResults(d.airports || []))
        .catch(() => {});
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.airports || []);
      setActive(-1);
    }, 100);
    return () => clearTimeout(t);
  }, [query, focused]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const onFocus = useCallback(() => {
    setRecent(getRecent());
    setFocused(true);
    setOpen(true);
  }, []);

  const onBlur = useCallback(() => {
    setFocused(false);
  }, []);

  const go = (a: Result) => {
    saveRecent(a);
    router.push(`/${locale}/airport/${a.iata}`);
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: React.KeyboardEvent) => {
    const list = showRecent ? recent : results;
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(v => Math.min(v + 1, list.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = active >= 0 ? list[active] : list[0];
      if (item) go(item);
    }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  const showRecent = !query.trim() && recent.length > 0;
  const showList   = open && (showRecent ? recent.length > 0 : results.length > 0);

  const Section = ({ label, items }: { label: string; items: Result[] }) => (
    <>
      <div style={{
        padding: '8px 14px 4px',
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#4A4A4A',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      {items.map((a, i) => {
        const globalIdx = i;
        const isActive = active === globalIdx;
        return (
          <button
            key={a.iata}
            onMouseDown={() => go(a)}
            onMouseEnter={() => setActive(globalIdx)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              border: 'none',
              borderBottom: i < items.length - 1 ? '1px solid #161616' : 'none',
              background: isActive ? '#1C1C1E' : 'transparent',
              color: '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
          >
            {/* Flag */}
            <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center', lineHeight: 1 }}>
              {flag(a.iso2)}
            </span>

            {/* IATA */}
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0A84FF', flexShrink: 0, width: 34, letterSpacing: '-0.02em' }}>
              {highlight(a.iata, query)}
            </span>

            {/* City + name */}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, color: '#E4E4E7', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlight(a.city, query)}
              </span>
              <span style={{ fontSize: 11, color: '#6A6A6A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {highlight(a.name, query)}
              </span>
            </span>

            {/* Country */}
            <span style={{ fontSize: 11, color: '#4A4A4A', flexShrink: 0, maxWidth: 80, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {a.country}
            </span>
          </button>
        );
      })}
    </>
  );

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="6.5" cy="6.5" r="4" stroke={focused ? '#8A8A8A' : '#4A4A4A'} strokeWidth="1.5"/>
          <path d="M10 10L13.5 13.5" stroke={focused ? '#8A8A8A' : '#4A4A4A'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKey}
          onFocus={onFocus}
          onBlur={onBlur}
          style={{
            width: '100%',
            padding: '14px 40px 14px 40px',
            fontSize: 16,
            border: `1px solid ${focused ? '#333333' : '#1A1A1A'}`,
            borderRadius: 16,
            outline: 'none',
            background: '#0B0B0B',
            color: '#FFFFFF',
            WebkitAppearance: 'none',
            transition: 'border-color 0.15s',
          }}
        />

        {query && (
          <button
            onMouseDown={() => { setQuery(''); setActive(-1); inputRef.current?.focus(); }}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: '#2C2C2E', border: 'none', borderRadius: '50%',
              width: 20, height: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="#8A8A8A" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showList && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0, right: 0,
          background: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: 16,
          overflow: 'hidden',
          overflowY: 'auto',
          maxHeight: 'min(480px, calc(100dvh - 220px))',
          zIndex: 100,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}>
          {showRecent ? (
            <>
              <Section label="Recent" items={recent} />
              {results.length > 0 && (
                <>
                  <div style={{ height: 1, background: '#1A1A1A' }} />
                  <Section label="Popular" items={results.slice(0, 5)} />
                </>
              )}
            </>
          ) : (
            <Section label={query ? 'Results' : 'Popular airports'} items={results} />
          )}
        </div>
      )}
    </div>
  );
}
