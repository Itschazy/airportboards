'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Airport } from '@/lib/airports';

type T = (key: string, values?: Record<string, string | number>) => string;
type Mode = 'departures' | 'arrivals';
type FilterKey = 'all' | 'ontime' | 'delayed' | 'boarding' | 'finalcall' | 'departed';

type Flight = {
  flight: string;
  airline: string;
  destination?: string;
  origin?: string;
  scheduled: string;
  actual?: string;
  gate?: string;
  terminal?: string;
  baggage?: string;
  aircraft?: string;
  delay?: number;
  status: string;
};

const C = {
  bg:        '#050505',
  surface:   '#0B0B0B',
  border:    '#1A1A1A',
  text:      '#FFFFFF',
  secondary: '#8A8A8A',
  dim:       '#4A4A4A',
  green:     '#34C759',
  blue:      '#0A84FF',
  orange:    '#FF9F0A',
  red:       '#FF453A',
  gray:      '#3A3A3C',
};

const STATUS_COLOR: Record<string, string> = {
  ontime:    C.green,
  boarding:  C.blue,
  delayed:   C.orange,
  finalcall: C.red,
  cancelled: C.red,
  departed:  C.gray,
  arrived:   C.gray,
  baggage:   C.green,
  scheduled: C.gray,
};

const FILTER_STATUSES: Record<FilterKey, string[]> = {
  all:       [],
  ontime:    ['ontime', 'scheduled'],
  delayed:   ['delayed', 'finalcall'],
  boarding:  ['boarding'],
  finalcall: ['finalcall'],
  departed:  ['departed', 'arrived', 'baggage'],
};

const FILTERS: FilterKey[] = ['all', 'ontime', 'delayed', 'boarding', 'finalcall', 'departed'];

const haptic = (ms = 6) => { try { (navigator as any).vibrate?.(ms); } catch {} };

