'use client';
import { numLocale } from '@/lib/i18n';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { initialRowCount } from '@/lib/board-window';
import { track, GOALS } from '@/lib/track';
import type { Airport } from '@/lib/airports';

type T = (key: string, values?: Record<string, string | number>) => string;
type Mode = 'departures' | 'arrivals';
type FilterKey = 'all' | 'ontime' | 'delayed' | 'boarding' | 'finalcall' | 'departed';

type Flight = {
  flight: string;
  airline: string;
  destination?: string;
  origin?: string;
  arrIata?: string;
  depIata?: string;
  scheduled: string;
  actual?: string;
  gate?: string;
  terminal?: string;
  baggage?: string;
  aircraft?: string;
  delay?: number;
  /** Effective time as unix seconds. See mapFlight in lib/flights.ts — the printed "HH:MM"
   *  cannot separate past from future across a midnight rollover, and the status field
   *  answers a different question. Optional because the client /api path predates it. */
  ts?: number;
  status: string;
};

/**
 * С какого возраста данные помечаются устаревшими.
 *
 * Двенадцать часов — потолок яруса hub из lib/warm.ts: всё, что старше, просрочено даже по
 * самому щадящему нормативу, кроме младших ярусов, которым в принципе положены сутки. Порог
 * намеренно один на все аэропорты: читателю не объяснить, почему у одного табло «устарело»
 * начинается с шести часов, а у другого с суток.
 */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

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
  // Past rows get their own tone rather than reusing `gray`. Measured against the composited
  // row background (#080808 under the row's own translucency), the word "Вылетел" in #3A3A3C
  // at opacity 0.45 came out at 1.18:1 — the WCAG floor for body text is 4.5:1, so it was not
  // dim, it was invisible. #ADADB2 at 0.70 gives 4.69:1. `gray` itself still serves the
  // `scheduled` status on full-opacity rows and must not move.
  past:      '#ADADB2',
};

const STATUS_COLOR: Record<string, string> = {
  ontime:    C.green,
  boarding:  C.blue,
  delayed:   C.orange,
  finalcall: C.red,
  cancelled: C.red,
  departed:  C.past,
  arrived:   C.past,
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
// Arrivals never board and never make a final call — those chips on an arrivals board were
// filters over statuses that cannot occur, i.e. two dead buttons on every arrivals view.
// (Spotted by an external reviewer pass; confirmed in mapStatus: arrivals rows only ever map
// to scheduled/ontime/delayed/arrived/baggage/cancelled.)
const ARR_FILTERS: FilterKey[] = ['all', 'ontime', 'delayed', 'departed'];

const haptic = (ms = 6) => { try { (navigator as any).vibrate?.(ms); } catch {} };

// Age of the DATA, not of the request. Tail airports are refreshed daily, so this has to
// degrade past minutes gracefully — "1440 min ago" is technically true and useless.
/**
 * Длительность словами локали: «2 ч 45 м», «2h 45m», «2小时 45分钟».
 *
 * Задержка печаталась сырыми минутами — «Delayed by 165m», «延误 165 分钟» — потому что единица
 * была вшита в саму строку каталога, а часов в ней не было вовсе. Полтора часа задержки
 * читаются как «90m», два с половиной — как «150m»: человек считает в уме то, что должен
 * сообщать интерфейс. Форматировщик уже существовал внутри карточки рейса, но строка табло до
 * него не дотягивалась — здесь он поднят на уровень модуля, чтобы им пользовались оба места.
 */
function fmtDur(mins: number, t: T): string {
  const hrs = Math.floor(mins / 60), mm = mins % 60;
  // Ровный час печатается без минут: «2 h», а не «2 h 0 m». Круглые задержки — самые частые
  // (диспетчер объявляет два часа, а не сто девятнадцать минут), и «0 m» на проде висело
  // на каждой второй задержанной строке.
  if (hrs > 0) return mm > 0 ? `${hrs} ${t('dur_h')} ${mm} ${t('dur_m')}` : `${hrs} ${t('dur_h')}`;
  return `${mm} ${t('dur_m')}`;
}

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
      return { label: t('delayed_by', { d: fmtDur(delayM, t) }), value: flight.actual, sub: t('was', { time: flight.scheduled }), accent: C.orange };
    }
    if (diff <= 0) {
      if (flight.status === 'boarding') return { label: t('st_boarding'), value: t('now'), sub: flight.gate ? `${t('gate')}\u2068 ${flight.gate}\u2069` : '', accent: C.blue };
      if (flight.status === 'finalcall') return { label: t('final_call'), value: t('now'), sub: t('go_to_gate'), accent: C.red };
      return { label: mode === 'departures' ? t('departing') : t('landing'), value: t('now'), sub: '', accent: C.green };
    }
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    const countdown = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    if (flight.status === 'boarding') return { label: t('st_boarding'), value: countdown, sub: flight.gate ? `${t('gate')}\u2068 ${flight.gate}\u2069` : '', accent: C.blue };
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
    <svg data-flip width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5.5L1 10" stroke="#3A3A3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

