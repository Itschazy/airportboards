'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Только главная использует компактный подвал по просьбе владельца.
 * Контент остаётся серверным children: каталоги и переводы не попадают в JS,
 * все ссылки есть уже в HTML закрытого details. usePathname нужен также при
 * клиентском переходе с главной на табло: там сохраняется прежний полный подвал.
 */
export function SiteFooterFrame({ locale, label, children }: { locale: string; label: string; children: ReactNode }) {
  const pathname = usePathname();
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  return (
    <footer style={{ borderTop: '1px solid var(--ab-1a1a1a)', marginTop: 'auto', padding: home ? '8px 18px 18px' : '32px 18px 28px' }}>
      {home ? (
        <details className="airport-disclosure home-footer-reference">
          <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, cursor: 'pointer', color: 'var(--ab-8a8a8a)', fontSize: 13 }}>
            {label}<span className="disclosure-arrow" aria-hidden="true">⌄</span>
          </summary>
          <div style={{ padding: '20px 0' }}>{children}</div>
        </details>
      ) : children}
      <p style={{ maxWidth: 1000, margin: '10px auto 0', textAlign: 'center', fontSize: 11, color: 'var(--ab-5a5a5a)', letterSpacing: '0.02em' }}>
        airportsboard.live · © 2026
      </p>
    </footer>
  );
}
