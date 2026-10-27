'use client';
import Link from 'next/link';
import { ThemeSwitcher } from './ThemeSwitcher';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n';

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* На главной логотип в шапке не нужен: прямо под ней стоит крупная подпись
     с тем же названием, и ссылка вела бы на страницу, где мы уже находимся.
     Место всё равно занимается пустышкой — сетка шапки рассчитана на три
     ячейки, и без неё выбор языка переехал бы в середину. */
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;

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

  // Геометрия и стекло — в .site-header/.glass-bar (globals.css): нужны
  // @supports и медиазапросы доступности, инлайновый стиль их не умеет.
  return (
    <header className="site-header">
      <div className="hdr-row">
        <ThemeSwitcher />
        {isHome ? <span /> : (
          <Link href={`/${locale}`} className="hdr-pill glass" style={{
            fontSize: 17, fontWeight: 700,
            color: 'var(--ab-ffffff)', letterSpacing: '-0.01em',
            gap: 8, padding: '0 20px',
          }}>
            <span style={{ fontSize: 19 }} aria-hidden="true">✈</span>
            airportsboard
          </Link>
        )}

        {/* Globe language selector */}
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`${tNav('language')}: ${localeNames[locale]}`}
            className="hdr-pill hdr-pill-btn glass"
            style={{
              gap: 7,
              // 44, а не 40: шапка высотой 48, поднять можно бесплатно и ничего не сдвигая.
              // Меню ниже ограничено видимой высотой и прокручивается: все 12 языков
              // доступны даже на телефоне в альбомной ориентации.
              padding: '0 18px',
              color: 'var(--ab-8a8a8a)',
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            {/* Флаг текущего языка вместо глобуса: глобус говорит лишь «здесь
                языки», а флаг сразу показывает, какой выбран. Для скринридера
                он скрыт — выбранный язык уже назван в aria-label кнопки. */}
            <span aria-hidden="true" className="locale-flag" style={{ fontSize: 21, lineHeight: 1 }}>
              {localeFlags[locale]}
            </span>
            {locale.toUpperCase()}
          </button>

          {/* Rendered whether or not the menu is open, hidden with CSS instead of omitted.
              `{open && …}` kept these twelve links out of the server HTML entirely, which is
              half of why eleven language trees had no inbound link anywhere (see the note on
              the language row in SiteFooter). A crawler reads the markup, not the click. */}
          {(
            <div role="menu" aria-hidden={!open} className="glass-menu glass-dense" style={{
              display: open ? 'block' : 'none',
              position: 'absolute', top: 'calc(100% + 10px)', insetInlineEnd: 0,
              // На экране 667×375 меню заканчивалось на539px: нижние языки
              // были недоступны. Скроллер сохраняет размер пунктов для пальца.
              maxHeight: 'calc(100dvh - 84px)', overflowY: 'auto', overscrollBehavior: 'contain',
              zIndex: 100,
              minWidth: 168,
            }}>
              {locales.map((loc, i) => (
                <Link
                  key={loc}
                  href={getLocalePath(loc)}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', minHeight: 44,
                    fontSize: 13,
                    borderBottom: i < locales.length - 1 ? '1px solid rgba(var(--ab-ink),0.07)' : 'none',
                    color: loc === locale ? 'var(--ab-ffffff)' : 'var(--ab-8a8a8a)',
                    fontWeight: loc === locale ? 600 : 400,
                    background: loc === locale ? 'rgba(10,132,255,0.08)' : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Флаг — метка для глаза; для скринридера он лишний шум,
                        название языка рядом и так читается. */}
                    <span aria-hidden="true" className="locale-flag" style={{ fontSize: 15, lineHeight: 1, width: 20 }}>
                      {localeFlags[loc]}
                    </span>
                    {localeNames[loc]}
                  </span>
                  {loc === locale && (
                    <span style={{ color: 'var(--ab-0a84ff)', fontSize: 13 }}>✓</span>
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
