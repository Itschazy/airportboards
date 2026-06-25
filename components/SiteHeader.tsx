'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { locales, localeNames, type Locale } from '@/lib/i18n';

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const getLocalePath = (l: string) =>
    pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${l}`);

  useEffect(() => {
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close); // touch devices: mousedown is unreliable
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#050505',
      borderBottom: '1px solid #1A1A1A',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 16px', height: 48,
        display: 'flex', alignItems: 'center',
      }}>
        <Link href={`/${locale}`} style={{
          fontSize: 14, fontWeight: 700,
          color: '#FFFFFF', letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 15 }} aria-hidden="true">✈</span>
          airportsboard
        </Link>

        <div style={{ flex: 1 }} />

        {/* Globe language selector */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${tNav('language')}: ${localeNames[locale]}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '9px 12px', minHeight: 40,
              borderRadius: 8,
              border: `1px solid ${open ? '#3A3A3C' : '#1A1A1A'}`,
              background: open ? '#1C1C1E' : 'transparent',
              color: '#8A8A8A',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: 13 }} aria-hidden="true">🌐</span>
            {locale.toUpperCase()}
            <span style={{ fontSize: 10, opacity: 0.6, marginInlineStart: 1 }} aria-hidden="true">▾</span>
          </button>

          {open && (
            <div role="menu" style={{
              position: 'absolute', top: 'calc(100% + 6px)', insetInlineEnd: 0,
              background: '#111111',
              border: '1px solid #1A1A1A',
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 100,
              minWidth: 168,
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            }}>
              {locales.map((loc, i) => (
                <Link
                  key={loc}
                  href={getLocalePath(loc)}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    fontSize: 13,
                    borderBottom: i < locales.length - 1 ? '1px solid #1A1A1A' : 'none',
                    color: loc === locale ? '#FFFFFF' : '#8A8A8A',
                    fontWeight: loc === locale ? 600 : 400,
                    background: loc === locale ? 'rgba(10,132,255,0.08)' : 'transparent',
                  }}
                >
                  <span>{localeNames[loc]}</span>
                  {loc === locale && (
                    <span style={{ color: '#0A84FF', fontSize: 13 }}>✓</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
