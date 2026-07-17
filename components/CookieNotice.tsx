'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n';

const KEY = 'ab_cookie_ok';

// Lightweight, informational, dismissible cookie notice (NOT a consent gate). It links
// to the Privacy Policy and remembers dismissal in localStorage. Formal EEA/UK consent
// is handled by Google's "Privacy & messaging" CMP once ads are enabled in the AdSense
// console — set NEXT_PUBLIC_COOKIE_NOTICE=0 to hide this if it duplicates that.
export function CookieNotice({ locale }: { locale: Locale }) {
  const t = useTranslations('legal');
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* localStorage unavailable — skip */
    }
  }, []);

  if (process.env.NEXT_PUBLIC_COOKIE_NOTICE === '0' || !show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        role="region"
        aria-label={t('cookie_msg')}
        style={{
          pointerEvents: 'auto', width: '100%', maxWidth: 640,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          background: '#111111', border: '1px solid #2A2A2A', borderRadius: 14,
          padding: '11px 14px', boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}
      >
        <p style={{ flex: 1, minWidth: 200, margin: 0, fontSize: 13, lineHeight: 1.5, color: '#C7C7CC' }}>
          {t('cookie_msg')}{' '}
          <Link href={`/${locale}/privacy`} style={{ color: '#0A84FF', textDecoration: 'none' }}>
            {t('privacy')}
          </Link>
        </p>
        <button
          onClick={dismiss}
          style={{
            flexShrink: 0, background: '#0A84FF', color: '#FFFFFF', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('cookie_ok')}
        </button>
      </div>
    </div>
  );
}
