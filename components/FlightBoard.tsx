'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Airport } from '@/lib/airports';

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

const STATUS_LABEL: Record<string, string> = {
  ontime:    'ON TIME',
  boarding:  'BOARDING',
  delayed:   'DELAYED',
  finalcall: 'FINAL CALL',
  cancelled: 'CANCELLED',
  departed:  'DEPARTED',
  arrived:   'ARRIVED',
  baggage:   'BAGGAGE CLAIM',
  scheduled: 'SCHEDULED',
};

const FILTER_STATUSES: Record<FilterKey, string[]> = {
  all:       [],
  ontime:    ['ontime', 'scheduled'],
  delayed:   ['delayed', 'finalcall'],
  boarding:  ['boarding'],
  finalcall: ['finalcall'],
  departed:  ['departed', 'arrived', 'baggage'],
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'ontime',    label: 'On Time' },
  { key: 'delayed',   label: 'Delayed' },
  { key: 'boarding',  label: 'Boarding' },
  { key: 'finalcall', label: 'Final Call' },
  { key: 'departed',  label: 'Departed' },
];

const haptic = (ms = 6) => { try { (navigator as any).vibrate?.(ms); } catch {} };

function relTime(d: Date | null): string {
  if (!d) return '';
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 15) return 'Updated now';
  if (s < 60) return `Updated ${s}s ago`;
  if (s < 120) return 'Updated 1 min ago';
  return `Updated ${Math.floor(s / 60)} min ago`;
}