function BottomSheet({ flight, mode, onClose, tz, locale, updLabel, originIata, originName, isPinned, onTogglePin }: {
  flight: Flight | null;
  mode: Mode;
  onClose: () => void;
  tz: string;
  locale: string;
  updLabel: string;
  originIata: string;
  originName: string;
  /** Whether THIS flight is the pinned one, and the toggle for it. */
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const t = useTranslations('ui');
  // «→» не разворачивается алгоритмом двунаправленного письма (Bidi_Mirrored=No)
  const arrow = locale === 'ar' ? '←' : '→';
  const tNav = useTranslations('nav');
  const vis = !!flight;

  useEffect(() => {
    document.body.style.overflow = vis ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [vis]);

  // Dialog a11y: focus the sheet on open, close on Escape, restore focus on close, and keep
  // Tab inside it. aria-modal="true" tells a screen reader the rest of the page is out of
  // scope, but it does nothing to keyboard focus — measured on the live sheet, Tab walked
  // straight out into the board rows behind, which are still clickable but hidden behind a
  // blurred scrim. Cycling within the sheet is the whole of the fix; the sheet itself is
  // focusable (tabIndex -1) so a sheet with one button still has somewhere to land.
  useEffect(() => {
    if (!vis) return;
    const prev = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const sheet = sheetRef.current;
      if (!sheet) return;
      const stops = [...sheet.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter(el => el.offsetParent !== null);
      if (!stops.length) { e.preventDefault(); sheet.focus(); return; }
      const first = stops[0], last = stops[stops.length - 1];
      const on = document.activeElement;
      if (e.shiftKey && (on === first || on === sheet)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && on === last) { e.preventDefault(); first.focus(); }
      else if (!sheet.contains(on)) { e.preventDefault(); first.focus(); }
    };
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
  /**
   * Сколько минут до рейса. ОТРИЦАТЕЛЬНОЕ значение означает, что время уже прошло.
   *
   * Считалось это по строке «05:05» с докруткой `if (diff < -300) diff += 1440` — то есть
   * всё, что старше пяти часов, объявлялось завтрашним. На протухшем борту это давало
   * карточку «Выход закроется в 974 мин», «Срочно направляйтесь к выходу» и завтрашнюю
   * дату. Замер 12.08 на девяти бортах: 91 строка из 287, то есть треть всех открытий
   * карточки — а открыть карточку и есть единственное осмысленное действие на странице.
   *
   * Отметка времени у строки есть (`f.ts` — оценочное время, а при его отсутствии
   * расписание, ровно как и `dispTime`), поэтому арифметика на строках нужна только там,
   * где её нет. Докрутка в этом запасном пути СОХРАНЕНА и остаётся верной: вылет в 00:35,
   * увиденный в 22:00, действительно завтрашний.
   */
  const minsUntil = (timeStr?: string, ts?: number): number | null => {
    if (ts) return Math.round((ts * 1000 - Date.now()) / 60_000);
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const now = localNow();
    let diff = (h * 60 + m) - (now.h * 60 + now.m);
    if (diff < -300) diff += 1440;
    return diff;
  };

  const L = { fontSize: 12, color: C.secondary, textTransform: 'uppercase' as const, letterSpacing: '0.12em' };
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
  useEffect(() => { if (!vis) { dragStart.current = null; dragY.current = 0; } }, [vis]);
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
    const mins = minsUntil(dispTime, flight.ts);
    /**
     * Время рейса УЖЕ прошло по часам читателя.
     *
     * Статус при этом может по-прежнему говорить «посадка» или «по расписанию»: он строится
     * от часов СНИМКА (см. mapStatus в lib/flights.ts), а снимку бывает шесть часов. Писать
     * из-за этого «Вылетел» нельзя — вылета снимок не видел, и это было бы выдуманным фактом.
     * А вот гнать человека к выходу и считать обратный отсчёт — нельзя тем более.
     *
     * Поэтому у прошедшего рейса карточка становится нейтральной: время, направление, выход,
     * терминал — и ни одного побуждения к действию. Возраст данных читатель видит тут же:
     * подпись `updLabel` приезжает в саму карточку.
     */
    const past = mins != null && mins < 0;
    const n = localNow();
    const nowClock = `${String(n.h).padStart(2, '0')}:${String(n.m).padStart(2, '0')}`;
    // The date of the FLIGHT, not of the reader. This printed today unconditionally, so a
    // Kazan departure at 00:35 was labelled "Sat, 8 Aug" while the countdown right beside it
    // correctly said "in 9 h" — the card contradicted itself, and six of the thirty-three
    // departures on that board were already the next day. minsUntil() already rolls over
    // midnight (see its -300 guard), so shifting now by it lands on the right day, and on a
    // flight that has already gone it steps back, which is equally correct.
    const dateStr = new Date(Date.now() + (mins ?? 0) * 60_000)
      .toLocaleDateString(numLocale(locale), { timeZone: tz || undefined, weekday: 'short', month: 'short', day: 'numeric' });

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
      // dispTime, not scheduled: with an actual time present the hero showed the SCHEDULED
      // time under the caption "actual departure", while the real actual sat in the grid —
      // and the dedup gate below, comparing against dispTime, let the time card render too.
      hero = { label: t('flight_departed'), main: dispTime, sub: t('actual_dep') };
    } else if (status === 'baggage') {
      hero = { label: t('st_baggage'), main: flight.baggage || dispTime };
    } else if (status === 'cancelled') {
      hero = { label: t('h_cancel_label'), main: t('h_cancel_main'), sub: t('h_cancel_sub'), icon: 'bell', medium: true };
    } else if (status === 'boarding' && !past) {
      hero = { label: t('h_board_label'), main: t('h_board_main'), sub: t('gate_closes', { m: Math.max(1, mins ?? 0) }), bottom: dispTime, icon: 'plane', medium: true };
    } else if (status === 'finalcall' && !past) {
      hero = { label: t('h_final_label'), main: t('h_final_main'), sub: t('gate_closes', { m: Math.max(1, mins ?? 0) }), bottom: dispTime, icon: 'bell', medium: true };
    } else if (status === 'delayed' && (!past || (flight.delay ?? 0) > 0)) {
      // The struck "was HH:MM" line only makes sense when the displayed time differs from it.
      hero = { label: t('h_delay_label', { dur: fmtDur(flight.delay && flight.delay > 0 ? flight.delay : Math.max(0, mins ?? 0), t) }), main: dispTime, sub: flight.actual && flight.actual !== flight.scheduled ? t('was', { time: flight.scheduled }) : undefined, subStrike: true, icon: 'clock' };
    } else {
      hero = past
        // Нейтральная карточка: время и подпись «вылет»/«прибытие», без отсчёта и без
        // утверждения, что рейс ушёл. Строку «По расписанию HH:MM» оставляем только
        // когда показанное время от расписания отличается, иначе она дублирует главное.
        ? { label: isDep ? t('departure') : t('arrival'), main: dispTime, sub: flight.actual && flight.actual !== flight.scheduled ? t('on_schedule', { time: flight.scheduled }) : undefined, subStrike: !!flight.actual, icon: 'clock' }
        : { label: isDep ? t('departs_in') : t('arrives_in'), main: mins != null && mins > 0 ? fmtDur(mins, t) : t('now'), sub: t('on_schedule', { time: flight.scheduled }), icon: 'clock' };
    }

    // ── Detail grid: only fields with data, never the status (already in hero) ──
    // The time card is skipped when the hero already displays the same time (boarding and
    // final-call put it in hero.bottom; delayed and departed put it in hero.main) — the sheet
    // used to show "ВЫЛЕТ 23:05" twice in a row, which reads as a rendering bug, not design.
    type Block = { label: string; value: string; valueColor?: string; strike?: string; sub?: string };
    const timeInHero = hero.bottom != null || hero.main === dispTime;
    const blocks: Block[] = [];
    if (!timeInHero) blocks.push({
      label: isDep ? t('departure') : t('arrival'), value: dispTime,
      valueColor: flight.actual ? C.orange : C.text, strike: flight.actual ? flight.scheduled : undefined, sub: dateStr,
    });
    if (flight.gate)     blocks.push({ label: t('gate'), value: flight.gate });
    if (flight.terminal) blocks.push({ label: t('terminal'), value: flight.terminal });
    if (flight.baggage && status !== 'baggage') blocks.push({ label: t('baggage'), value: flight.baggage, valueColor: C.green });
    if (flight.aircraft) blocks.push({ label: t('aircraft_type'), value: flight.aircraft });

    // ── Route strip: origin → destination, so the sheet carries its own context ──
    const otherPlace = (flight.destination || flight.origin || '').replace(/\s*\([A-Z0-9]{2,4}\)\s*$/, '');
    const otherIata = (isDep ? flight.arrIata : flight.depIata) || '';
    const routeFrom = isDep ? { code: originIata, name: originName } : { code: otherIata, name: otherPlace };
    const routeTo   = isDep ? { code: otherIata, name: otherPlace } : { code: originIata, name: originName };

    // У прошедшего рейса совета «приезжайте заранее» быть не может по смыслу: ехать уже
    // некуда. Это тот же дефект, что и обратный отсчёт, только словами.
    const notice = past ? null :
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
            {/* The one persistent action this sheet has. Watching a flight means coming back
                three to five times; before this button every return started with re-finding
                the row in an 80-row list. Pin state lives in localStorage (ab_pinned), scoped
                to today — see the pinned card in FlightBoard. */}
            <button
              onClick={() => { haptic(); onTogglePin(); }}
              style={{
                marginTop: 10, padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                border: `1px solid ${isPinned ? C.blue : C.border}`,
                background: isPinned ? 'rgba(10,132,255,0.12)' : 'transparent',
                color: isPinned ? C.blue : C.secondary, cursor: 'pointer',
              }}
            >
              {isPinned ? t('unpin_flight') : t('pin_flight')}
            </button>
            <div style={{ fontSize: 'clamp(22px, 6.5vw, 30px)', color: '#A1A1A1', marginTop: 12, lineHeight: 1.15 }}>{flight.destination || flight.origin}</div>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 600, marginTop: 6 }}>{flight.airline}</div>
          </div>
        </div>

        {/* Route strip — where from, where to. The sheet is shareable context on its own.
            It is also the sheet's only way OUT. Everything else here ends the journey: one
            action (pin), a close button, and a board the visitor already came from — which is
            most of why a session is 1.79 pages deep, since neither the mode tabs nor this sheet
            change the URL. /{locale}/route/{FROM}-{TO} is an existing, indexed page that answers
            the obvious next question ("what else flies this route today"), so no new page class
            is created. Deliberately NOT /flight/{code}: that class 404s on purpose, and putting
            ~13k thin pages back into the index is a decision already taken the other way.
            Linkified only for real IATA pairs, because the route page matches ^[A-Z]{3}-[A-Z]{3}$
            and anything else would hand the visitor a 404. */}
        {routeFrom.code && routeTo.code && (() => {
          const strip = (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1 }}>{routeFrom.code}</div>
                <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{routeFrom.name}</div>
              </div>
              <svg data-flip width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="route-arrow" style={{ flexShrink: 0, opacity: 0.45 }}><path d="M3 12h16m0 0-6-6m6 6-6 6" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'end' }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1 }}>{routeTo.code}</div>
                <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{routeTo.name}</div>
              </div>
            </>
          );
          const box = { display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 0', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 } as const;
          const pair = /^[A-Z]{3}$/i.test(routeFrom.code) && /^[A-Z]{3}$/i.test(routeTo.code);
          if (!pair) return <div style={box}>{strip}</div>;
          return (
            <Link
              href={`/${locale}/route/${routeFrom.code.toUpperCase()}-${routeTo.code.toUpperCase()}`}
              className="press"
              aria-label={`${routeFrom.code} ${arrow} ${routeTo.code}`}
              style={{ ...box, textDecoration: 'none', color: 'inherit' }}
            >
              {strip}
              {/* Same chevron the board rows use, so "this opens something" reads the same way twice. */}
              <svg data-flip width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginInlineStart: 2 }}>
                <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          );
        })()}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '18px 0' }} />

        {/* Hero card */}
        <div style={{ background: color + '1A', border: `1px solid ${color}40`, borderRadius: 18, padding: '18px 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...L, marginBottom: 10 }}>{hero.label}</div>
              <div style={{ fontSize: heroMainSize, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{hero.main}</div>
              {hero.sub && <div style={{ fontSize: 15, color: C.secondary, marginTop: 10, textDecoration: hero.subStrike ? 'line-through' : 'none' }}>{hero.sub}</div>}
              {timeInHero && <div style={{ fontSize: 12, color: C.secondary, opacity: 0.7, marginTop: 8 }}>{dateStr}</div>}
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

        {/* Age of the data — the sheet inherits the board's honest freshness label. */}
        {updLabel && <div style={{ fontSize: 12, color: C.secondary, opacity: 0.75, marginTop: 14, textAlign: 'end' }}>{updLabel}</div>}

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
        // Пока шторка закрыта, её не должно быть ни в дереве доступности, ни в обходе Tab:
        // в отданной разметке она лежит всегда, и кнопка «Закрыть» была 54-й остановкой —
        // между последней строкой рейса и кнопкой «показать ещё». role и aria-modal тоже
        // объявляются только когда шторка видна: постоянный aria-modal="true" сообщает
        // программе чтения, что остальная страница недоступна, — при закрытой шторке это ложь.
        inert={!vis}
        role={vis ? 'dialog' : undefined}
        aria-modal={vis ? true : undefined}
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
        {/* The grab handle doubles as the close control, and at 12px+5px+6px it measured 23px
            tall — just under the 24px WCAG 2.2 asks for, on the one control every visitor needs
            to leave. The extra padding is invisible: the bar itself is unchanged, the target
            around it is not. */}
        <button type="button" onClick={onClose} aria-label={tNav('close')} style={{ display: 'block', width: '100%', padding: '16px 0 12px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 48, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.22)', margin: '0 auto' }} />
        </button>
        {body}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlightBoard({ airport, locale, defaultMode = 'departures', displayName, initialFlights, initialFetchedAt, boardTotal, lead, statusLine = null, noService = false, pendingNote = null, infoOnly = false, initialAllPast = false }: {
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
  /** The board can never be filled for this airport (no provider feed, no published routes,
   *  no measurement), so <title> offers airport INFORMATION rather than a live board.
   *
   *  This exists because the title and the body had drifted apart. `noService` covers the
   *  airports measured at zero and already strips the chrome; the 299 airports that were
   *  never measured at all got the honest new title and still rendered a full live-board
   *  skeleton — direction tabs plus six status filters ("On time", "Boarding", "Final call")
   *  over an empty list. That is the "broken tool" impression a reviewer forms in the first
   *  screenful, and the page's genuine content (location, terminals, FAQ) sat below it.
   *
   *  Chrome only: the empty-state TEXT still comes from pendingNote, because "no scheduled
   *  flights" would be a claim we cannot make about an airport we never measured. */
  infoOnly?: boolean;
  /**
   * Посчитано НА СЕРВЕРЕ от настоящего времени: все ли строки отданного борта уже в
   * прошлом. Нужен затем, что клиентский `realNow` на сервере равен нулю, а значит
   * плашка и направление среза не могли попасть в отданную разметку. Подробнее — у
   * объявления `allPast` ниже.
   */
  initialAllPast?: boolean;
}) {
  const t = useTranslations('ui');
  const tNav = useTranslations('nav');
  const hasInitial = !!(initialFlights && initialFlights.length);
  /** Suppress the live-board chrome. Two different reasons, one identical layout. */
  const bare = noService || infoOnly;

  /**
   * The instant the CURRENT SNAPSHOT was taken — not the wall clock.
   *
   * Seeded with the snapshot time, not Date.now(), because this value decides how many rows
   * render and which of them are muted — and those must be identical on the server and at
   * hydration or React tears the tree down and rebuilds it. `initialFetchedAt` is a prop, so
   * both sides see the same number.
   *
   * Раньше сразу после монтирования оно подменялось на Date.now() и дальше тикало каждую
   * минуту. Для подсветки прошедших рейсов это было верно, но подсветка давно живёт на
   * отдельном `realNow` (см. ниже), а здесь тиканье ЛОМАЛО РАЗМЕТКУ: число строк считает
   * initialRowCount как «сколько рейсов ещё впереди», и стоило точке отсчёта уехать со
   * времени снимка на настоящее, как ответ менялся скачком.
   *
   * Замер на проде, 43 борта: схлопывались 36. Сервер отдавал 30 строк, клиент через долю
   * секунды оставлял 12 — минус 18 строк, около 1300 px, ровно под пальцем у человека,
   * который уже начал читать. Причём строки к тому моменту уже приехали по проводу и были
   * оплачены трафиком. Схлопывание точно совпадало с протухшестью снимка: у свежих бортов
   * (AER, AYT, DXB, HND, IST, KZN — 0.2 ч) его не было вовсе, у 16–22-часовых — у всех.
   *
   * Теперь точка отсчёта меняется РОВНО ТОГДА, когда меняются сами данные: fetchFlights
   * ставит её на fetchedAt пришедшего ответа. Смена разметки в этот момент оправдана — под
   * ней новый снимок, — а на пустом месте её больше нет.
   *
   * Zero when the board has never been fetched; the two call sites fall back to the status
   * field there, which is the behaviour that shipped before this existed.
   */
  const [nowMs, setNowMs] = useState<number>(() => initialFetchedAt || 0);
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
  // Search starts as an icon and expands in place of the mode tabs. The full-width input cost
  // ~62px of the first screen on every visit, for a control most visitors never touch — the
  // board itself is what they came for, and it was down to a single visible row on mobile.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  // ── Pinned flight ────────────────────────────────────────────────────────────
  // The strongest retention primitive this page can have without a backend. Watching a
  // flight IS a repeat activity (Metrika: 235-second sessions, 0.7% returns — people study
  // the board once and never come back); the pin gives the return visit something to land
  // on: a sticky card at the top instead of re-scanning an 80-row list. Scoped to the
  // CURRENT day — yesterday's pin is noise and is dropped on read.
  type Pin = { iata: string; flight: string; date: string; mode: Mode };
  const todayStr = () => new Date().toISOString().slice(0, 10);
  const [pinned, setPinned] = useState<Pin | null>(null);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('ab_pinned') || 'null') as Pin | null;
      if (p && p.iata === airport.iata && p.date === todayStr()) setPinned(p);
      else if (p && p.date !== todayStr()) localStorage.removeItem('ab_pinned');
    } catch { /* storage unavailable */ }
  }, [airport.iata]);
  const togglePin = useCallback((code: string) => {
    setPinned(prev => {
      const next = prev?.flight === code ? null : { iata: airport.iata, flight: code, date: todayStr(), mode };
      try {
        if (next) localStorage.setItem('ab_pinned', JSON.stringify(next));
        else localStorage.removeItem('ab_pinned');
      } catch { /* best-effort */ }
      return next;
    });
  }, [airport.iata, mode]);
  const pinnedFlight = pinned ? flights.find(f => f.flight === pinned.flight) ?? null : null;

  // A live title for the HIDDEN tab only: "12:35 SU1403 · AER" — the tab becomes a glanceable
  // board on its own, which is the cheapest return-visit surface a site like this has.
  // Strictly gated on document.hidden, and restored on visibility: Google renders pages with a
  // visible viewport, so a dynamic title on the visible tab could be indexed in place of the
  // SEO title. No i18n needed — the string is a time, a flight code and an IATA code.
  useEffect(() => {
    const original = document.title;
    const compute = () => {
      // The pinned flight, if any, is what this person actually cares about; the next
      // non-terminal flight is the fallback for everyone else.
      const pin = pinned ? flights.find(f => f.flight === pinned.flight) : null;
      const next = pin ?? flights.find(f => !['departed', 'arrived', 'baggage', 'cancelled'].includes(f.status));
      return next ? `${next.actual || next.scheduled} ${next.flight} · ${airport.iata}` : null;
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    const apply = () => {
      if (document.hidden) {
        const t2 = compute();
        if (t2) document.title = t2;
        if (!timer) timer = setInterval(() => { const v = compute(); if (v && document.hidden) document.title = v; }, 60_000);
      } else {
        document.title = original;
        if (timer) { clearInterval(timer); timer = null; }
      }
    };
    document.addEventListener('visibilitychange', apply);
    return () => {
      document.removeEventListener('visibilitychange', apply);
      if (timer) clearInterval(timer);
      document.title = original;
    };
  }, [flights, airport.iata, pinned]);

  // Record this visit in the same localStorage list the homepage search maintains
  // ('ab_recent', shape identical to AirportSearch's saveRecent).
  //
  // Until this existed the list was written only when someone PICKED an airport in the search
  // box — but the audience this site actually has arrives from a search engine directly onto
  // an airport page, never touching the search. So for the real visitor the return loop was
  // dead at both ends: nothing recorded the airport they came for, and the only reader of the
  // list was the homepage they never see. Checking a board is inherently a repeat activity
  // (meeting someone means looking three to five times in a day); the chips rendered by
  // AirportBottom on every airport page close the loop.
  useEffect(() => {
    if (airport.closed) return;   // a chip inviting a return visit to Tegel helps nobody
    try {
      const KEY = 'ab_recent';
      const entry = { iata: airport.iata, name: displayName || airport.name, city: airport.city, country: airport.country, iso2: airport.iso2 };
      const prev = (JSON.parse(localStorage.getItem(KEY) || '[]') as { iata: string }[]).filter(r => r.iata !== airport.iata);
      localStorage.setItem(KEY, JSON.stringify([entry, ...prev].slice(0, 5)));
    } catch { /* storage unavailable — the loop simply stays open */ }
  }, [airport.iata, airport.name, airport.city, airport.country, airport.iso2, displayName]);
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
      // Точка отсчёта для «сколько рейсов впереди» переезжает вместе с данными, и только
      // с ними — см. объяснение у объявления nowMs. Без этой строки борт, у которого не
      // было серверного снимка (nowMs = 0), после первой же загрузки показал бы 12 строк
      // вместо тридцати: initialRowCount при нулевой точке отсчёта уходит на нижнюю границу.
      setNowMs(ts.getTime());
      // Признак «всё улетело» пересчитывается по ПРИШЕДШИМ строкам и настоящему времени:
      // здесь клиент уже живой, и его часы — единственно верный источник.
      const rows = data.flights || [];
      setAllPast(rows.length > 0 && rows.every((f: Flight) => !f.ts || f.ts * 1000 < Date.now()));
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
    const tick = () => setTime(new Date().toLocaleTimeString(numLocale(locale), {
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
  // Twelve rows is right for a hub with eighty flights and wrong for an airport with thirty:
  // Kazan's header says "33 departures on the board" directly above twelve of them, and the
  // fifteen still to come that evening — 20:55 Novosibirsk through 01:50 Sheremetyevo — sat
  // behind a tap. Measured on the real HTML, the twenty-one extra rows cost 1,205 bytes gzip
  // (+3.3% of 36.6 KB), which is not a reason to hide a whole evening.
  //
  // Rule and rationale live in lib/board-window.ts, so the test runs the same function the
  // page does instead of a copy of it.

  /**
   * Впереди не осталось ни одного рейса — и об этом надо сказать вслух.
   *
   * Сравнение идёт с РЕАЛЬНЫМ временем, а не с `nowMs`: тот намеренно привязан к моменту
   * снимка, чтобы серверная отрисовка и гидратация не расходились, но именно поэтому он
   * никогда не покажет, что снимок протух. Замерено 11.08: на AYT возраст 5 ч (в норме при
   * цели 6 ч), а впереди ноль рейсов из 42 — плотный аэропорт успевает пережить собственное
   * окно внутри цикла прогрева. В показах это 8.8% измеренного спроса, из них 8.6% одна
   * Анталья.
   *
   * `realNow` заводится состоянием и обновляется после монтирования: считать Date.now() прямо
   * в теле рендера значит получить разные значения на сервере и на клиенте и поймать ошибку
   * гидратации на ровном месте.
   */
  const [realNow, setRealNow] = useState<number>(0);
  useEffect(() => {
    setRealNow(Date.now());
    const id = setInterval(() => setRealNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  /**
   * «На этом борту всё уже улетело» — признак, который решает ДВЕ вещи: показывать ли
   * честную плашку и с какого конца резать список.
   *
   * Считался он только от `realNow`, а тот на сервере равен нулю. Следствий было два, и оба
   * измерены на проде 12.08 (18 страниц, из них 11 полностью мёртвых — это 22% трафика):
   *
   *   1. В ОТДАННОЙ разметке плашки не было ни на одной странице. Краулер и любой читатель
   *      без JS получали борт из зелёных «По расписанию» на рейсах семичасовой давности —
   *      то есть сайт молча выдавал протухшее за расписание. Человек видел оговорку только
   *      после гидратации, вместе со сдвигом списка на 74.6 px (на узком экране 94.9 px),
   *      причём вставлялась она примерно на 330 px от верха — в середину первого экрана.
   *   2. Срез списка шёл с ГОЛОВЫ. orderBoard на мёртвом борту отдаёт хвост-50 по
   *      возрастанию, страница брала `slice(0, 40)`, компонент — первые тридцать: два среза
   *      подряд с головы, и человек видел самые СТАРЫЕ строки, а десять–двадцать самых
   *      свежих не доезжали до разметки вовсе. AYT: на экране 07:00–07:55, в нагрузке было
   *      до 08:30, в хранилище — примерно до 09:00.
   *
   * Теперь признак приезжает пропом, посчитанным на сервере от настоящего времени, и живёт
   * состоянием, которое обновляется ВМЕСТЕ С ДАННЫМИ — как и точка отсчёта строк выше.
   *
   * Почему это безопасно при ISR-кэше: для фиксированного набора строк признак МОНОТОНЕН.
   * Сервер посчитал в момент T1, клиент читает в T2 > T1; если всё было в прошлом тогда,
   * оно в прошлом и сейчас. Ошибиться серверный флаг может только в сторону «не показали»,
   * никогда — «показали ложно».
   *
   * Чего здесь делать НЕЛЬЗЯ (обе ошибки я проверял):
   *   - `initialAllPast ?? allPast`: `??` проваливается только на null/undefined, поэтому
   *     булев проп выиграл бы навсегда — `true` прибил бы плашку над только что
   *     обновившимся живым табло, `false` запретил бы её насовсем;
   *   - передавать со страницы `renderedAt={Date.now()}`: страница отдаётся из ISR-кэша
   *     (revalidate 300, stale-while-revalidate 600), запечённое время было бы часами
   *     старее реального. Признак — да, момент — нет.
   */
  const [allPast, setAllPast] = useState<boolean>(!!initialAllPast);

  /** Данные старше норматива своего яруса — подпись должна об этом кричать, а не шептать. */
  const staleHours = lastUpdated ? (realNow || Date.now()) - lastUpdated.getTime() : 0;
  const isStale = staleHours > STALE_AFTER_MS;
  const INITIAL = initialRowCount(flights, nowMs);
  // На мёртвом борту список идёт по возрастанию и самое ценное стоит В КОНЦЕ — это
  // последнее, что улетело. Срез с головы показывал бы самое старое из имеющегося.
  const shown = showAll ? visible : (allPast ? visible.slice(-INITIAL) : visible.slice(0, INITIAL));
  /**
   * С какой стороны списка лежит скрытое — и, значит, где должна стоять кнопка.
   *
   * На мёртвом борту срез идёт с КОНЦА (показываем самое свежее из улетевшего), поэтому
   * скрытые строки лежат в ГОЛОВЕ массива. Кнопка при этом стояла под списком, и нажатие
   * вставляло около двадцати строк ВЫШЕ экрана — примерно 1900 px, больше двух экранов
   * телефона, — а сама кнопка исчезала. Человек нажимал «показать ещё» и оставался на том
   * же месте, не понимая, что случилось. На живом борту всё как было: скрытое в хвосте,
   * кнопка снизу.
   */
  const moreAbove = allPast && !showAll;
  const moreButton = !loading && visible.length > shown.length ? (
          <button className="press" onClick={() => { track(GOALS.boardMore, { shown: INITIAL, total: visible.length }); setShowAll(true); }} style={{
            width: '100%', height: 56, marginTop: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)',
            borderRadius: 18, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>
            {mode === 'departures' ? t('more_departures') : t('more_arrivals')}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 5L6.5 8.5L10 5" stroke="#8A8A8A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
  ) : null;
  useEffect(() => { setShowAll(false); }, [mode, filter, trimSearch]);

  return (
    // 100dvh keeps the footer from jumping up while a real board loads. With no scheduled
    // service nothing will ever fill it, so reserving a screenful leaves a dead gap between
    // the notice and the rest of the page.
    <div style={{ background: C.bg, minHeight: bare ? undefined : '100dvh', paddingBottom: bare ? 16 : 'calc(48px + env(safe-area-inset-bottom))' }}>

      {/* ── Airport header — compact. The identity is one line: code + name + clock. The old
          header spent ~380px (a 76px IATA glyph, an always-open search field, two control
          rows and two meta lines) before the first flight row; on a 812px phone the board the
          visitor searched for showed exactly one row. Premium here means the content leads. */}
      <div style={{ padding: '14px 20px 6px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: C.text }}>{airport.iata}</span>
            {/* Leading space, deliberately.
                The two spans are separated visually by the flex `gap`, which is layout only —
                nothing separates them in the text. So the h1 read as "AERСочи" / "MADMadrid"
                to anything consuming textContent: crawlers, screen readers, and the assistants
                the AEO work is aimed at. A space as the first child of a flex item is stripped
                for layout but kept in textContent, so this changes the read text and not a
                single rendered pixel. */}
            <span style={{ fontSize: 14, fontWeight: 500, color: C.secondary, lineHeight: 1.25, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{' '}{displayName || airport.name}</span>
          </h1>
          <div style={{ textAlign: 'end', flexShrink: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: C.text, lineHeight: 1 }}>{time}</div>
            <div style={{ fontSize: 10, color: C.secondary, marginTop: 3, letterSpacing: '0.03em', opacity: 0.55 }}>{t('local_time')}</div>
          </div>
        </div>

        {lead && (
          <p style={{ fontSize: 13, lineHeight: 1.45, color: C.secondary, margin: '8px 0 0', maxWidth: 620 }}>{lead}</p>
        )}
        {statusLine && (
          <p style={{ fontSize: 12.5, lineHeight: 1.45, color: C.text, margin: '5px 0 0', maxWidth: 620, fontVariantNumeric: 'tabular-nums' }}>{statusLine}</p>
        )}

        {/* One meta line: freshness + row count. These were two separate rows. */}
        {!bare && <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, minHeight: 18 }}>
          <div
            aria-hidden="true"
            className={isLive ? 'live-dot' : ''}
            style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isLive ? C.green : C.gray }}
          />
          {/* The relative label answers "how old"; the machine-readable dateTime and the
              hover/long-press title answer exactly WHEN — the transparency every review pass
              kept asking for, at zero locale-string cost (a formatted datetime is universal). */}
          {/* Пояс АЭРОПОРТА и его подпись. toLocaleString(locale) без опции timeZone
              берёт пояс машины, где выполняется код: на сервере это UTC, и подсказка
              сообщала момент, не совпадающий ни с временем аэропорта, ни с временем
              читателя, причём без всякой пометки, чей это пояс. Всё остальное табло
              показано во времени аэропорта. */}
          <time suppressHydrationWarning dateTime={lastUpdated?.toISOString()} title={lastUpdated ? lastUpdated.toLocaleString(numLocale(locale), { timeZone: airport.tz || 'UTC', timeZoneName: 'short' }) : undefined} style={{ fontSize: 12, color: C.secondary, opacity: 0.85 }}>{updLabel || '—'}</time>
          {isStale && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: '0.02em' }}>
              {' · '}{t('board_stale')}
            </span>
          )}
          {!loading && flights.length > 0 && (
            <span style={{ fontSize: 12, color: C.secondary, opacity: 0.85 }}>
              {' · '}{(() => { const n = flights === initialFlights && boardTotal != null ? boardTotal : flights.length; return mode === 'departures' ? t('departures_on_board', { count: n }) : t('arrivals_on_board', { count: n }); })()}
            </span>
          )}
        </div>}
      </div>

      {/* ── Controls: mode tabs + search icon in ONE row; the input expands in place ── */}
      {!bare && <>
      <div style={{ padding: '6px 16px 10px', maxWidth: 960, margin: '0 auto', display: 'flex', gap: 8 }}>
        {searchOpen || search ? (
          <div style={{ position: 'relative', flex: 1 }}>
            <div aria-hidden="true" style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <IconSearch color={search ? C.secondary : C.dim} />
            </div>
            <input
              ref={searchRef}
              type="search"
              aria-label={t('search_placeholder')}
              autoComplete="off"
              spellCheck={false}
              placeholder={t('search_placeholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onBlur={() => { if (!search) setSearchOpen(false); }}
              style={{
                width: '100%', height: 46, padding: '0 44px', fontSize: 16,
                border: `1px solid ${search ? '#333333' : C.border}`, borderRadius: 13,
                outline: 'none', background: C.surface, color: C.text, WebkitAppearance: 'none',
              }}
            />
            <button
              type="button"
              aria-label={tNav('clear')}
              onClick={() => { setSearch(''); setSearchOpen(false); }}
              style={{
                position: 'absolute', insetInlineEnd: 9, top: '50%', transform: 'translateY(-50%)',
                background: '#2C2C2E', border: 'none', borderRadius: '50%', width: 28, height: 28,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <IconClose color={C.secondary} />
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: 3, gap: 2 }}>
              {(['departures', 'arrivals'] as Mode[]).map(m => {
                const active = mode === m;
                return (
                  <button key={m} type="button" aria-pressed={active} className="press" onClick={() => { haptic(); track(GOALS.boardMode, { mode: m }); setMode(m); setFilter('all'); }} style={{
                    flex: 1, padding: '10px 0', minHeight: 40, fontSize: 14, fontWeight: 600,
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    background: active ? '#1C1C1E' : 'transparent', color: active ? C.text : C.secondary,
                    transition: 'all 0.18s ease', letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 15 }} aria-hidden="true">{m === 'departures' ? '✈' : '🛬'}</span>
                    {m === 'departures' ? t('departures') : t('arrivals')}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label={t('search_placeholder')}
              aria-expanded={searchOpen}
              className="press"
              onClick={() => setSearchOpen(true)}
              style={{
                width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, cursor: 'pointer',
              }}
            >
              <IconSearch color={C.secondary} />
            </button>
          </>
        )}
      </div>

      {/* ── Filter pills ───────────────────────────────────── */}
      <div className="pillrow" style={{ display: 'flex', gap: 7, padding: '0 16px 12px', overflowX: 'auto', maxWidth: 960, margin: '0 auto' }}>
        {(mode === 'arrivals' ? ARR_FILTERS : FILTERS).map(key => {
          const active = filter === key;
          return (
            <button key={key} type="button" aria-pressed={active} className="press" onClick={() => { haptic(); track(GOALS.boardFilter, { filter: key }); setFilter(key); }} style={{
              padding: '7px 13px', minHeight: 34, fontSize: 13, fontWeight: active ? 600 : 400,
              border: active ? 'none' : `1px solid ${C.border}`, borderRadius: 999, cursor: 'pointer',
              background: active ? C.text : 'transparent', color: active ? '#000000' : C.secondary,
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s ease',
            }}>
              {key === 'departed' && mode === 'arrivals' ? t('st_arrived') : t(`filter_${key}`)}
            </button>
          );
        })}
      </div>
      </>}


      {/* ── Flight list ────────────────────────────────────── */}
      <div style={{ padding: '0 16px', maxWidth: 960, margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.gray }}>
            <div style={{ fontSize: 28, letterSpacing: '0.2em' }}>···</div>
          </div>
        )}

        {/* With no scheduled service the notice above already explains the empty board;
            repeating "no flights found" under an error-style icon reads as a failure. */}
        {/* infoOnly keeps this line and drops only the icon and the reserved height: a visitor
            who searched "LBG departures" still has to learn WHY there is no board, and the
            page has no other notice to tell them. Stripping the chrome removed the answer
            along with it, which traded a broken-looking tool for a silent one. */}
        {!loading && !noService && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: infoOnly ? '4px 0 22px' : '60px 0' }}>
            {!infoOnly && <div style={{ fontSize: 32, marginBottom: 12 }}>✈</div>}
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

        {/* Pinned flight card — the landing pad for the return visit. Sticky above the list,
            styled as "yours" (blue ring + label), opens the same sheet on tap. Renders only
            when the pinned flight is present in the CURRENT list, so a stale or cross-mode
            pin silently shows nothing rather than an orphaned card. */}
        {pinnedFlight && (
          <button
            onClick={() => { haptic(); track(GOALS.flightCard, { from: 'pinned' }); setSelected(pinnedFlight); }}
            style={{
              position: 'sticky', top: 8, zIndex: 5, display: 'flex', width: '100%',
              alignItems: 'center', gap: 12, padding: '12px 16px', marginBottom: 10,
              borderRadius: 14, border: `1.5px solid ${C.blue}`, background: '#0B1220',
              color: 'inherit', textAlign: 'start', cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.blue }}>{t('pinned_flight')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 17, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{pinnedFlight.actual || pinnedFlight.scheduled}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{pinnedFlight.flight}</span>
                <span style={{ fontSize: 13, color: C.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pinnedFlight.destination || pinnedFlight.origin || ''}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[pinnedFlight.status] || C.gray, flexShrink: 0 }}>●</span>
          </button>
        )}

        {/* Прямая констатация, когда впереди не осталось ничего.
            Раньше страница молча показывала вчерашнее как сегодняшнее: борт выглядел
            обычным, статусы говорили «Посадка» и «Последний вызов», а все рейсы уже улетели.
            Признак вычислялся внутри lib/flights.ts и наружу не отдавался. */}
        {allPast && (
          <div style={{
            maxWidth: 960, margin: '0 auto 10px', padding: '11px 14px',
            borderRadius: 12, background: 'rgba(255,159,10,.10)',
            border: `1px solid ${C.orange}44`, color: '#E4E4E7',
            fontSize: 14, lineHeight: 1.45,
          }}>
            {t(mode === 'arrivals' ? 'board_all_past_arr' : 'board_all_past_dep', {
              date: lastUpdated
                ? lastUpdated.toLocaleString(numLocale(locale), {
                    // hourCycle задан ЯВНО: без него en/ar/ko/hi печатали «9:00 AM» под строками борта,
                      // где время идёт в 24-часовом виде («09:45»). Соседние форматтеры цикл
                      // задают (:144, :257, :866) — этот был единственным без него.
                      timeZone: airport.tz || 'UTC', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23',
                  })
                : '—',
            })}
          </div>
        )}
        {/* keyed by mode+filter so a swap remounts the block and replays the rise-in */}
        {(() => { if (initialListKey.current !== null && `${mode}:${filter}` !== initialListKey.current) initialListKey.current = null; return null; })()}
        {/* A departure/arrival board IS a list — mark it up as one. Semantic <ul>/<li>
            gives screen readers "list, N items" and is the structure answer engines extract
            most reliably. Visual output is unchanged (globals.css zeroes list defaults). */}
        {moreAbove && moreButton}
        <ul key={`${mode}:${filter}`} className={initialListKey.current === null ? 'rise' : undefined} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {shown.map((f, i) => {
          // Прошедшее считается от РЕАЛЬНОГО времени, а не от времени снимка.
          //
          // `nowMs` привязан к снимку намеренно — иначе серверная отрисовка и гидратация
          // разойдутся. Но из-за этого на протухшем борту ни одна строка не выглядела
          // прошедшей: снимок сделан в 19:00, все рейсы в 19:05–20:15 «ещё впереди», и в
          // час ночи человек видел «Посадка» и «Последний вызов» красным со свечением на
          // рейсах, улетевших шесть часов назад. `realNow` равен нулю до монтирования,
          // поэтому сервер и первый клиентский рендер по-прежнему совпадают.
          const isPast = f.ts ? f.ts * 1000 < (realNow || nowMs) : ['departed', 'arrived'].includes(f.status);
          // Цвет статуса — только у актуальных строк. «Последний вызов» красным со свечением
          // на улетевшем рейсе это не оформление, а указание идти на выход к самолёту,
          // которого нет.
          const color = isPast ? C.past : (STATUS_COLOR[f.status] || C.gray);
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
              return delayM > 0 ? t('delayed_by', { d: fmtDur(delayM, t) }) : t('st_delayed');
            }
            return t(`st_${f.status}`);
          })();
          // By time, not by status. A row the sort placed in the past keeps whatever status the
          // snapshot recorded — SVO had 24 rows in the past still reading 'ontime' — so the
          // status field answers a different question than "has this already happened".
          const place = f.destination || f.origin || '';
          const dm = place.match(/^(.*?)\s*\(([A-Z0-9]{2,4})\)\s*$/);
          const city = dm ? dm[1] : place;
          const code = dm ? dm[2] : '';
          // A name whose LONGEST WORD is wider than the column has no legal place to break, so
          // it snaps mid-word with no hyphen — "Минеральны/е Воды" — which reads as a typo and
          // is the one case hyphens:manual cannot help with. Stepping the type down buys the
          // 11-17% that makes those names fit. Thresholds are calibrated on the 115px column at
          // 375px, where 18px bold Cyrillic runs about 11.5px per character: 11 characters
          // (Калининград, Новосибирск) overflow by a little, 12+ (Екатеринбург) by a lot.
          // Everything shorter — which is most of the network — keeps the full 18px.
          const longestWord = city.split(/[\s‐-―-]+/).reduce((a, w) => Math.max(a, w.length), 0);
          const cityFs = longestWord >= 12 ? 15 : longestWord >= 11 ? 16 : 18;

          return (
            // <li> carries the list semantics; the inner div stays the button, so both roles
            // survive (an li with role="button" would erase the list for assistive tech).
            <li key={i}>
            <div
              role="button"
              tabIndex={0}
              // Время ПЕРВЫМ: видимый порядок чтения строки — «10:40 | SU1269 | Москва | По расписанию»,
              // а у роли button потомки презентационные, поэтому время из дерева доступности
              // выпадало целиком. На всей странице было 35 aria-label и ни одного со временем —
              // то есть незрячий человек слышал номер и город, но не главное.
              // `actual || scheduled` — ровно то, что нарисовано крупно строкой ниже. Сначала я
              // поставил сюда f.scheduled, и программа чтения озвучивала ПЕРЕЧЁРКНУТОЕ время:
              // на проде 150 строк из 352 (42.6%) объявляли не то, что видно, а у 97 из них
              // статус вообще без числа («По расписанию»), то есть показанное время
              // восстановить было нечем. Худший случай — LED: крупно 00:47, в ярлыке 22:10.
              aria-label={`${f.actual || f.scheduled}, ${f.flight}, ${city}, ${label}`}
              className="frow"
              onClick={() => { haptic(); track(GOALS.flightCard, { from: 'row', past: !!f.ts && f.ts * 1000 < Date.now() }); setSelected(f); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic(); track(GOALS.flightCard, { from: 'keyboard' }); setSelected(f); } }}
              style={{ opacity: isPast ? 0.7 : 1 }}
            >
              {/* Status bar */}
              <div style={{ width: 4, background: color, flexShrink: 0 }} />

              {/* Row content */}
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '18px 16px', gap: 12, minWidth: 0 }}>
                {/* Left: time + flight number — fixed type scale (26 / 12) */}
                <div style={{ flexShrink: 0, width: 72 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: f.actual ? (isPast ? C.past : C.orange) : (isPast ? C.past : C.text), lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {f.actual || f.scheduled}
                  </div>
                  {f.actual && (
                    <div style={{ fontSize: 12, color: C.secondary, textDecoration: 'line-through', lineHeight: 1.3, marginTop: 2 }}>{f.scheduled}</div>
                  )}
                  {/* 0.65, а не 0.42: на фоне строки это давало 4.06:1 при норме AA 4.5, а на прошедшей
                      строке, где сверху лежит групповая opacity 0.7, — 2.50:1. Для сравнения город и
                      время в той же строке идут 19.65:1. Номер рейса — ровно то, по чему человек ищет
                      свою строку, и он был самым тусклым текстом на экране. Стало 8.47:1 и 4.68:1. */}
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 5, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{f.flight}</div>
                </div>

                {/* Center: destination — the primary datum on a board, so it gets the room it
                    needs before anything else does.
                    Three lines, not two: the IATA code shares this box, so a name that needed
                    both lines pushed the code onto a third and the clamp then ate it. Measured
                    on /ru/airport/KZN at 375px: "Санкт-Петербург (LED)" rendered as
                    "Санкт-Петер-…" — two of twelve rows had an unreadable destination. Raising
                    the clamp costs height only on the rows that actually need it (12 rows went
                    from 1116px to 1130px, +1.3%), where putting the code on its own line cost
                    ~15px on every row.
                    hyphens: manual, not auto: auto broke short names mid-word for no gain
                    ("Анта-лья", "Мурман-ск"). overflowWrap still rescues a word genuinely wider
                    than the column, just without inventing a hyphen inside a place name. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', lineHeight: 1.2, overflowWrap: 'break-word',
                    hyphens: 'manual' as const, WebkitHyphens: 'manual' as const,
                  }}>
                    <span style={{ fontSize: cityFs, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{city}</span>
                    {code && <bdi style={{ fontSize: 12, fontWeight: 500, color: C.secondary, marginInlineStart: 6, whiteSpace: 'nowrap' }}>({code})</bdi>}
                  </div>
                </div>

                {/* Right: gate + status + chevron */}
                {/* Right: gate + status + chevron. 80px rather than 92: the status label already
                    wraps to two lines in Russian ("ПО РАСПИСАНИЮ"), so the extra 12px bought
                    nothing here and was taken straight out of the destination, which had none
                    to spare. */}
                <div style={{ flexShrink: 0, textAlign: 'end', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ maxWidth: 80 }}>
                    {f.gate && (
                      <div style={{ lineHeight: 1.1, whiteSpace: 'nowrap', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: C.secondary }}>{t('gate')} </span>
                        <bdi style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{f.gate}</bdi>
                      </div>
                    )}
                    <div style={{
                      fontSize: 12, fontWeight: 700, color, letterSpacing: '0.03em', textTransform: 'uppercase',
                      lineHeight: 1.25,
                      textShadow: !isPast && f.status === 'finalcall' ? '0 0 10px rgba(255,69,58,0.15)' : 'none',
                    }}>
                      {label}
                    </div>
                  </div>
                  <svg data-flip width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" className="route-arrow" style={{ flexShrink: 0 }}>
                    <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.22)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            </li>
          );
        })}
        </ul>

        {!moreAbove && moreButton}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────── */}
      <BottomSheet
        isPinned={!!selected && pinned?.flight === selected.flight}
        onTogglePin={() => { if (selected) togglePin(selected.flight); }}
        flight={selected}
        mode={mode}
        onClose={() => setSelected(null)}
        tz={airport.tz || ''}
        locale={locale}
        updLabel={updLabel}
        originIata={airport.iata}
        originName={displayName || airport.name}
      />
    </div>
  );
}
