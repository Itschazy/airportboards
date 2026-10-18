'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n';
import { CONSENT_KEY } from '@/components/Analytics';
import { adsenseClient } from '@/lib/adsense';

// Cookie consent notice, wired to Google Consent Mode v2.
//
// This used to be a purely informational "got it" bar while the privacy policy claimed that
// EEA/UK visitors "will be shown a consent message ... before non-essential cookies are set".
// That claim was false, and the analytics and ad tags fired regardless. Now the choice is
// real: Accept and Decline both call gtag('consent','update', ...), so Google's tags either
// store and personalise, or fall back to cookieless pings.
//
// The default state is declared server-side in components/Analytics.tsx — denied across the
// EEA/UK/CH, granted elsewhere — so a visitor who ignores this bar is still handled correctly
// for their region. This component only records an explicit choice.
//
// Set NEXT_PUBLIC_COOKIE_NOTICE=0 to hide it, e.g. once Google's own CMP is published in the
// AdSense console and would otherwise show a second bar.

const LEGACY_KEY = 'ab_cookie_ok';   // pre-consent-mode dismissal flag

type Choice = 'granted' | 'denied';

const CONSENT_KEYS = [
  'ad_storage', 'ad_user_data', 'ad_personalization',
  'analytics_storage', 'functionality_storage', 'personalization_storage',
] as const;

/** The slice of TCF v2 data we act on. */
type TcData = { gdprApplies?: boolean; listenerId?: number };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /** Installed by Google's CMP (Funding Choices), which arrives with adsbygoogle.js. */
    __tcfapi?: (cmd: string, version: number, cb: (data: TcData, ok: boolean) => void, param?: number) => void;
  }
}

export function CookieNotice({ locale }: { locale: Locale }) {
  const t = useTranslations('legal');
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // Someone who dismissed the old informational bar never actually expressed a
      // preference about advertising cookies, so ask once now rather than assuming consent.
      if (localStorage.getItem(CONSENT_KEY)) return;
    } catch {
      /* localStorage unavailable — fall through and ask */
    }

    // Do not ask a second time when Google already asked.
    //
    // adsbygoogle.js brings the CMP configured in the AdSense console (Funding Choices), and
    // that CMP is geo-gated: measured from Riga on 2026-07-30, an EEA visitor got a
    // full-screen consent wall AND this bar underneath it at the same time, so the answer had
    // to be given twice. A Russian visitor — about 70% of the traffic — gets no wall at all,
    // which is why NEXT_PUBLIC_COOKIE_NOTICE=0 is the wrong instrument: it would take this bar
    // away from the majority who are only ever offered this one.
    //
    // So ask the CMP whether it owns this visitor. gdprApplies true means Google's wall is the
    // consent surface here and its choice already flows into Consent Mode; false means there is
    // no wall and this bar is the only thing standing between an ad tag and a stranger.
    if (!adsenseClient) { setShow(true); return; }

    let settled = false;
    const decide = (mine: boolean) => { if (!settled) { settled = true; if (mine) setShow(true); } };

    const ask = (): boolean => {
      const api = window.__tcfapi;
      if (!api) return false;
      api('addEventListener', 2, (tcData, ok) => {
        if (!ok || settled) return;
        decide(!tcData?.gdprApplies);
        if (tcData?.listenerId !== undefined) api('removeEventListener', 2, () => {}, tcData.listenerId);
      });
      return true;
    };

    if (ask()) return;
    // The CMP rides a deferred script, so it is usually not installed yet at mount.
    const poll = setInterval(() => { if (ask()) clearInterval(poll); }, 150);
    // No CMP arrived at all — AdSense is configured but no consent message is published.
    const bail = setTimeout(() => { clearInterval(poll); decide(true); }, 2500);
    return () => { clearInterval(poll); clearTimeout(bail); };
  }, []);

  if (process.env.NEXT_PUBLIC_COOKIE_NOTICE === '0' || !show) return null;

  const choose = (choice: Choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore — the update below still applies for this page view */
    }
    window.gtag?.('consent', 'update', Object.fromEntries(CONSENT_KEYS.map(k => [k, choice])));
    setShow(false);
  };

  const btn = (primary: boolean) => ({
    flexShrink: 0,
    background: primary ? '#0A84FF' : 'transparent',
    color: primary ? '#FFFFFF' : '#C7C7CC',
    border: primary ? 'none' : '1px solid #3A3A3C',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
        padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
      }}
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-label={t('cookie_msg')}
        // Marks the bottom slot as taken. components/InstallPrompt.tsx sits in the same slot
        // with a higher z-index and looks for this before showing, so an install card can
        // never land on top of a consent choice.
        data-cookie-bar=""
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
        {/* Decline is a real, equally reachable choice — a bar with only "accept" is not
            consent under the GDPR, and is exactly what regulators cite. */}
        <button onClick={() => choose('denied')} style={btn(false)}>{t('cookie_decline')}</button>
        <button onClick={() => choose('granted')} style={btn(true)}>{t('cookie_ok')}</button>
      </div>
    </div>
  );
}
