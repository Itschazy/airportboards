'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CONSENT_KEY } from '@/components/Analytics';

// A quiet "add to Home Screen" card.
//
// The manifest has shipped standalone-capable for weeks, but nothing ever suggested
// installing, so nobody did — and "watching a departures board" is exactly the visit that
// repeats. The rules keep it polite:
//
//   - never on the first visit: a first-time visitor has no reason to install anything, and
//     the prompt would just be one more thing between them and the board;
//   - never inside an installed app, and never again after an install or an explicit dismiss
//     (a dismissal is respected for 90 days, then one more chance);
//   - Chromium: the real install prompt, deferred from beforeinstallprompt. iOS Safari has no
//     install API, so the card explains the Share → Add to Home Screen path instead;
//   - appears 4 seconds after load, from the bottom, and never covers the flight sheet
//     (sheet z-index is 200+; this sits below it).
//
// Visit counting is one per browser session (sessionStorage guard), stored in localStorage.

const K_VISITS = 'ab_visits';
const K_SEEN_SESSION = 'ab_visit_seen';
const K_DISMISSED = 'ab_pwa_dismissed';
const K_DONE = 'ab_pwa_done';
const DISMISS_DAYS = 90;

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const t = useTranslations('ui');
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const bip = useRef<BIPEvent | null>(null);

  useEffect(() => {
    try {
      // Already an app, already installed, or told us no recently → stay silent.
      const standalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (standalone || localStorage.getItem(K_DONE)) return;
      // Consent comes first. Both cards live in the same bottom slot and this one has the
      // higher z-index, so until the visitor has answered the cookie banner the install card
      // would sit ON TOP of the Accept/Decline buttons — an install prompt that blocks a GDPR
      // choice. If consent has not been decided yet, skip this visit entirely; the card's own
      // visit gating means there is always a later one.
      if (!localStorage.getItem(CONSENT_KEY)) return;
      const dismissed = Number(localStorage.getItem(K_DISMISSED) || 0);
      if (dismissed && Date.now() - dismissed < DISMISS_DAYS * 864e5) return;

      // Count this session once; only returning visitors see the card.
      if (!sessionStorage.getItem(K_SEEN_SESSION)) {
        sessionStorage.setItem(K_SEEN_SESSION, '1');
        localStorage.setItem(K_VISITS, String(Number(localStorage.getItem(K_VISITS) || 0) + 1));
      }
      if (Number(localStorage.getItem(K_VISITS) || 0) < 2) return;

      // iPadOS 13+ reports itself as macOS; the touch-points check is the documented tell.
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      let timer: ReturnType<typeof setTimeout> | null = null;
      const arm = () => { if (!timer) timer = setTimeout(() => setShow(true), 4000); };

      const onBip = (e: Event) => {
        e.preventDefault();
        bip.current = e as BIPEvent;
        arm();
      };
      window.addEventListener('beforeinstallprompt', onBip);
      if (isIos) { setIos(true); arm(); }
      return () => { window.removeEventListener('beforeinstallprompt', onBip); if (timer) clearTimeout(timer); };
    } catch { /* storage blocked — never show, never break the page */ }
  }, []);

  if (!show) return null;

  const dismiss = () => { setShow(false); try { localStorage.setItem(K_DISMISSED, String(Date.now())); } catch {} };
  const install = async () => {
    const e = bip.current;
    if (!e) { dismiss(); return; }
    try {
      await e.prompt();
      const { outcome } = await e.userChoice;
      if (outcome === 'accepted') { try { localStorage.setItem(K_DONE, '1'); } catch {} }
      else { try { localStorage.setItem(K_DISMISSED, String(Date.now())); } catch {} }
    } catch { /* prompt already used or blocked */ }
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t('pwa_title')}
      style={{
        position: 'fixed', insetInline: 0, bottom: 0, zIndex: 150,
        display: 'flex', justifyContent: 'center',
        padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
        pointerEvents: 'none',
      }}
    >
      <div
        className="pwa-rise"
        style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 420,
          background: 'rgba(18,18,20,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          padding: '14px 14px 14px 16px',
          display: 'flex', alignItems: 'center', gap: 13,
        }}
      >
        <div aria-hidden="true" style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #0A84FF, #0060DF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 650, color: '#FFFFFF', lineHeight: 1.25 }}>{t('pwa_title')}</div>
          <div style={{ fontSize: 12.5, color: '#9A9AA0', marginTop: 3, lineHeight: 1.35 }}>
            {ios && !bip.current ? t('pwa_ios_hint') : t('pwa_sub')}
          </div>
        </div>
        {ios && !bip.current ? (
          <button type="button" onClick={dismiss} className="press" style={{
            flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.10)', color: '#FFFFFF', fontSize: 13, fontWeight: 600,
          }}>{t('pwa_got_it')}</button>
        ) : (
          <button type="button" onClick={install} className="press" style={{
            flexShrink: 0, height: 36, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: '#0A84FF', color: '#FFFFFF', fontSize: 13, fontWeight: 650,
          }}>{t('pwa_install')}</button>
        )}
        <button type="button" onClick={dismiss} aria-label={t('pwa_got_it')} style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#6A6A6E', fontSize: 15, lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>
    </div>
  );
}