function calcDeparture(
  flight: Flight, tz: string, mode: Mode
): { label: string; value: string; sub: string; accent?: string } | null {
  if (['departed', 'baggage'].includes(flight.status)) {
    return { label: mode === 'departures' ? 'Departed' : 'Arrived', value: flight.scheduled, sub: '', accent: C.gray };
  }
  if (flight.status === 'arrived') {
    return { label: 'Arrived', value: flight.scheduled, sub: '', accent: C.gray };
  }
  if (flight.status === 'cancelled') {
    return { label: 'Cancelled', value: '—', sub: `Was ${flight.scheduled}`, accent: C.red };
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
      const delay = (h * 60 + m) - (sh * 60 + sm);
      return { label: `Delayed by ${delay}m`, value: flight.actual, sub: `Was ${flight.scheduled}`, accent: C.orange };
    }
    if (diff <= 0) {
      if (flight.status === 'boarding') return { label: 'Boarding', value: 'now', sub: flight.gate ? `Gate ${flight.gate}` : '', accent: C.blue };
      if (flight.status === 'finalcall') return { label: 'Final Call', value: 'now', sub: 'Go to gate immediately', accent: C.red };
      return { label: mode === 'departures' ? 'Departing' : 'Landing', value: 'now', sub: '', accent: C.green };
    }
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const countdown = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    if (flight.status === 'boarding') return { label: 'Boarding', value: countdown, sub: flight.gate ? `Gate ${flight.gate}` : '', accent: C.blue };
    if (flight.status === 'finalcall') return { label: 'Final Call', value: countdown, sub: 'Go to gate now!', accent: C.red };
    return { label: mode === 'departures' ? 'Departs in' : 'Arrives in', value: countdown, sub: `Scheduled ${flight.scheduled}` };
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

function BottomSheet({ flight, mode, onClose, tz, locale, updLabel }: {
  flight: Flight | null;
  mode: Mode;
  onClose: () => void;
  tz: string;
  locale: string;
  updLabel: string;
}) {
  const vis = !!flight;
  const color = flight ? (STATUS_COLOR[flight.status] || C.gray) : C.gray;
  const label = flight ? (STATUS_LABEL[flight.status] || flight.status.toUpperCase()) : '';
  const labelTitle = label.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');

  const countdown = flight ? calcDeparture(flight, tz, mode) : null;

  const dateStr = flight ? new Date().toLocaleDateString(locale, {
    timeZone: tz || undefined,
    weekday: 'short', month: 'short', day: 'numeric',
  }) : '';

  const updShort = updLabel.replace('Updated ', '') || '—';

  useEffect(() => {
    document.body.style.overflow = vis ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [vis]);

  const D = <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: vis ? 1 : 0,
        pointerEvents: vis ? 'auto' : 'none',
        transition: 'opacity 0.28s ease',
      }} />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#111111',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '32px 32px 0 0',
        transform: vis ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 48, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {flight && (
          <div style={{ padding: '8px 24px 0' }}>

            {/* ── Header: flight number + status badge ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{
                fontSize: 'clamp(48px, 14vw, 60px)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: C.text,
                lineHeight: 1,
              }}>
                {flight.flight}
              </div>

              {/* Status pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 13px',
                borderRadius: 999,
                background: color + '1A',
                border: `1px solid ${color}4D`,
                marginTop: 8, flexShrink: 0,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.07em' }}>{label}</span>
              </div>
            </div>

            {/* Destination */}
            <div style={{ fontSize: 22, color: '#A1A1A1', marginBottom: 5, lineHeight: 1.2, fontWeight: 400 }}>
              {flight.destination || flight.origin}
            </div>

            {/* Airline */}
            <div style={{ fontSize: 17, color: C.text, fontWeight: 500 }}>
              {flight.airline}
            </div>

            {D}

            {/* ── Countdown card ── */}
            {countdown && (
              <div style={{
                background: '#1C1C1E',
                borderRadius: 18,
                padding: '14px 20px 14px',
                marginBottom: 16,
              }}>
                <div style={{
                  fontSize: 12, color: '#8A8A8A',
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  marginBottom: 6,
                }}>
                  {countdown.label}
                </div>
                <div style={{
                  fontSize: countdown.value.length > 5 ? 40 : 48,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: countdown.accent || C.text,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {countdown.value}
                </div>
                {countdown.sub && (
                  <div style={{ fontSize: 14, color: C.secondary, marginTop: 7 }}>
                    {countdown.sub}
                  </div>
                )}
              </div>
            )}

            {/* ── Departure / Gate grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px', marginBottom: 0 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  {mode === 'departures' ? 'Departure' : 'Arrival'}
                </div>
                <div style={{
                  fontSize: 40, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                  color: flight.actual ? C.orange : C.text,
                  lineHeight: 1,
                }}>
                  {flight.actual || flight.scheduled}
                </div>
                {flight.actual && (
                  <div style={{ fontSize: 13, color: C.secondary, textDecoration: 'line-through', marginTop: 3 }}>
                    {flight.scheduled}
                  </div>
                )}
                <div style={{ fontSize: 14, color: '#6A6A6A', marginTop: 5 }}>
                  {dateStr}
                </div>
              </div>

              {flight.gate && (
                <div>
                  <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Gate</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {flight.gate}
                  </div>
                </div>
              )}
            </div>

            {D}

            {/* ── Status / Updated grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div>
                <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Flight status
                </div>
                <div style={{ fontSize: 22, fontWeight: 600, color, lineHeight: 1.2 }}>
                  {labelTitle}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Updated
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, color: C.text, lineHeight: 1.2 }}>
                  {updShort}
                </div>
              </div>
            </div>

            {/* ── Terminal (only if present) ── */}
            {flight.terminal && (
              <>
                {D}
                <div>
                  <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Terminal</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: C.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {flight.terminal}
                  </div>
                </div>
              </>
            )}

            {/* ── Baggage carousel (arrivals only) ── */}
            {flight.baggage && (
              <>
                {D}
                <div>
                  <div style={{ fontSize: 12, color: '#8A8A8A', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Baggage claim</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: C.green, lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {flight.baggage}
                  </div>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlightBoard({ airport, locale, defaultMode = 'departures' }: {
  airport: Airport;
  locale: string;
  defaultMode?: Mode;
}) {
  const [mode, setMode]           = useState<Mode>(defaultMode);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [search, setSearch]       = useState('');
  const [flights, setFlights]     = useState<Flight[]>([]);
  const [loading, setLoading]     = useState(true);
  const [time, setTime]           = useState('');
  const [lastUpdated, setUpdated] = useState<Date | null>(null);
  const [updLabel, setUpdLabel]   = useState('');
  const [selected, setSelected]   = useState<Flight | null>(null);
  const [isLive, setIsLive]       = useState(false);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch(`/api/flights/${airport.iata}?direction=${mode}`);
      const data = await res.json();
      setFlights(data.flights || []);
      const now = new Date();
      setUpdated(now);
      setUpdLabel('Updated now');
      setIsLive(true);
    } catch { /* keep prev */ } finally {
      setLoading(false);
    }
  }, [airport.iata, mode]);

  useEffect(() => { setLoading(true); fetchFlights(); }, [fetchFlights]);
  useEffect(() => {
    const id = setInterval(fetchFlights, 60_000);
    return () => clearInterval(id);
  }, [fetchFlights]);

  // Live clock
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString(locale, {
      timeZone: airport.tz || undefined,
      hour: '2-digit', minute: '2-digit',
    }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [airport.tz, locale]);

  // Stale label updater
  useEffect(() => {
    if (!lastUpdated) return;
    const id = setInterval(() => {
      setUpdLabel(relTime(lastUpdated));
      setIsLive((Date.now() - lastUpdated.getTime()) < 90_000);
    }, 15_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

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

  return (
    <div style={{ background: C.bg, minHeight: '100dvh', paddingBottom: 'calc(48px + env(safe-area-inset-bottom))' }}>

      {/* ── Airport header ─────────────────────────────────── */}
      <div style={{ padding: '16px 20px 10px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
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
              {airport.name}
            </div>
          </div>
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
              Local time
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <div
            className={isLive ? 'live-dot' : ''}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isLive ? C.green : C.gray,
            }}
          />
          <span style={{ fontSize: 12, color: C.secondary, opacity: 0.7 }}>{updLabel || '—'}</span>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────── */}
      <div style={{ padding: '0 16px 12px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <IconSearch color={search ? C.secondary : C.dim} />
          </div>
          <input
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search flight (SU1404), city or airline"
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
              onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: '#2C2C2E', border: 'none', borderRadius: '50%',
                width: 20, height: 20, cursor: 'pointer',
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
              <button key={m} onClick={() => { haptic(); setMode(m); setFilter('all'); }} style={{
                flex: 1, padding: '9px 0',
                fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 11,
                cursor: 'pointer',
                background: active ? '#1C1C1E' : 'transparent',
                color: active ? C.text : C.secondary,
                transition: 'all 0.18s ease',
                letterSpacing: '-0.01em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: active ? 1 : 0.45,
              }}>
                <span style={{ fontSize: 15 }}>{m === 'departures' ? '✈' : '🛬'}</span>
                {m === 'departures' ? 'Departures' : 'Arrivals'}
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
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => { haptic(); setFilter(f.key); }} style={{
              padding: '6px 14px',
              fontSize: 13, fontWeight: active ? 600 : 400,
              border: active ? 'none' : `1px solid ${C.border}`,
              borderRadius: 999,
              cursor: 'pointer',
              background: active ? C.text : 'transparent',
              color: active ? '#000000' : C.secondary,
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.15s ease',
              opacity: active ? 1 : 0.5,
            }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* ── Flight count bar ───────────────────────────────── */}
      {!loading && flights.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 16px 10px', maxWidth: 960, margin: '0 auto',
        }}>
          <span style={{ fontSize: 12, color: C.secondary }}>
            {mode === 'departures' ? '✈' : '🛬'} {flights.length} {mode} today
          </span>
          <span style={{ fontSize: 12, color: C.dim }}>
            {new Date().toLocaleDateString(locale, {
              timeZone: airport.tz || undefined,
              weekday: 'long', month: 'short', day: 'numeric',
            })}
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

        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✈</div>
            <div style={{ fontSize: 15, color: C.secondary }}>No flights found</div>
          </div>
        )}

        {visible.map((f, i) => {
          const color = STATUS_COLOR[f.status] || C.gray;
          const label = (() => {
            if (f.status === 'delayed' && f.actual) {
              const [ah, am] = f.actual.split(':').map(Number);
              const [sh, sm] = f.scheduled.split(':').map(Number);
              const delay = (ah * 60 + am) - (sh * 60 + sm);
              return delay > 0 ? `DELAYED ${delay}M` : 'DELAYED';
            }
            return STATUS_LABEL[f.status] || f.status.toUpperCase();
          })();
          const isPast = ['departed', 'arrived'].includes(f.status);

          return (
            <div
              key={i}
              onClick={() => { haptic(); setSelected(f); }}
              style={{
                display: 'flex',
                background: C.surface,
                borderRadius: 14,
                marginBottom: 7,
                overflow: 'hidden',
                cursor: 'pointer',
                opacity: isPast ? 0.4 : 1,
                border: `1px solid ${C.border}`,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Status bar */}
              <div style={{ width: 4, background: color, flexShrink: 0 }} />

              {/* Row content */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flex: 1,
                padding: '9px 14px',
                gap: 11,
                minWidth: 0,
              }}>
                {/* Left: time + flight number */}
                <div style={{ flexShrink: 0, width: 60 }}>
                  <div style={{
                    fontSize: 19, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: f.actual ? C.orange : C.text,
                    lineHeight: 1.1,
                  }}>
                    {f.actual || f.scheduled}
                  </div>
                  {f.actual && (
                    <div style={{ fontSize: 10, color: C.secondary, textDecoration: 'line-through', lineHeight: 1.2 }}>
                      {f.scheduled}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#5A5A5A', marginTop: 3, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    {f.flight}
                  </div>
                </div>

                {/* Center: destination */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 600, color: C.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    lineHeight: 1.1,
                  }}>
                    {f.destination || f.origin}
                  </div>
                </div>

                {/* Right: gate + status + chevron */}
                <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    {f.gate && (
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                        {f.gate}
                      </div>
                    )}
                    <div style={{
                      fontSize: 10, fontWeight: 700,
                      color,
                      letterSpacing: '0.08em',
                      marginTop: f.gate ? 4 : 0,
                      lineHeight: 1,
                    }}>
                      {label}
                    </div>
                  </div>
                  <IconChevron />
                </div>
              </div>
            </div>
          );
        })}
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
