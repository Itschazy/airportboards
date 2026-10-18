'use client';
import { ThemeSwitcher } from './ThemeSwitcher';
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
      background: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        padding: '0 16px', height: 48,
        display: 'flex', alignItems: 'center',
      }}>
        {/* alignSelf stretch, not padding: the link is itself a centred flex box, so filling
            the 48px bar moves the target from 22.5px to 48px and the wordmark not at all. */}
        <Link href={`/${locale}`} style={{
          fontSize: 14, fontWeight: 700,
          color: 'var(--color-text)', letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'stretch',
        }}>
          <span style={{ fontSize: 15 }} aria-hidden="true">✈</span>
          airportsboard
        </Link>

        <div style={{ flex: 1 }} />

        <ThemeSwitcher />

        {/* Globe language selector */}
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${tNav('language')}: ${localeNames[locale]}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              // 44, а не 40: шапка высотой 48, поднять можно бесплатно и ничего не сдвигая.
          // Пункты самого меню при этом НЕ трогаем — у выпадающего списка нет max-height и
          // overflow-y, и при 44 на ряд нижние языки уехали бы за экран.
          padding: '11px 12px', minHeight: 44,
              borderRadius: 8,
              border: `1px solid ${open ? 'var(--color-secondary)' : 'var(--color-border)'}`,
              background: open ? 'var(--color-raised)' : 'transparent',
              color: 'var(--color-secondary)',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            <span style={{ fontSize: 13 }} aria-hidden="true">🌐</span>
            {locale.toUpperCase()}
            <span style={{ fontSize: 10, opacity: 0.6, marginInlineStart: 1 }} aria-hidden="true">▾</span>
          </button>

          {/* Rendered whether or not the menu is open, hidden with CSS instead of omitted.
              `{open && …}` kept these twelve links out of the server HTML entirely, which is
              half of why eleven language trees had no inbound link anywhere (see the note on
              the language row in SiteFooter). A crawler reads the markup, not the click. */}
          {(
            <div role="menu" aria-hidden={!open} style={{
              display: open ? 'block' : 'none',
              position: 'absolute', top: 'calc(100% + 6px)', insetInlineEnd: 0,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
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
                    borderBottom: i < locales.length - 1 ? '1px solid var(--color-border)' : 'none',
                    color: loc === locale ? 'var(--color-text)' : 'var(--color-secondary)',
                    fontWeight: loc === locale ? 600 : 400,
                    background: loc === locale ? 'rgba(10,132,255,0.08)' : 'transparent',
                  }}
                >
                  <span>{localeNames[loc]}</span>
                  {loc === locale && (
                    <span style={{ color: 'var(--color-blue)', fontSize: 13 }}>✓</span>
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