// Age of the DATA, not of the request. Tail airports are refreshed daily, so this has to
// degrade past minutes gracefully — "1440 min ago" is technically true and useless.
function relTime(d: Date | null, t: T): string {
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return t('updated_now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('updated_min_ago', { m: Math.max(1, m) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('updated_h_ago', { h });
  return t('updated_d_ago', { d: Math.floor(h / 24) });
}

function calcDeparture(
  flight: Flight, tz: string, mode: Mode, t: T
): { label: string; value: string; sub: string; accent?: string } | null {
  if (['departed', 'baggage'].includes(flight.status)) {
    return { label: mode === 'departures' ? t('st_departed') : t('st_arrived'), value: flight.scheduled, sub: '', accent: C.gray };
  }
  if (flight.status === 'arrived') {
    return { label: t('st_arrived'), value: flight.scheduled, sub: '', accent: C.gray };
  }
  if (flight.status === 'cancelled') {
    return { label: t('st_cancelled'), value: '—', sub: t('was', { time: flight.scheduled }), accent: C.red };
  }
  const dispTime = flight.actual || flight.scheduled;
  const [h, m] = dispTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const nowH = +(parts.find(p => p.type === 'hour')?.value ?? '0');
    const nowM = +(parts.find(p => p.type === 'minute')?.value ?? '0');
    let diff = (h * 60 + m) - (nowH * 60 + nowM);
    if (diff < -300) diff += 1440;

    if (flight.status === 'delayed' && flight.actual) {
      const [sh, sm] = flight.scheduled.split(':').map(Number);
      let delay = (h * 60 + m) - (sh * 60 + sm);
      if (delay < -720) delay += 1440;   // delayed across midnight (e.g. 23:50 → 00:20)
      const delayM = flight.delay ?? delay;
      return { label: t('delayed_by', { m: delayM }), value: flight.actual, sub: t('was', { time: flight.scheduled }), accent: C.orange };
    }
    if (diff <= 0) {
      if (flight.status === 'boarding') return { label: t('st_boarding'), value: t('now'), sub: flight.gate ? `${t('gate')} ${flight.gate}` : '', accent: C.blue };
      if (flight.status === 'finalcall') return { label: t('final_call'), value: t('now'), sub: t('go_to_gate'), accent: C.red };
      return { label: mode === 'departures' ? t('departing') : t('landing'), value: t('now'), sub: '', accent: C.green };
    }
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const countdown = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    if (flight.status === 'boarding') return { label: t('st_boarding'), value: countdown, sub: flight.gate ? `${t('gate')} ${flight.gate}` : '', accent: C.blue };
    if (flight.status === 'finalcall') return { label: t('final_call'), value: countdown, sub: t('go_to_gate'), accent: C.red };
    return { label: mode === 'departures' ? t('departs_in') : t('arrives_in'), value: countdown, sub: t('scheduled_at', { time: flight.scheduled }) };
  } catch {
    return null;
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconSearch({ color = '#8A8A8A' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6.5" cy="6.5" r="4" stroke={color} strokeWidth="1.5"/>
      <path d="M10 10L13.5 13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconClose({ color = '#8A8A8A' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2L12 12M12 2L2 12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

function BottomSheet({ flight, mode, onClose, tz, locale }: {
  flight: Flight | null;
  mode: Mode;
  onClose: () => void;
  tz: string;
  locale: string;
  updLabel: string;
}) {
  const t = useTranslations('ui');
  const tNav = useTranslations('nav');
  const vis = !!flight;

  useEffect(() => {
    document.body.style.overflow = vis ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [vis]);

  // Dialog a11y: focus the sheet on open, close on Escape, restore focus on close.
  useEffect(() => {
    if (!vis) return;
    const prev = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [vis]);

  const localNow = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    return {
      h: +(parts.find(p => p.type === 'hour')?.value ?? '0'),
      m: +(parts.find(p => p.type === 'minute')?.value ?? '0'),
    };
  };
  const minsUntil = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const now = localNow();
    let diff = (h * 60 + m) - (now.h * 60 + now.m);
    if (diff < -300) diff += 1440;
    return diff;
  };
  const fmtDur = (mins: number) => {
    const hrs = Math.floor(mins / 60), mm = mins % 60;
    return hrs > 0 ? `${hrs} ${t('dur_h')} ${mm} ${t('dur_m')}` : `${mm} ${t('dur_m')}`;
  };

  const L = { fontSize: 12, color: C.secondary, textTransform: 'uppercase' as const, letterSpacing: '0.12em' };
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dragStart = useRef<number | null>(null);
  const dragY = useRef(0);
  const raf = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Drag follows the finger by writing transform straight to the DOM inside a
  // requestAnimationFrame — no React state per touchmove, so the (large) sheet
  // subtree never re-renders mid-gesture and tracking stays at 60fps.
  const applyDrag = () => {
    raf.current = 0;
    const el = sheetRef.current;
    if (el) el.style.transform = `translateY(${dragY.current}px)`;
  };
  // Restore the exact declared values (not '') — React's diff won't rewrite a style
  // prop it believes is unchanged, so clearing them would strand the element with no
  // transition and kill the close animation.
  const settleBack = () => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.transform = 'translateY(0)';
  };
  useEffect(() => { if (!vis) { setDetailsOpen(false); dragStart.current = null; dragY.current = 0; } }, [vis]);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if ((sheetRef.current?.scrollTop ?? 0) <= 0) {
      dragStart.current = e.touches[0].clientY;
      dragY.current = 0;
      if (sheetRef.current) sheetRef.current.style.transition = 'none';
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current == null) return;
    const d = e.touches[0].clientY - dragStart.current;
    dragY.current = d > 0 ? d : 0;
    if (!raf.current) raf.current = requestAnimationFrame(applyDrag);
  };
  const onTouchEnd = () => {
    if (dragStart.current == null) return;
    const shouldClose = dragY.current > 110;
    dragStart.current = null;
    dragY.current = 0;
    settleBack();          // restore the CSS transition + declared transform
    if (shouldClose) onClose();
  };

  let body = null;
  if (flight) {
    const status = flight.status;
    const color = STATUS_COLOR[status] || C.gray;
    const statusLabel = t(`st_${status}`);
    const isDep = mode === 'departures';
    const dispTime = flight.actual || flight.scheduled;
    const mins = minsUntil(dispTime);
    const n = localNow();
    const nowClock = `${String(n.h).padStart(2, '0')}:${String(n.m).padStart(2, '0')}`;
    const dateStr = new Date().toLocaleDateString(locale, { timeZone: tz || undefined, weekday: 'short', month: 'short', day: 'numeric' });

    const Icon = ({ name }: { name: string }) => {
      const p = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { flexShrink: 0, opacity: 0.9 } };
      if (name === 'plane') return <svg {...p}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>;
      if (name === 'bell') return <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
      if (name === 'clock') return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
      return null;
    };

    // ── Hero card (status-specific, action-oriented) ──
    type Hero = { label: string; main: string; sub?: string; subStrike?: boolean; bottom?: string; icon?: string; medium?: boolean };
    let hero: Hero;
    if (status === 'departed' || status === 'arrived') {
      hero = { label: t('flight_departed'), main: flight.scheduled, sub: t('actual_dep') };
    } else if (status === 'baggage') {
      hero = { label: t('st_baggage'), main: flight.baggage || dispTime };
    } else if (status === 'cancelled') {
      hero = { label: t('h_cancel_label'), main: t('h_cancel_main'), sub: t('h_cancel_sub'), icon: 'bell', medium: true };
    } else if (status === 'boarding') {
      hero = { label: t('h_board_label'), main: t('h_board_main'), sub: t('gate_closes', { m: Math.max(1, mins ?? 0) }), bottom: dispTime, icon: 'plane', medium: true };
    } else if (status === 'finalcall') {
      hero = { label: t('h_final_label'), main: t('h_final_main'), sub: t('gate_closes', { m: Math.max(1, mins ?? 0) }), bottom: dispTime, icon: 'bell', medium: true };
    } else if (status === 'delayed') {
      hero = { label: t('h_delay_label', { dur: fmtDur(flight.delay && flight.delay > 0 ? flight.delay : Math.max(0, mins ?? 0)) }), main: dispTime, sub: t('was', { time: flight.scheduled }), subStrike: true, icon: 'clock' };
    } else {
      hero = { label: isDep ? t('departs_in') : t('arrives_in'), main: mins != null && mins > 0 ? fmtDur(mins) : t('now'), sub: t('on_schedule', { time: flight.scheduled }), icon: 'clock' };
    }

    // ── Detail grid: only fields with data, never the status (already in hero) ──
    type Block = { label: string; value: string; valueColor?: string; strike?: string; sub?: string };
    const blocks: Block[] = [{
      label: isDep ? t('departure') : t('arrival'), value: dispTime,
      valueColor: flight.actual ? C.orange : C.text, strike: flight.actual ? flight.scheduled : undefined, sub: dateStr,
    }];
    if (flight.gate)     blocks.push({ label: t('gate'), value: flight.gate });
    if (flight.terminal) blocks.push({ label: t('terminal'), value: flight.terminal });
    if (flight.baggage)  blocks.push({ label: t('baggage'), value: flight.baggage, valueColor: C.green });

    // ── About-the-flight rows (revealed via "flight details") ──
    const about: { label: string; value: string }[] = [{ label: t('airline_label'), value: flight.airline }];
    if (flight.aircraft) about.push({ label: t('aircraft_type'), value: flight.aircraft });
    about.push({ label: t('flight_no'), value: flight.flight });

    const notice =
      status === 'boarding' ? t('notice_board') :
      status === 'finalcall' ? t('notice_final') :
      status === 'delayed' ? t('notice_delayed') :
      (status === 'ontime' || status === 'scheduled') ? t('notice_ontime') : null;

    const heroMainSize = hero.medium ? 30 : (hero.main.length > 8 ? 36 : hero.main.length > 5 ? 44 : 52);

    body = (
      <div style={{ padding: '4px 24px calc(28px + env(safe-area-inset-bottom))' }}>

        {/* Header — status pill on its own line above the (large) flight number,
            so long localized labels (ПОСЛЕДНИЙ ВЫЗОВ…) never collide with it */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, background: color + '1F', border: `1px solid ${color}59`, maxWidth: '100%' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{statusLabel}</span>
          </div>
          <div style={{ minWidth: 0, width: '100%' }}>
            <div style={{ fontSize: 'clamp(46px, 14vw, 66px)', fontWeight: 800, letterSpacing: '-0.04em', color: C.text, lineHeight: 0.95, wordBreak: 'break-word' }}>{flight.flight}</div>
            <div style={{ fontSize: 'clamp(22px, 6.5vw, 30px)', color: '#A1A1A1', marginTop: 12, lineHeight: 1.15 }}>{flight.destination || flight.origin}</div>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 600, marginTop: 6 }}>{flight.airline}</div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '20px 0' }} />

        {/* Hero card */}
        <div style={{ background: color + '1A', border: `1px solid ${color}40`, borderRadius: 18, padding: '18px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...L, marginBottom: 10 }}>{hero.label}</div>
              <div style={{ fontSize: heroMainSize, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{hero.main}</div>
              {hero.sub && <div style={{ fontSize: 15, color: C.secondary, marginTop: 10, textDecoration: hero.subStrike ? 'line-through' : 'none' }}>{hero.sub}</div>}
            </div>
            {hero.icon && <Icon name={hero.icon} />}
          </div>
          {hero.bottom && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
              <div style={{ ...L, marginBottom: 4 }}>{isDep ? t('departure') : t('arrival')}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{hero.bottom}</div>
            </>
          )}
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 12, marginTop: 24 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px', minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={L}>{b.label}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: b.valueColor || C.text, lineHeight: 1.05, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.value}</div>
                {b.strike && <div style={{ fontSize: 12, color: C.secondary, textDecoration: 'line-through', marginTop: 2 }}>{b.strike}</div>}
                {b.sub && <div style={{ fontSize: 12, color: '#6A6A6A', marginTop: 4 }}>{b.sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Updated row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 50, marginTop: 12, padding: '0 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
          <span style={{ fontSize: 13, color: C.secondary }}>{t('updated')}</span>
          <span style={{ fontSize: 14, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{nowClock}</span>
        </div>

        {/* Flight details (collapsed "about the flight") */}
        <button className="press" onClick={() => setDetailsOpen(o => !o)} style={{ width: '100%', height: 52, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: 14, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {t('flight_details')}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M3 5L6.5 8.5L10 5" stroke="#8A8A8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {detailsOpen && (
          <div style={{ marginTop: 14 }}>
            <div style={{ ...L, marginBottom: 12 }}>{t('about_flight')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {about.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 0', borderBottom: i < about.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ fontSize: 13, color: C.secondary }}>{r.label}</span>
                  <span style={{ fontSize: 15, color: C.text, fontWeight: 500, textAlign: 'right' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info notice */}
        {notice && (
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginTop: 18, padding: '14px 16px', background: color + '0D', border: `1px solid ${color}40`, borderRadius: 14 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.5" /><path d="M9 5.5v.5M9 8v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: '#C4C4C4' }}>{notice}</span>
          </div>
        )}

      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        opacity: vis ? 1 : 0, pointerEvents: vis ? 'auto' : 'none', transition: 'opacity 0.28s ease',
      }} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={flight ? `${flight.flight} — ${flight.destination || flight.origin || ''}` : undefined}
        tabIndex={-1}
        className="sheet-scroll"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          outline: 'none',
          background: '#111111', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px 32px 0 0',
          // Drag offsets are written straight to el.style by the rAF handler; the
          // declared transform only encodes open/closed.
          transform: vis ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: vis ? 'transform' : undefined,
          paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
          maxHeight: '90vh', overflowY: 'auto',
          maxWidth: 640, margin: '0 auto',
        }}>
        {/* Handle (tap to close) */}
        <button type="button" onClick={onClose} aria-label={tNav('close')} style={{ display: 'block', width: '100%', padding: '12px 0 6px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.22)', margin: '0 auto' }} />
        </button>
        {body}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlightBoard({ airport, locale, defaultMode = 'departures', displayName, initialFlights, initialFetchedAt, boardTotal, lead, statusLine = null, noService = false, pendingNote = null }: {
  airport: Airport;
  locale: string;
  defaultMode?: Mode;
  displayName?: string;
  initialFlights?: Flight[];
  /** Epoch ms when airlabs produced the SSR board, so the first paint labels its true age. */
  initialFetchedAt?: number | null;
  /** One plain sentence stating what this airport is, rendered right under the H1.
   *  Answer engines quote lead sentences, and the H1 alone ("LHR") states nothing a reader
   *  could lift. Passed from the page so the wording stays localized. */
  lead?: string;
  /** One dated, data-only line ("Board status as of N min ago: 3 of 41 upcoming departures
   *  delayed by 15+ minutes."). Computed server-side with its own honesty gates; null when
   *  the board is cold, stale or empty of upcoming flights. */
  statusLine?: string | null;
  /** Total rows on the board BEFORE the SSR slice — the counter must not report the slice.
   *  page.tsx sends only the first 40 rows to keep the HTML light, and the counter was
   *  reading that array, so every large airport claimed exactly "40 departures today"
   *  (LHR actually has 80). AI crawlers read that number as fact. */
  boardTotal?: number;
  /** Airfield with no scheduled airline service at all. The board chrome is suppressed —
   *  a freshness dot, direction tabs and status filters over a permanently empty list read
   *  as a broken page. The notice above the board explains why it is empty. */
  noService?: boolean;
  /** Honest server-rendered stand-in when the store has no board for this airport yet. */
  pendingNote?: string | null;
}) {
  const t = useTranslations('ui');
  const tNav = useTranslations('nav');
  const hasInitial = !!(initialFlights && initialFlights.length);
  const [mode, setMode]           = useState<Mode>(defaultMode);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [search, setSearch]       = useState('');
  // SSR-rendered first set (current/default mode) so crawlers and users see real
  // flights without waiting for client JS; the poll below refreshes it.
  const [flights, setFlights]     = useState<Flight[]>(initialFlights ?? []);
  // Starts false so the SERVER never renders a spinner. It used to start as !hasInitial, which
  // meant every un-warmed airport served crawlers three animated dots and nothing else — and the
  // honest empty-state branch below was gated on !loading, so it was unreachable in SSR by
  // construction. Real users are unaffected: the mount effect sets loading before it fetches.
  const [loading, setLoading]     = useState(false);
  const [time, setTime]           = useState('');
  const [lastUpdated, setUpdated] = useState<Date | null>(initialFetchedAt ? new Date(initialFetchedAt) : null);
  // Seeded from the SSR timestamp, not left empty. It used to start as '' and only ever be
  // filled by the client fetch, so server-rendered HTML always showed the em-dash placeholder —
  // while the FAQ, the footer and /llms.txt all promise that every board states the age of its
  // data. Crawlers and AI agents, which read exactly that HTML, saw the promise and not the fact.
  const [updLabel, setUpdLabel]   = useState(() =>
    initialFetchedAt ? relTime(new Date(initialFetchedAt), t) : '');
  const [selected, setSelected]   = useState<Flight | null>(null);
  const [isLive, setIsLive]       = useState(!!initialFetchedAt && Date.now() - initialFetchedAt < 90_000);
  const [showAll, setShowAll]     = useState(false);
  // Gate for the list "rise" animation: never on the initial (SSR/LCP) paint —
  // only once the user actually changes mode/filter. Key-based (not effect-based)
  // so a data refresh on the initial combination can't retrigger it.
  const initialListKey = useRef<string | null>(`${defaultMode}:all`);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(`/api/flights/${airport.iata}?direction=${mode}&locale=${locale}`);
      const data = await res.json();
      setFlights(data.flights || []);
      // Label the age of the data, not of this response. A board for a daily-refreshed
      // airport answers instantly from the store and is still a day old; claiming
      // "updated now" there is exactly the kind of thing that makes the site untrustworthy.
      const ts = typeof data.fetchedAt === 'number' ? new Date(data.fetchedAt) : new Date();
      setUpdated(ts);
      setUpdLabel(relTime(ts, t));
      setIsLive(Date.now() - ts.getTime() < 90_000);
    } catch { /* keep prev */ } finally {
      setLoading(false);
    }
  }, [airport.iata, mode, t]);

  const didInit = useRef(false);
  useEffect(() => {
    // First mount with SSR flights → refresh silently (keep the server rows visible).
    if (!didInit.current && hasInitial) { didInit.current = true; fetchFlights(); return; }
    didInit.current = true;
    setLoading(true);
    fetchFlights();
  }, [fetchFlights]);

  // Poll only while the tab is visible, and stop after a stretch of idle
  // time — so backgrounded/forgotten tabs don't keep burning API quota.
  useEffect(() => {
    let polls = 0;
    const MAX_POLLS = 30; // ~30 min, then stop auto-refresh
    const id = setInterval(() => {
      if (document.hidden) return;
      if (++polls > MAX_POLLS) { clearInterval(id); return; }
      fetchFlights();
    }, 60_000);
    // Refresh immediately when the user returns to the tab
    const onVisible = () => { if (!document.hidden) { polls = 0; fetchFlights(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchFlights]);

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(locale, {
      timeZone: airport.tz || undefined,
      hour: '2-digit', minute: '2-digit', hour12: false,
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [airport.tz, locale]);

  // Stale label updater
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => {
      setUpdLabel(relTime(lastUpdated, t));
      setIsLive((Date.now() - lastUpdated.getTime()) < 90_000);
    }, 15_000);
    return () => clearInterval(id);
  }, [lastUpdated, t]);

  // Filter + search
  const trimSearch = search.trim();
  const visible = flights.filter(f => {
    if (filter !== 'all' && !FILTER_STATUSES[filter].includes(f.status)) return false;
    if (!trimSearch) return true;
    const q = trimSearch.toLowerCase();
    return f.flight.toLowerCase().includes(q)
      || (f.destination || f.origin || '').toLowerCase().includes(q)
      || (f.airline || '').toLowerCase().includes(q);
  });
  const INITIAL = 12;
  const shown = showAll ? visible : visible.slice(0, INITIAL);
  useEffect(() => { setShowAll(false); }, [mode, filter, trimSearch]);

  return (
    // 100dvh keeps the footer from jumping up while a real board loads. With no scheduled
    // service nothing will ever fill it, so reserving a screenful leaves a dead gap between
    // the notice and the rest of the page.
    <div style={{ background: C.bg, minHeight: noService ? undefined : '100dvh', paddingBottom: noService ? 16 : 'calc(48px + env(safe-area-inset-bottom))' }}>

      {/* ── Airport header ─────────────────────────────────── */}
      <div style={{ padding: '16px 20px 10px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* The airport identity is the page's single visible <h1> (replaces the old
              sr-only h1 on the airport/arrivals/departures pages). Styling lives on the
              inner divs, so the heading looks identical — it's just now semantic. */}
          <h1 style={{ margin: 0 }}>
            <div style={{
              fontSize: 'clamp(60px, 17vw, 76px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
              color: C.text,
            }}>
              {airport.iata}
            </div>
            <div style={{ fontSize: 12, color: C.secondary, marginTop: 7, lineHeight: 1.4, maxWidth: 200, opacity: 0.5 }}>
              {displayName || airport.name}
            </div>
          </h1>
          <div style={{ textAlign: 'right', paddingTop: 4 }}>
            <div style={{
              fontSize: 'clamp(18px, 4.5vw, 22px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              color: C.text, lineHeight: 1,
            }}>
              {time}
            </div>
            <div style={{ fontSize: 11, color: C.secondary, marginTop: 4, letterSpacing: '0.02em', opacity: 0.5 }}>
              {t('local_time')}
            </div>
          </div>
        </div>

        {lead && (
          <p style={{ fontSize: 14, lineHeight: 1.5, color: C.secondary, margin: '10px 0 0', maxWidth: 620 }}>{lead}</p>
        )}
        {statusLine && (
          <p style={{ fontSize: 13, lineHeight: 1.5, color: C.text, margin: '6px 0 0', maxWidth: 620, fontVariantNumeric: 'tabular-nums' }}>{statusLine}</p>
        )}
        {/* Live indicator — polite status region so AT hears the refresh. Hidden where no
            airline flies: there is nothing to be fresh about. */}
        {!noService && <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <div
            aria-hidden="true"
            className={isLive ? 'live-dot' : ''}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isLive ? C.green : C.gray,
            }}
          />
          {/* The label is relative to "now", so the ISR-cached server value and the client's
              first paint legitimately differ by a minute; that divergence is the correct
              behaviour, not a bug to fix by dropping the SSR value. */}
          <span suppressHydrationWarning style={{ fontSize: 12, color: C.secondary, opacity: 0.85 }}>{updLabel || '—'}</span>
        </div>}
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      {/* Search, direction tabs and status filters are all controls over a flight list. With
          no scheduled service there is no list to control, so the whole block is dropped
          rather than left as dead UI the visitor will try and get nothing from. */}
      {!noService && <>
      <div style={{ padding: '0 16px 12px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <IconSearch color={search ? C.secondary : C.dim} />
          </div>
          <input
            type="search"
            aria-label={t('search_placeholder')}
            autoComplete="off"
            spellCheck={false}
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '13px 44px',
              fontSize: 16,
              border: `1px solid ${search ? '#333333' : C.border}`,
              borderRadius: 14,
              outline: 'none',
              background: C.surface,
              color: C.text,
              WebkitAppearance: 'none',
              transition: 'border-color 0.15s',
            }}
          />
          {search && (
            <button
              type="button"
              aria-label={tNav('clear')}
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)',
                background: '#2C2C2E', border: 'none', borderRadius: '50%',
                width: 28, height: 28, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >
              <IconClose color={C.secondary} />
            </button>
          )}
        </div>
      </div>

      {/* ── Segmented control ──────────────────────────────── */}
      <div style={{ padding: '0 16px 12px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 13, padding: 3, gap: 2,
        }}>
          {(['departures', 'arrivals'] as Mode[]).map(m => {
            const active = mode === m;
            return (
              <button key={m} type="button" aria-pressed={active} className="press" onClick={() => { haptic(); setMode(m); setFilter('all'); }} style={{
                flex: 1, padding: '11px 0', minHeight: 44,
                fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 11,
                cursor: 'pointer',
                background: active ? '#1C1C1E' : 'transparent',
                color: active ? C.text : C.secondary,
                transition: 'all 0.18s ease',
                letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 15 }} aria-hidden="true">{m === 'departures' ? '✈' : '🛬'}</span>
                {m === 'departures' ? t('departures') : t('arrivals')}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter pills ───────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 7,
        padding: '0 16px 14px',
        overflowX: 'auto',
        maxWidth: 960, margin: '0 auto',
      }}>
        {FILTERS.map(key => {
          const active = filter === key;
          return (
            <button key={key} type="button" aria-pressed={active} className="press" onClick={() => { haptic(); setFilter(key); }} style={{
              padding: '8px 14px', minHeight: 36,
              fontSize: 13, fontWeight: active ? 600 : 400,
              border: active ? 'none' : `1px solid ${C.border}`,
              borderRadius: 999,
              cursor: 'pointer',
              background: active ? C.text : 'transparent',
              color: active ? '#000000' : C.secondary,
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.15s ease',
            }}>
              {key === 'departed' && mode === 'arrivals' ? t('st_arrived') : t(`filter_${key}`)}
            </button>
          );
        })}
      </div>
      </>}

      {/* ── Top meta row ───────────────────────────────────── */}
      {!loading && flights.length > 0 && (
        <div style={{ padding: '0 16px 14px', maxWidth: 960, margin: '0 auto' }}>
          <span style={{ fontSize: 13, color: C.secondary }}>
            <span aria-hidden="true">{mode === 'departures' ? '✈' : '🛬'}</span> {(() => { const n = flights === initialFlights && boardTotal != null ? boardTotal : flights.length; return mode === 'departures' ? t('departures_today', { count: n }) : t('arrivals_today', { count: n }); })()}
          </span>
        </div>
      )}

      {/* ── Flight list ────────────────────────────────────── */}
      <div style={{ padding: '0 16px', maxWidth: 960, margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.gray }}>
            <div style={{ fontSize: 28, letterSpacing: '0.2em' }}>···</div>
          </div>
        )}

        {/* With no scheduled service the notice above already explains the empty board;
            repeating "no flights found" under an error-style icon reads as a failure. */}
        {!loading && !noService && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✈</div>
            {/* "No flights found" is only true once we actually have a board and it is empty.
                With nothing stored at all — the normal state for an airport the warmer has not
                reached — saying it would be a straight falsehood about a real airport, on the
                page type Google already flagged. pendingNote says what is true instead, and
                carries the measured schedule figure so the page still answers the question. */}
            <div style={{ fontSize: 15, color: C.secondary, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
              {pendingNote ?? t('no_flights')}
            </div>
          </div>
        )}

        {/* keyed by mode+filter so a swap remounts the block and replays the rise-in */}
        {(() => { if (initialListKey.current !== null && `${mode}:${filter}` !== initialListKey.current) initialListKey.current = null; return null; })()}
        <div key={`${mode}:${filter}`} className={initialListKey.current === null ? 'rise' : undefined}>
        {shown.map((f, i) => {
          const color = STATUS_COLOR[f.status] || C.gray;
          const label = (() => {
            if (f.status === 'delayed' && f.actual) {
              const [ah, am] = f.actual.split(':').map(Number);
              const [sh, sm] = f.scheduled.split(':').map(Number);
              let delay = (ah * 60 + am) - (sh * 60 + sm);
              if (delay < -720) delay += 1440;   // delayed across midnight
              const delayM = f.delay ?? delay;
              // 'm' was a bare literal here, so Japanese, Korean, Chinese, Arabic, Hindi and
              // Russian boards all rendered "遅延 125m" / "Задержан 125m". The localised
              // ui.delayed_by exists in every catalogue and is already used elsewhere.
              return delayM > 0 ? t('delayed_by', { m: delayM }) : t('st_delayed');
            }
            return t(`st_${f.status}`);
          })();
          const isPast = ['departed', 'arrived'].includes(f.status);
          const place = f.destination || f.origin || '';
          const dm = place.match(/^(.*?)\s*\(([A-Z0-9]{2,4})\)\s*$/);
          const city = dm ? dm[1] : place;
          const code = dm ? dm[2] : '';

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`${f.flight}, ${city}, ${label}`}
              className="frow"
              onClick={() => { haptic(); setSelected(f); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic(); setSelected(f); } }}
              style={{ opacity: isPast ? 0.45 : 1 }}
            >
              {/* Status bar */}
              <div style={{ width: 4, background: color, flexShrink: 0 }} />

              {/* Row content */}
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '18px 16px', gap: 12, minWidth: 0 }}>
                {/* Left: time + flight number — fixed type scale (26 / 12) */}
                <div style={{ flexShrink: 0, width: 72 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: f.actual ? C.orange : C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {f.actual || f.scheduled}
                  </div>
                  {f.actual && (
                    <div style={{ fontSize: 12, color: C.secondary, textDecoration: 'line-through', lineHeight: 1.3, marginTop: 2 }}>{f.scheduled}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 5, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{f.flight}</div>
                </div>

                {/* Center: destination — wraps up to 2 lines so long localized
                    names (Санкт-Петербург, München…) stay readable instead of being cut */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', lineHeight: 1.2, wordBreak: 'break-word',
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{city}</span>
                    {code && <span style={{ fontSize: 12, fontWeight: 500, color: C.secondary, marginLeft: 6, whiteSpace: 'nowrap' }}>({code})</span>}
                  </div>
                </div>

                {/* Right: gate + status + chevron */}
                <div style={{ flexShrink: 0, textAlign: 'end', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ maxWidth: 92 }}>
                    {f.gate && (
                      <div style={{ lineHeight: 1.1, whiteSpace: 'nowrap', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: C.secondary }}>{t('gate')} </span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{f.gate}</span>
                      </div>
                    )}
                    <div style={{
                      fontSize: 12, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase',
                      lineHeight: 1.25,
                      textShadow: f.status === 'finalcall' ? '0 0 10px rgba(255,69,58,0.15)' : 'none',
                    }}>
                      {label}
                    </div>
                  </div>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {!loading && visible.length > shown.length && (
          <button className="press" onClick={() => setShowAll(true)} style={{
            width: '100%', height: 56, marginTop: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
            borderRadius: 18, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>
            {mode === 'departures' ? t('more_departures') : t('more_arrivals')}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 5L6.5 8.5L10 5" stroke="#8A8A8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────── */}
      <BottomSheet
        flight={selected}
        mode={mode}
        onClose={() => setSelected(null)}
        tz={airport.tz || ''}
        locale={locale}
        updLabel={updLabel}
      />
    </div>
  );
}
