'use client';
import { flightDelayMinutes, imminentFlightMinutes } from '@/lib/flight-time';
import { numLocale } from '@/lib/i18n';
import { localAirlineName } from '@/lib/airline-ru';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { initialRowCount } from '@/lib/board-window';
import { track, GOALS } from '@/lib/track';
import { DisclosureArrow } from '@/components/DisclosureArrow';
import type { Airport } from '@/lib/airports';

type T = (key: string, values?: Record<string, string | number>) => string;
type Mode = 'departures' | 'arrivals';
type FilterKey = 'all' | 'issues';

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
  /** Плановое время в пути, минуты. См. mapFlight. */
  durationMin?: number;
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

/**
 * Окно, внутри которого снимок считается свежим и повторно не покупается, — то же, что TTL
 * хранилища (FLIGHT_TTL_SEC, 600 с) и STALE_MS в lib/live-budget.ts. Старше — /api/flights
 * докупает свежее для живого читателя, а табло на это время пишет «Обновляем…».
 */
const FRESH_WINDOW_MS = 10 * 60 * 1000;

const C = {
  bg:        'var(--ab-050505)',
  surface:   'var(--glass-soft)',
  border:    'var(--ab-1a1a1a)',
  text:      'var(--ab-ffffff)',
  secondary: 'var(--ab-8a8a8a)',
  dim:       'var(--ab-4a4a4a)',
  green:     'var(--ab-34c759)',
  blue:      'var(--ab-0a84ff)',
  orange:    'var(--ab-ff9f0a)',
  red:       'var(--ab-ff453a)',
  gray:      'var(--ab-3a3a3c)',
  // Past rows get their own tone rather than reusing `gray`. Measured against the composited
  // row background (#080808 under the row's own translucency), the word "Вылетел" in var(--ab-3a3a3c)
  // at opacity 0.45 came out at 1.18:1 — the WCAG floor for body text is 4.5:1, so it was not
  // dim, it was invisible. var(--ab-adadb2) at 0.70 gives 4.69:1. `gray` itself still serves the
  // `scheduled` status on full-opacity rows and must not move.
  past:      'var(--ab-adadb2)',
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

// Согласовано владельцем 18.10.2026 после сравнения на 375 px: оба фильтра видны
// без горизонтальной прокрутки. Все статусы остаются в общем списке; отдельный
// срез объединяет только задержки и отмены. Прежний delayed ошибочно включал
// последний вызов, но пропускал отмены. Для прилётов и вылетов смысл одинаков.
const FILTER_STATUSES: Record<FilterKey, string[]> = {
  all: [],
  issues: ['delayed', 'cancelled'],
};
const FILTERS: FilterKey[] = ['all', 'issues'];

const haptic = (ms = 6) => { try { (navigator as any).vibrate?.(ms); } catch {} };

// Age of the DATA, not of the request. Tail airports are refreshed daily, so this has to
// degrade past minutes gracefully — "1440 min ago" is technically true and useless.
/** Единицы длительности из Intl: «мин», а не неоднозначное «м».
 * Один формат для карточки и строки на всех 12 языках; numLocale сохраняет
 * западные цифры в арабском интерфейсе. Ровные часы не дополняем нулём минут.
 */
// Создание Intl-форматтера на каждую строку особенно дорого на слабом телефоне.
// Пара форматтеров на язык сохраняет прежнее форматирование без этой работы.
const durationFormats = new Map<string, Intl.NumberFormat>();
function fmtDur(mins: number, locale: string): string {
  const hrs = Math.floor(mins / 60), mm = mins % 60;
  const unit = (n: number, u: 'hour' | 'minute') => {
    const key = `${numLocale(locale)}:${u}`;
    let formatter = durationFormats.get(key);
    if (!formatter) { formatter = new Intl.NumberFormat(numLocale(locale), { style: 'unit', unit: u, unitDisplay: 'short' }); durationFormats.set(key, formatter); }
    return formatter.format(n);
  };
  return hrs > 0 ? [unit(hrs, 'hour'), ...(mm > 0 ? [unit(mm, 'minute')] : [])].join(' ') : unit(mm, 'minute');
}

/**
 * Подстрока строки табло: «2 ч 25 мин · Аэрофлот · A320» (25.10.2026, по образцу tablo.online).
 *
 * Только то, что пришло: тип самолёта поставщик отдаёт редко (на 20.10 — 11 строк из 6 180), и
 * пустые места не закрываются прочерками — строка просто короче. Авиакомпания без названия в
 * справочнике (airlineName вернул голый код) не показывается: «FV» рядом с «FV 6809» ничего
 * не добавляет. Тип самолёта — человеческим именем, а не кодом ИКАО: «B738» читают единицы.
 */
const AIRCRAFT: Record<string, string> = {
  A319: 'A319', A320: 'A320', A321: 'A321', A20N: 'A320neo', A21N: 'A321neo', A332: 'A330', A333: 'A330',
  A339: 'A330neo', A359: 'A350', A35K: 'A350', A388: 'A380', B737: 'Boeing 737', B738: 'Boeing 737',
  B739: 'Boeing 737', B38M: 'Boeing 737 MAX', B39M: 'Boeing 737 MAX', B744: 'Boeing 747', B748: 'Boeing 747',
  B752: 'Boeing 757', B763: 'Boeing 767', B772: 'Boeing 777', B77W: 'Boeing 777', B788: 'Boeing 787',
  B789: 'Boeing 787', B78X: 'Boeing 787', SU95: 'Superjet 100', AT72: 'ATR 72', AT76: 'ATR 72',
  E190: 'Embraer 190', E195: 'Embraer 195', CRJ2: 'CRJ200', DH8D: 'Dash 8', MC21: 'МС-21',
};

function rowMeta(f: Flight, locale: string): string[] {
  // Время в пути ПЕРВЫМ: на 375px колонке города ~125px, и многоточие съедает хвост. Название
  // авиакомпании угадывается и по началу («Уральские…»), а обрезанное «1 ч 3…» — бесполезно.
  const parts: string[] = [];
  if (f.durationMin) parts.push(fmtDur(f.durationMin, locale));
  if (f.airline && !/^[A-Z0-9]{2,3}\*?$/.test(f.airline)) parts.push(localAirlineName(f.airline, locale));
  if (f.aircraft) parts.push(AIRCRAFT[f.aircraft] ?? f.aircraft);
  return parts;
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
  flight: Flight, tz: string, mode: Mode, t: T, locale: string
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
      return { label: t('delayed_by', { d: fmtDur(delayM, locale) }), value: flight.actual, sub: t('was', { time: flight.scheduled }), accent: C.orange };
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

/**
 * Лупа. Размер задаётся снаружи, потому что мест два и они разного масштаба:
 * строка поиска (16) и круглая кнопка рядом с переключателем режима (22).
 *
 * Толщина линии СЧИТАЕТСЯ от размера, а не задаётся числом. viewBox здесь 16, и
 * strokeWidth="1.5" при отрисовке в 22px дал бы на экране 2.06px — вдвое толще
 * самолётиков на соседних вкладках (1.6 в клетке 24 при размере 17 — это 1.13px).
 * Формула держит на экране одни и те же полтора пикселя при любом размере.
 */
function IconSearch({ color = 'var(--ab-8a8a8a)', size = 16 }) {
  const stroke = 1.5 * 16 / size;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6.5" cy="6.5" r="4" stroke={color} strokeWidth={stroke}/>
      <path d="M10 10L13.5 13.5" stroke={color} strokeWidth={stroke} strokeLinecap="round"/>
    </svg>
  );
}

function IconClose({ color = 'var(--ab-8a8a8a)' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2L12 12M12 2L2 12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconChevron() {
  return (
    <svg data-flip width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5.5L1 10" stroke="var(--ab-3a3a3c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

function BottomSheet({ flight: selectedFlight, mode, onClose, tz, locale, clockMs, updLabel, originIata, originName, isPinned, onTogglePin }: {
  flight: Flight | null;
  clockMs: number;
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
  // При закрытии нельзя сразу удалять тело: высота шторки схлопывалась с 860
  // до 101 px ещё до translateY, вызывая скачок (CLS 0.72 при CPU ×6).
  // Сохраняем последний рейс на время прежней анимации 340 мс; доступность и
  // блокировка страницы зависят только от selectedFlight. Новое открытие сразу
  // показывает новый рейс и отменяет очистку. Таймер страхует отсутствие transitionend.
  const [lastFlight, setLastFlight] = useState<Flight | null>(selectedFlight);
  const flight = selectedFlight || lastFlight;
  useEffect(() => {
    if (selectedFlight) { setLastFlight(selectedFlight); return; }
    const timer = setTimeout(() => setLastFlight(null), 400);
    return () => clearTimeout(timer);
  }, [selectedFlight]);
  const t = useTranslations('ui');
  const [copied, setCopied] = useState(false);
  /**
   * «Поделиться рейсом» (18.10.2026). В поисковых запросах сайта много «табло прилёта» — это
   * встречающие; самое полезное, что можно им дать, — ссылка, по которой сразу открыт ИХ рейс
   * с живым статусом. Ссылка ведёт на ту же страницу аэропорта с ?flight=…&dir=… (FlightBoard
   * открывает карточку по параметру), а не на /flight/{код}: этот класс страниц намеренно 404,
   * плодить тонкие страницы в индексе — решение, уже принятое в другую сторону.
   * На телефоне — системное меню «Поделиться», на компьютере — копирование ссылки.
   */
  const share = useCallback(async () => {
    if (!flight) return;
    const url = `${location.origin}${location.pathname}?flight=${encodeURIComponent(flight.flight)}&dir=${mode}`;
    const text = `${flight.flight} · ${flight.destination || flight.origin || ''}`.trim();
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); track(GOALS.flightShare, { via: 'share' }); return; }
      catch (e) { if ((e as Error)?.name === 'AbortError') return; /* закрыл меню — не ошибка */ }
    }
    // Копирование: Clipboard API, а где он запрещён (встроенные браузеры приложений, нет
    // разрешения) — старый путь через выделенный textarea. Без запасного пути кнопка молча
    // не делала ничего, и человек не понимал, скопировалась ли ссылка.
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { /* ниже запасной путь */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* совсем некуда — ниже покажем ссылку */ }
    }
    if (!ok) { window.prompt(t('share_flight'), url); track(GOALS.flightShare, { via: 'prompt' }); return; }
    track(GOALS.flightShare, { via: 'copy' });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [flight, mode, t]);
  // «→» не разворачивается алгоритмом двунаправленного письма (Bidi_Mirrored=No)
  const arrow = locale === 'ar' ? '←' : '→';
  const tNav = useTranslations('nav');
  const vis = !!selectedFlight;

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
    if (sheetRef.current) {
      sheetRef.current.scrollTop = 0;
      sheetRef.current.focus({ preventScroll: true });
    }
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
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.({ preventScroll: true }); };
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
    // Тот же тик и округление, что в строке: карточка и табло не расходятся на минуту.
    if (ts) return Math.ceil((ts * 1000 - (clockMs || Date.now())) / 60_000);
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const now = localNow();
    let diff = (h * 60 + m) - (now.h * 60 + now.m);
    if (diff < -300) diff += 1440;
    return diff;
  };

  const L = { fontSize: 11, fontWeight: 600 as const, color: C.secondary, textTransform: 'uppercase' as const, letterSpacing: '0.07em', lineHeight: 1 };
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
    // Касание кнопки закрытия не начинает перетаскивание панели.
    if ((e.target as HTMLElement).closest('button')) return;
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
    // Не даём отложенному кадру снова сдвинуть уже закрытую карточку.
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    settleBack();
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
    const past = mins != null && mins < 0 || !!flight.ts && flight.ts * 1000 < (clockMs || Date.now());
    const delayMinutes = flightDelayMinutes(flight);
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
    type Hero = { label: string; main: string; sub?: string; subStrike?: boolean; icon?: string };
    let hero: Hero;
    if (status === 'departed' || status === 'arrived') {
      // dispTime, not scheduled: with an actual time present the hero showed the SCHEDULED
      // time under the caption "actual departure", while the real actual sat in the grid —
      // and the dedup gate below, comparing against dispTime, let the time card render too.
      hero = { label: t('flight_departed'), main: dispTime, sub: t('actual_dep') };
    } else if (status === 'baggage') {
      hero = { label: t('st_baggage'), main: flight.baggage || dispTime };
    /* Статус больше НЕ повторяется внутри карточки.
     *
     * На рейсе в посадке он стоял трижды: плашка сверху «Посадка», подпись карточки
     * «Посадка идёт» и крупной строкой «Идёт посадка» — буквально одно предложение,
     * переставленное местами. Под ним шла ещё отдельная секция «ВЫЛЕТ 05:50», то есть
     * самое нужное число пряталось четвёртым.
     *
     * Теперь во всех состояниях одинаково: крупно — ВРЕМЯ, подписью сверху — что это за
     * время, снизу — что с ним делать. Слово статуса живёт ровно в одном месте, в
     * цветной плашке над номером рейса. */
    } else if (status === 'cancelled') {
      hero = { label: isDep ? t('departure') : t('arrival'), main: dispTime, sub: t('h_cancel_main'), icon: 'bell' };
    } else if (status === 'boarding' && !past) {
      hero = { label: isDep ? t('departure') : t('arrival'), main: dispTime, sub: t('gate_closes', { d: fmtDur(Math.max(1, mins ?? 0), locale) }), icon: 'plane' };
    } else if (status === 'finalcall' && !past) {
      hero = { label: isDep ? t('departure') : t('arrival'), main: dispTime, sub: t('gate_closes', { d: fmtDur(Math.max(1, mins ?? 0), locale) }), icon: 'bell' };
    } else if (status === 'delayed') {
      // Известная задержка остаётся фактом и после времени рейса. Неизвестная
      // показывается без числа: время до рейса не является длительностью задержки.
      hero = { label: delayMinutes != null ? t('h_delay_label', { dur: fmtDur(delayMinutes, locale) }) : t('st_delayed'), main: dispTime, sub: flight.actual && flight.actual !== flight.scheduled ? t('was', { time: flight.scheduled }) : undefined, subStrike: true, icon: 'clock' };
    } else {
      hero = past
        // Нейтральная карточка: время и подпись «вылет»/«прибытие», без отсчёта и без
        // утверждения, что рейс ушёл. Строку «По расписанию HH:MM» оставляем только
        // когда показанное время от расписания отличается, иначе она дублирует главное.
        ? { label: isDep ? t('departure') : t('arrival'), main: dispTime, sub: flight.actual && flight.actual !== flight.scheduled ? t('on_schedule', { time: flight.scheduled }) : undefined, subStrike: !!flight.actual, icon: 'clock' }
        // Строки «По расписанию HH:MM» здесь больше нет (30.10.2026). Крупно в карточке
        // стоит обратный отсчёт, значит время рейса уходит плиткой ниже — и это ровно то же
        // число: на рейсе без переноса карточка печатала «По расписанию 10:56», а под ней
        // плитка «ВЫЛЕТ 10:56». Плитка остаётся единственным местом времени: она же несёт
        // дату и зачёркнутое расписание, когда время перенесли.
        : { label: isDep ? t('departs_in') : t('arrives_in'), main: mins != null && mins > 0 ? fmtDur(mins, locale) : t('now'), icon: 'clock' };
    }

    // ── Detail grid: only fields with data, never the status (already in hero) ──
    // Время не печатается дважды: отдельная плитка со временем заводится только тогда,
    // когда крупное число в карточке — НЕ оно (так бывает у выдачи багажа). Раньше шторка
    // показывала «ВЫЛЕТ 23:05» два раза подряд, и это читалось как сбой отрисовки.
    type Block = { label: string; value: string; valueColor?: string; strike?: string; sub?: string };

    /* Справа в карточке стоит ВЫХОД — на месте, где раньше была одна декоративная
       иконка и пустота в половину ширины. При посадке это второе по важности число
       после времени, и стоять оно должно рядом с ним.

       Время туда НЕ уезжает (пробовали 28.10.2026, владелец вернул обратно): плиток
       под карточкой обычно несколько — вылет, терминал, в пути, — и вынутое из этого
       ряда время рвало ровную сетку ради экономии одной строки.

       Терминал идёт под выходом мелкой строкой, когда выход есть, и занимает правую
       колонку сам, когда выхода нет (30.10.2026): отдельной плитки он не стоит, а
       половина карточки с одной декоративной иконкой — тем более. Своих плиток у выхода
       и терминала после этого не остаётся вовсе, поэтому прежние две ветки сняты: при
       `gateInHero = !!flight.gate` плитка выхода не могла построиться ни разу. */
    const timeInHero = hero.main === dispTime;
    const heroAside: { label: string; value: string; sub?: string } | null = flight.gate
      // Неразрывный пробел, а не обычный: «Терминал A» в узкой правой колонке ломался
      // на «Терминал» и «A» под ним. Разрыв внутри длинного имени терминала остаётся
      // возможным — там он по словам и читается нормально.
      ? { label: t('gate'), value: flight.gate, sub: flight.terminal ? `${t('terminal')}\u00A0${flight.terminal}` : undefined }
      : flight.terminal
        ? { label: t('terminal'), value: flight.terminal }
        : null;
    /* Номер выхода НЕ переносится (30.10.2026). «A12-B14» вставал как «A12-» / «B14»:
       дефис — законная точка переноса, а `overflow-wrap: anywhere` вдобавок разрешал
       колонке сжаться уже номера. Вместо переноса уменьшается кегль — номер остаётся
       одним куском, как он написан на табличке в терминале. Ступени подобраны по самым
       длинным значениям поставщика: «A12-B14» (7) и «12» (2). */
    const asideSize = !heroAside ? 24
      : heroAside.value.length > 8 ? 16
      : heroAside.value.length > 6 ? 19
      : heroAside.value.length > 4 ? 21 : 24;

    /* Плитки идут строго по две в ряд (30.10.2026, решение владельца). Раньше ряд строился
       `auto-fit, minmax(104px, 1fr)` и на 375 px давал то три колонки, то одну: у вылетевшего
       рейса единственная плитка «В пути» растягивалась во всю ширину — полоса с одним числом
       посреди пустоты.

       Сами по себе две колонки ряд не заполняют: при нечётном числе плиток последняя осталась
       бы половинкой с дырой справа. Отсюда две поправки. Первая — дата. Когда время уже стоит
       крупно в карточке, дата лежала там же мелкой строкой под ним; теперь она выходит в плитку
       ровно тогда, когда этим достраивает ряд до пары, и остаётся в карточке, когда ряд и без
       неё чётный. Вторая — последняя плитка нечётного набора занимает обе колонки. Дыр в сетке
       не остаётся ни при одном наборе полей. */
    const extras: Block[] = [];
    if (flight.baggage && status !== 'baggage') extras.push({ label: t('baggage'), value: flight.baggage, valueColor: C.green });
    if (flight.durationMin) extras.push({ label: t('flight_duration'), value: fmtDur(flight.durationMin, locale) });
    if (flight.aircraft) extras.push({ label: t('aircraft_type'), value: AIRCRAFT[flight.aircraft] ?? flight.aircraft });

    const dateAsTile = timeInHero && extras.length % 2 === 1;
    const blocks: Block[] = [];
    if (!timeInHero) blocks.push({
      label: isDep ? t('departure') : t('arrival'), value: dispTime,
      valueColor: flight.actual ? C.orange : C.text, strike: flight.actual ? flight.scheduled : undefined, sub: dateStr,
    });
    if (dateAsTile) blocks.push({ label: t('flight_date'), value: dateStr });
    blocks.push(...extras);
    const lastSpansRow = blocks.length % 2 === 1;

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

    const heroMainSize = hero.main.length > 8 ? 25 : hero.main.length > 5 ? 29 : 34;

    body = (
      <div style={{ padding: '2px 18px calc(16px + env(safe-area-inset-bottom))' }}>
        {/* Вся карточка — одна сетка в две колонки. Во всю ширину остаются только блоки,
            которым половины не хватает физически: шапка с крупным номером рейса, карточка
            статуса (у неё свои две колонки внутри), полоса маршрута, подсказка и отметка
            свежести. Плитки и кнопки встают по две в ряд. Расстояния между блоками держит
            один gap, а не marginTop у каждого: прежние 14px у одних блоков и 10 у других
            давали разные промежутки на соседних строках одной карточки. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>

        {/* Шапка. Статус стоит В ОДНОЙ СТРОКЕ с номером рейса, справа от него (30.10.2026,
            решение владельца): своей строкой выше он занимал сорок пикселей ради одного
            слова. Перенос строки разрешён — на 320px самые длинные ярлыки («ПОСЛЕДНИЙ
            ВЫЗОВ») рядом с номером не помещаются и опускаются под него целиком; обрезать
            их многоточием нельзя, статус — единственное место, где слово состояния вообще
            печатается.

            Место крестика сохранено справа. Сама кнопка живёт в sticky-панели: внутри
            прокручиваемого body она уходила за экран и мешала закрыть карточку. Резерв
            справа не даёт строке заехать под неё. */}
        <div style={{ gridColumn: '1 / -1', position: 'relative', minHeight: 88, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, width: '100%', minHeight: 40, paddingInlineEnd: 54, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 800, letterSpacing: '-0.04em', color: C.text, lineHeight: 1, wordBreak: 'break-word', minWidth: 0 }}>{flight.flight}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: `color-mix(in srgb, ${color} 12.156862745098039%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 34.90196078431372%, transparent)`, minWidth: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{statusLabel}</span>
            </div>
          </div>
          {/* Отступ справа 98 — ширина пары круглых кнопок под крестиком (две по 40 и
              зазоры). Без него длинное имя города заезжало бы под них. */}
          <div style={{ minWidth: 0, width: '100%', paddingInlineEnd: 98, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 'clamp(15px, 4vw, 18px)', color: 'var(--ab-a1a1a1)', lineHeight: 1.2 }}>{flight.destination || flight.origin}</div>
            {/* То же имя, что в строке табло и поиске: карточка не должна внезапно
                менять «Уральские авиалинии» на Ural Airlines после нажатия. */}
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2 }}>{localAirlineName(flight.airline || '', locale)}</div>
          </div>

          {/* Закрепить и поделиться — круглые кнопки под крестиком (30.10.2026, решение
              владельца). Прежде это были две подписанные пилюли во всю ширину карточки:
              ряд в 52px ради двух действий, которые человек совершает один раз за визит,
              стоял между данными и маршрутом и отодвигал их вниз.

              Кнопки лежат в ШАПКЕ, а не в липкой полосе с крестиком: та висит над
              содержимым всё время прокрутки, и два лишних кружка в ней перекрывали бы
              карточку статуса и плитки. Крестику это положено — закрыть шторку нужно из
              любого места, — а этим двум нет.

              Подписи остались в aria-label и title: слова не потеряны, их просто больше
              не рисуют. Внешний вид взят у крестика ровно — то же стекло, та же кромка,
              тот же размер: три кнопки стоят в одном углу и обязаны выглядеть роднёй.

              The one persistent action this sheet has: watching a flight means coming back
              three to five times; before this button every return started with re-finding
              the row in an 80-row list. Pin state lives in localStorage (ab_pinned), scoped
              to today — see the pinned card in FlightBoard. */}
          <div style={{ position: 'absolute', top: 48, insetInlineEnd: 2, display: 'flex', gap: 8 }}>
            {/* Класса press у этих двух кнопок НЕТ, и это намеренно (30.10.2026). Он даёт
                `transform: scale(0.96)` на :active — на круглой кнопке в 40px это читается
                как «кнопка сжалась», а не как нажатие. Крестик рядом его тоже не носит:
                три кнопки стоят в одном углу и должны вести себя одинаково. Отклик у них
                свой и более внятный, чем сжатие: отдача (haptic), а дальше сразу новое
                состояние — синяя заливка у закрепления, галочка у ссылки. */}
            <button
              type="button"
              onClick={() => { haptic(); onTogglePin(); }}
              aria-pressed={isPinned}
              aria-label={isPinned ? t('unpin_flight') : t('pin_flight')}
              title={isPinned ? t('unpin_flight') : t('pin_flight')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, padding: 0, borderRadius: 999, border: 'none', cursor: 'pointer',
                touchAction: 'manipulation',
                background: isPinned ? 'rgba(10,132,255,0.16)' : 'var(--glass-soft)',
                boxShadow: isPinned ? 'var(--glass-rim), 0 0 0 1px rgba(10,132,255,0.45)' : 'var(--glass-rim)',
                color: isPinned ? C.blue : C.text,
              }}>
              {/* Канцелярская кнопка одним замкнутым контуром: шляпка, узкий корпус,
                  опорная юбка, игла отдельной линией. Прежний глиф был из трёх кусков —
                  отдельная палочка шляпки висела над трапецией и не стыковалась с ней,
                  отчего на 18px кнопка выглядела собранной из обрезков. Скруглять углы
                  руками не нужно: контур обводится с strokeLinejoin="round".
                  Сердце занято избранными аэропортами в шапке сайта, флажок читается
                  как «пожаловаться», поэтому именно кнопка. */}
              {/* Кегль 20, а не 18 как у крестика: тот рисует крест во всю клетку, а кнопка
                  узкая и высокая и занимает чуть больше половины ширины — при равном размере
                  она выглядела бы вдвое мельче соседей. */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7.8 3.2h8.4v3.2h-2.6v5l4 3H6.4l4-3v-5H7.8z" fill={isPinned ? 'currentColor' : 'none'} />
                <path d="M12 14.4v6.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { haptic(); share(); }}
              aria-label={copied ? t('link_copied') : t('share_flight')}
              title={copied ? t('link_copied') : t('share_flight')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, padding: 0, borderRadius: 999, border: 'none', cursor: 'pointer',
                touchAction: 'manipulation',
                background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)',
                color: copied ? C.green : C.text,
              }}>
              {/* Та же стрелка пересылки, что на кнопке репоста в шапке сайта: один знак
                  на оба места. После копирования — галочка: подписи, которая раньше
                  менялась на «Ссылка скопирована», на кнопке больше нет. */}
              {copied ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5 9.5 17 19 7.5" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14.5 6.5 20 11.5l-5.5 5" />
                  <path d="M20 11.5H10.8C7 11.5 4 14.6 4 18.4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div style={{ gridColumn: '1 / -1', height: 1, background: 'rgba(var(--ab-ink),0.08)', margin: '1px 0' }} />

        {/* Hero card */}
        <div style={{ gridColumn: '1 / -1', background: `color-mix(in srgb, ${color} 10.196078431372548%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25.098039215686274%, transparent)`, borderRadius: 'var(--r-card)', padding: '11px 14px 13px' }}>
          {/* Правая колонка шире своего содержимого не становится: `auto` отдаёт весь запас
              левой, иначе длинный отсчёт («1 ч 30 мин» кеглем 25) упирался бы в номер
              выхода на 320px. Потолка ширины у правой колонки нет: при нерастяжимом
              номере выхода он только обрезал бы его («A12-B14» вылезал за свою
              половину), а сжимается колонка и так — по самому длинному слову подписи. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...L, marginBottom: 6 }}>{hero.label}</div>
              <div data-flight-detail-value style={{ fontSize: heroMainSize, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{hero.main}</div>
              {hero.sub && <div style={{ fontSize: 13, color: C.secondary, marginTop: 5, textDecoration: hero.subStrike ? 'line-through' : 'none' }}>{hero.sub}</div>}
              {timeInHero && !dateAsTile && <div style={{ fontSize: 11, color: C.secondary, opacity: 0.75, marginTop: 4 }}>{dateStr}</div>}
            </div>
            {heroAside ? (
              <div style={{ textAlign: 'end', minWidth: 0 }}>
                <div style={{ ...L, marginBottom: 6 }}>{heroAside.label}</div>
                <bdi data-flight-detail-value style={{ display: 'block', fontSize: asideSize, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, color: C.text, whiteSpace: 'nowrap' }}>{heroAside.value}</bdi>
                {heroAside.sub && <div style={{ fontSize: 11, color: C.secondary, marginTop: 5 }}>{heroAside.sub}</div>}
              </div>
            ) : hero.icon ? <Icon name={hero.icon} /> : null}
          </div>
        </div>

        {/* Плитки. Значение начинается сразу под подписью с одинаковым отступом:
            space-between прижимал весь блок значения к низу, и дата под временем
            поднимала время выше выхода и терминала (снимок владельца, 18.10.2026).
            Свободное место остаётся снизу, чтобы необязательная дата не двигала цифры.
            Длинные значения переносятся, а не обрезаются многоточием: на 320px
            «1 ч 30 мин» превращалось в «1 ч 3…». Проверка — ops/metrika-growth-20261029/
            mobile-check.html на 375 и 320px с открытой карточкой. */}
        {blocks.map((b, i) => (
          <div key={i} style={{ gridColumn: lastSpansRow && i === blocks.length - 1 ? '1 / -1' : undefined, background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 'var(--r-card)', padding: '10px 12px', minHeight: 58, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={L}>{b.label}</div>
            <div>
              <div data-flight-detail-value style={{ fontSize: 18, fontWeight: 700, color: b.valueColor || C.text, lineHeight: 1.05, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{b.value}</div>
              {b.strike && <div style={{ fontSize: 11, color: C.secondary, textDecoration: 'line-through', marginTop: 2 }}>{b.strike}</div>}
              {b.sub && <div style={{ fontSize: 11, color: 'var(--ab-6a6a6a)', marginTop: 3 }}>{b.sub}</div>}
            </div>
          </div>
        ))}

        {/* Время, выход и терминал раньше действий — согласовано владельцем 19.10.2026.
            Раньше закрепление и маршрут отодвигали эти данные за первый экран телефона.
            С 30.10.2026 действий в потоке карточки нет вовсе: закрепить и поделиться —
            круглые кнопки в шапке, под крестиком (см. там же).

            Route strip — where from, where to. The sheet is shareable context on its own.
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
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1 }}>{routeFrom.code}</div>
                <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{routeFrom.name}</div>
              </div>
              <svg data-flip width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="route-arrow" style={{ flexShrink: 0, opacity: 0.45 }}><path d="M3 12h16m0 0-6-6m6 6-6 6" stroke="var(--ab-ffffff)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'end' }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1 }}>{routeTo.code}</div>
                <div style={{ fontSize: 11.5, color: C.secondary, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{routeTo.name}</div>
              </div>
            </>
          );
          const box = { gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)', borderRadius: 'var(--r-card)' } as const;
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
                <path d="M1 1L7 7L1 13" stroke="rgba(var(--ab-ink),0.28)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          );
        })()}

        {/* Age of the data — the sheet inherits the board's honest freshness label. */}
        {updLabel && <div style={{ gridColumn: '1 / -1', fontSize: 11, color: C.secondary, opacity: 0.75, textAlign: 'end' }}>{updLabel}</div>}

        {/* Info notice */}
        {notice && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 9, alignItems: 'flex-start', padding: '10px 13px', background: `color-mix(in srgb, ${color} 5.098039215686274%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25.098039215686274%, transparent)`, borderRadius: 'var(--r-card)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="9" cy="9" r="8" stroke={color} strokeWidth="1.5" /><path d="M9 5.5v.5M9 8v4" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--ab-c4c4c4)' }}>{notice}</span>
          </div>
        )}

        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--sheet-scrim)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        opacity: vis ? 1 : 0, pointerEvents: vis ? 'auto' : 'none', transition: 'opacity 0.28s ease',
      }} />
      <div
        ref={sheetRef}
        onTransitionEnd={e => {
          if (e.target === e.currentTarget && e.propertyName === 'transform' && !vis) setLastFlight(null);
        }}
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
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          outline: 'none',
          /* Плотное стекло: поверх карточки идёт текст, и на пёстрых обоях
             лёгкая заливка его не держит. Шва сверху нет — скругление и тень
             и так отделяют панель от страницы. */
          /* Плотная заливка снята (решение владельца 28.10.2026): шторка была почти
             непрозрачной — 0.94 в тёмной теме и 0.93 в светлой — и выглядела сплошной
             панелью, а не стеклом. Теперь обычное стекло 0.80/0.86: обои под ней
             просматриваются, размытие остаётся, и текст по-прежнему лежит на своей
             подложке, а не прямо на узоре. */
          background: 'var(--glass)', WebkitBackdropFilter: 'var(--blur)', backdropFilter: 'var(--blur)',
          boxShadow: 'var(--glass-rim), var(--glass-lift)',
          borderRadius: '28px 28px 0 0',
          // Drag offsets are written straight to el.style by the rAF handler; the
          // declared transform only encodes open/closed.
          transform: vis ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.34s cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: vis ? 'transform' : undefined,
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          maxHeight: '90dvh', overflowY: 'auto',
          maxWidth: 640, margin: '0 auto',
        }}>
        {/* На телефоне прежняя ручка прокручивалась за экран: на 375×600 её верх
            после прокрутки был −274px. Sticky-панель остаётся доступна при прокрутке карточки,
            а dvh выше учитывает панели браузера. Явное «Закрыть» не требует знать жест.
            Перетаскивание ограничено панелью: касание контента теперь только прокручивает
            текст и не конкурирует с нативной прокруткой iOS/Android. */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={() => {
            dragStart.current = null; dragY.current = 0;
            if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
            settleBack();
          }}
          /* Полоса перетаскивания БЕЗ своей заливки и без своего размытия. Она лежит
             поверх шторки, и второй слой стекла поверх первого давал светлую полосу
             вдоль верха: два раза по 0.86 — это уже не 0.86. Шторка под ней своя
             заливка и так, а полосе нужна только область для жеста. */
          style={{ position: 'sticky', top: 0, zIndex: 2,
            height: 14, touchAction: 'none' }}
        >
          {/* Кнопка остаётся в прежней позиции при открытии, но больше не уезжает вместе
              с содержимым. Sticky-панель не находится внутри короткого заголовка: поэтому
              закрепление действует на всю высоту прокрутки, включая длинные переводы. */}
            <button type="button" onClick={onClose} aria-label={tNav('close')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'absolute', top: 16, insetInlineEnd: 20, width: 40, height: 40, padding: 0, color: C.text, touchAction: 'manipulation',
                borderRadius: 999, background: 'var(--glass-soft)', boxShadow: 'var(--glass-rim)',
                border: 'none', cursor: 'pointer' }}>
              {/* Вектор вместо знака «×»: у шрифтового крестика нет ни толщины,
                  ни выравнивания — он висел выше базовой линии. */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
                <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" />
              </svg>
            </button>
        </div>
        {body}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlightBoard({ airport, locale, defaultMode = 'departures', displayName, cityName, headingNote, initialFlights, initialFetchedAt, boardTotal, lead, statusLine = null, noService = false, pendingNote = null, infoOnly = false, initialAllPast = false, aboutTitle, aboutExtra = null }: {
  airport: Airport;
  locale: string;
  defaultMode?: Mode;
  displayName?: string;
  /** Город на языке страницы: в каталоге он латиницей, а чип «недавних» печатает его как есть. */
  cityName?: string;
  /**
   * Хвост к заголовку первого уровня: «UFA Уфа · Прилёты».
   *
   * Ставит его ТОЛЬКО выделенная подстраница /arrivals, и передаётся сюда именно признак
   * страницы, а не текущий режим табло. Разница существенная: `mode` — состояние клиента,
   * переключатель «Вылеты / Прилёты» меняет его без перехода, и заголовок первого уровня
   * прыгал бы под рукой у читателя.
   *
   * Зачем вообще. У родителя и у его /arrivals был ОДИН h1 — «UFA Уфа», — при том что
   * заголовки вкладок различаются и говорят разное. Класс запросов «прилёт» даёт лучший CTR
   * на сайте (3.0% против 1.5% у общего «табло»), а страница, которая на него отвечает, в
   * своём единственном заголовке первого уровня о прилётах не упоминала. Слово берётся из
   * каталога (nav.arrivals), новых строк не заводится ни одной.
   */
  headingNote?: string;
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
   *  skeleton — direction tabs plus status filters
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
  /**
   * Абзац «Об аэропорте» и его заголовок.
   *
   * Жил отдельным разделом ПОД табло, справочной и расписанием — то есть примерно на
   * третьем экране. Это справка о том, что это за аэропорт вообще, и читают её до
   * рейсов, а не после; владелец попросил поднять её в шапку (28.10.2026).
   *
   * Текст и заголовок второго уровня остаются в серверном HTML: details ничего из
   * разметки не удаляет, меняется только место на экране.
   */
  aboutTitle?: string;
  /**
   * Что ещё показывать под той же кнопкой: справочная и «Частые вопросы».
   *
   * Приходит готовой разметкой с сервера (AirportBottom part="reference") — табло
   * клиентское, и считать там состав FAQ нечем и незачем. Для React это обычный
   * ReactNode: серверные узлы спокойно передаются клиентскому компоненту пропом.
   */
  aboutExtra?: ReactNode;
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
  // Только два направления текущего табло. Повторный переход показывает уже
  // прочитанный снимок сразу, затем обычный API проверяет его свежесть. Кэш
  // браузера не заменяет правило Airlabs >=10мин и не хранится между сессиями.
  type BoardSnapshot = { rows: Flight[]; fetchedAt: number; allPast: boolean };
  const boardCache = useRef<Map<string, BoardSnapshot> | null>(null);
  if (!boardCache.current) boardCache.current = new Map(initialFlights?.length ? [[
    `${airport.iata}:${locale}:${defaultMode}`,
    { rows: initialFlights, fetchedAt: initialFetchedAt || 0, allPast: initialAllPast },
  ]] : []);
  const requestRef = useRef<AbortController | null>(null);

  // Starts false so the SERVER never renders a spinner. It used to start as !hasInitial, which
  // meant every un-warmed airport served crawlers three animated dots and nothing else — and the
  // honest empty-state branch below was gated on !loading, so it was unreachable in SSR by
  // construction. Real users are unaffected: the mount effect sets loading before it fetches.
  const [loading, setLoading]     = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
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
  const searchControlsRef = useRef<HTMLDivElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus({ preventScroll: true });
    // Click, а не pointerdown: сначала выполняется выбор видимой строки рейса,
    // затем сбрасывается фильтр. Иначе исчезнувшая под пальцем строка теряла click.
    const outside = (event: MouseEvent) => {
      if (searchControlsRef.current?.contains(event.target as Node)) return;
      searchRef.current?.blur();
      setSearchOpen(false);
      setSearch('');
    };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, [searchOpen]);

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
  //
  // 🔴 19.10.2026: «скрытая вкладка» оказалась недостаточным заслоном. Яндекс Вебмастер записал
  // для /ru/airport/BCN заголовок «19:19 UX6073 · BCN», для JNB/arrivals — «10:15 FA370 · JNB»:
  // его рендерер исполняет JS в состоянии hidden и ловит visibilitychange, и подменённый
  // заголовок уходит в индекс вместо SEO-заголовка (в диагностике — 394 дубля title). Теперь
  // подмена включается только после ЖИВОГО взаимодействия со страницей — касание, клик, клавиша,
  // прокрутка. Робот так не делает; человек, который смотрит табло и уходит в другую вкладку, —
  // почти всегда да.
  useEffect(() => {
    const original = document.title;
    // При переходе AYT→CEK Next уже ставит новый title, а cleanup старого борта
    // раньше безусловно возвращал AYT. Восстанавливаем только собственную
    // временную подпись рейса; чужой новый SEO-title никогда не перезаписываем.
    let ownedTitle: string | null = null;
    const restoreTitle = () => {
      if (ownedTitle !== null && document.title === ownedTitle) document.title = original;
      ownedTitle = null;
    };
    let human = false;
    const markHuman = () => { human = true; };
    const HUMAN_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;
    HUMAN_EVENTS.forEach((e) => window.addEventListener(e, markHuman, { passive: true, once: true }));
    const compute = () => {
      // The pinned flight, if any, is what this person actually cares about; the next
      // non-terminal flight is the fallback for everyone else.
      const pin = pinned ? flights.find(f => f.flight === pinned.flight) : null;
      const next = pin ?? flights.find(f => !['departed', 'arrived', 'baggage', 'cancelled'].includes(f.status));
      return next ? `${next.actual || next.scheduled} ${next.flight} · ${airport.iata}` : null;
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    const apply = () => {
      if (document.hidden && human) {
        const t2 = compute();
        if (t2) { ownedTitle = t2; document.title = t2; }
        if (!timer) timer = setInterval(() => { const v = compute(); if (v && document.hidden) { ownedTitle = v; document.title = v; } }, 60_000);
      } else {
        restoreTitle();
        if (timer) { clearInterval(timer); timer = null; }
      }
    };
    document.addEventListener('visibilitychange', apply);
    return () => {
      HUMAN_EVENTS.forEach((e) => window.removeEventListener(e, markHuman));
      document.removeEventListener('visibilitychange', apply);
      if (timer) clearInterval(timer);
      restoreTitle();
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
      // Город — на языке страницы. Поиск сохраняет в тот же список локализованный
      // (API отдаёт localizeResults), а отсюда уезжал сырой каталожный: на русской
      // странице «недавние» подписывались «SVX Yekaterinburg» рядом с «KZN Казань».
      const entry = { iata: airport.iata, name: displayName || airport.name, city: cityName || airport.city, country: airport.country, iso2: airport.iso2 };
      const prev = (JSON.parse(localStorage.getItem(KEY) || '[]') as { iata: string }[]).filter(r => r.iata !== airport.iata);
      localStorage.setItem(KEY, JSON.stringify([entry, ...prev].slice(0, 5)));
    } catch { /* storage unavailable — the loop simply stays open */ }
  }, [airport.iata, airport.name, airport.city, airport.country, airport.iso2, displayName, cityName]);
  // Gate for the list "rise" animation: never on the initial (SSR/LCP) paint —
  // only once the user actually changes mode/filter. Key-based (not effect-based)
  // so a data refresh on the initial combination can't retrigger it.
  const initialListKey = useRef<string | null>(`${defaultMode}:all`);

  const fetchFlights = useCallback(async () => {
    // Медленный ответ вылетов раньше мог приехать после прилётов и подменить
    // список. Отменяем предыдущий транспорт и проверяем signal даже после json:
    // не каждый transport успевает остановиться от abort. Старый finally также
    // не должен выключать загрузку нового направления.
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/flights/${airport.iata}?direction=${mode}&locale=${locale}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Board HTTP ${res.status}`);
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.flights)) throw new Error('Invalid board response');
      setFlights(data.flights);
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
      const past = rows.length > 0 && rows.every((f: Flight) => !f.ts || f.ts * 1000 < Date.now());
      setAllPast(past);
      boardCache.current!.set(`${airport.iata}:${locale}:${mode}`, { rows, fetchedAt: ts.getTime(), allPast: past });
      if (boardCache.current!.size > 2) boardCache.current!.delete(boardCache.current!.keys().next().value!);
      setUpdLabel(relTime(ts, t));
      setIsLive(Date.now() - ts.getTime() < 90_000);
    } catch {
      // Сетевой сбой не означает «рейсов нет». Сохраняем правильный снимок;
      // без него показываем существующую локализованную подпись недоступности.
      // «Обновляем…» после завершившейся ошибки оставлять также нельзя.
      if (!controller.signal.aborted) {
        setLoadFailed(true);
        const cached = boardCache.current!.get(`${airport.iata}:${locale}:${mode}`);
        setUpdLabel(cached?.fetchedAt ? relTime(new Date(cached.fetchedAt), t) : '');
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [airport.iata, mode, locale, t]);
  useEffect(() => () => { requestRef.current?.abort(); }, [fetchFlights]);

  const didInit = useRef(false);
  useEffect(() => {
    // First mount with SSR flights → refresh silently (keep the server rows visible).
    if (!didInit.current && hasInitial) {
      didInit.current = true;
      /**
       * Читатель не должен видеть «обновлено 3 ч назад», если прямо сейчас ему докупают свежее
       * (требование владельца 18.10.2026: старше десяти минут — обновить при заходе). Страница
       * приходит из 30-секундного кэша с возрастом снимка хранилища, а /api/flights за
       * секунду-две приносит новый. Пока он едет, вместо старой цифры — «Обновляем…»; ответ
       * ставит честный возраст того, что пришло (в том числе старый, если покупка отказана).
       *
       * Только на клиенте и только после гидрации: серверный HTML по-прежнему называет
       * настоящий возраст данных — его читают роботы, и обещание «возраст указан» должно
       * оставаться правдой там.
       */
      if (initialFetchedAt && Date.now() - initialFetchedAt >= FRESH_WINDOW_MS) setUpdLabel(t('updating_now'));
      fetchFlights();
      return;
    }
    didInit.current = true;
    setLoading(!boardCache.current!.has(`${airport.iata}:${locale}:${mode}`));
    fetchFlights();
  }, [fetchFlights]);

  /**
   * Ссылка «Поделиться рейсом» (?flight=SU1234&dir=arrivals) открывает карточку этого рейса.
   * Параметр читается один раз после монтирования — серверный HTML от него не зависит, и кэш
   * страницы (Next 30 с, nginx 30 с) остаётся общим. Если рейса в табло нет (улетел, другой
   * день), страница просто открывается как обычно.
   */
  const deepLink = useRef<{ flight: string; dir: Mode } | null>(null);
  useEffect(() => {
    try {
      const q = new URLSearchParams(location.search);
      const fl = q.get('flight');
      if (!fl) return;
      const dir: Mode = q.get('dir') === 'arrivals' ? 'arrivals' : 'departures';
      deepLink.current = { flight: fl.toUpperCase(), dir };
      // На следующем тике, а не прямо в эффекте: переключение в момент гидрации обновляло
      // aria-pressed, но не стиль вкладки — подсвечивались «Вылеты» при открытых прилётах.
      if (dir !== mode) setTimeout(() => switchMode(dir), 0);
    } catch { /* без параметра — обычная страница */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const d = deepLink.current;
    if (!d || d.dir !== mode) return;
    const f = flights.find((x) => x.flight.toUpperCase() === d.flight);
    if (f) { deepLink.current = null; setSelected(f); }
  }, [flights, mode]);

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

  // Часы показывают только минуты. Раньше каждую секунду создавался новый Intl
  // и вызывался setState, хотя текст не менялся. Тикаем на границе минуты,
  // в скрытой вкладке останавливаемся; при возвращении сразу сверяем часы.
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(numLocale(locale), {
      timeZone: airport.tz || undefined, hour: '2-digit', minute: '2-digit', hour12: false,
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      setTime(formatter.format(new Date()));
      timer = setTimeout(tick, 60_000 - Date.now() % 60_000);
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', tick); };
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
  const visible = useMemo(() => flights.filter(f => {
    if (filter !== 'all' && !FILTER_STATUSES[filter].includes(f.status)) return false;
    if (!trimSearch) return true;
    const q = trimSearch.toLowerCase();
    // Номер рейса набирают как «SU 112», «su-112», «SU112» — пробелы и дефисы не в счёт.
    const qCode = q.replace(/[\s-]+/g, '');
    return f.flight.toLowerCase().includes(q)
      || (qCode.length > 1 && f.flight.toLowerCase().replace(/[\s-]+/g, '').includes(qCode))
      || (f.destination || f.origin || '').toLowerCase().includes(q)
      || (f.airline || '').toLowerCase().includes(q)
      // Строка уже показывает русское имя, но фильтр раньше проверял только
      // английское от поставщика. Сохраняем оба варианта, без загрузки словарей
      // или запросов. Регрессия: «Уральские» и «Ural Airlines» находят один рейс.
      || localAirlineName(f.airline || '', locale).toLowerCase().includes(q);
  }), [flights, filter, trimSearch, locale]);
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
  const shown = useMemo(() => {
    const base = showAll ? visible : (allPast ? visible.slice(-INITIAL) : visible.slice(0, INITIAL));
    // Закреплённый рейс поднимается наверх уже ПОСЛЕ среза, а не сортировкой `visible`.
    // Сортировать сам список нельзя: на мёртвом борту срез идёт с КОНЦА (строкой выше), и
    // закреплённое утро в него не попало бы вовсе — а это ровно то, за чем человек вернулся.
    // Поднимается только то, что прошло фильтр и поиск: иначе на запрос «SU» сверху висела
    // бы строка, которой в выдаче нет. Своё место в хронологии строка при этом освобождает —
    // иначе один рейс был бы на борту дважды.
    if (!pinnedFlight || !visible.includes(pinnedFlight)) return base;
    return [pinnedFlight, ...base.filter(f => f !== pinnedFlight)];
  }, [showAll, visible, allPast, INITIAL, pinnedFlight]);
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
  // Открытие/закрытие карточки и раскрытие лупы не меняют рейсы. Раньше эти
  // действия заново строили все строки и форматировали длительности. Сохраняем
  // JSX строк до изменения данных, фильтра, языка или минутного отсчёта.
  const flightRows = useMemo(() => shown.map((f, i) => {
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
          const countdown = imminentFlightMinutes(f, realNow);
          const label = (() => {
            if (f.status === 'delayed') {
              const delay = flightDelayMinutes(f);
              return delay != null ? t('delayed_by', { d: fmtDur(delay, locale) }) : t('st_delayed');
            }
            // Заменяем спокойную подпись, не добавляя ещё одну строку на телефоне.
            // Вылет/прилёт уже задан вкладкой; полная формулировка остаётся в карточке.
            if (countdown != null) return t('in_duration', { d: fmtDur(countdown, locale) });
            return t(`st_${f.status}`);
          })();
          // By time, not by status. A row the sort placed in the past keeps whatever status the
          // snapshot recorded — SVO had 24 rows in the past still reading 'ontime' — so the
          // status field answers a different question than "has this already happened".
          const place = f.destination || f.origin || '';
          const dm = place.match(/^(.*?)\s*\(([A-Z0-9]{2,4})\)\s*$/);
          const city = dm ? dm[1] : place;
          const code = dm ? dm[2] : '';
          // Кегль города БОЛЬШЕ НЕ ПОДБИРАЕТСЯ под длину имени.
          //
          // Раньше он шагал 18 → 16 → 15 по длине самого длинного слова, чтобы имя влезло в
          // колонку. Но соседние строки получали разный кегль — «Сочи» 18, «Новосибирск» 15, —
          // и табло выглядело набранным вразнобой, а влезать имя всё равно переставало:
          // уменьшение покупало 11-17% ширины, а «Санкт-Петербург (LED)» требовало больше.
          //
          // Вместо этого имя переносится по словам, а код ИАТА приклеен к последнему слову
          // неразрывным пробелом (ниже): код больше не остаётся сиротой на своей строке, ради
          // чего подбор кегля и затевался. Размер один на все строки и задан в CSS.
          const meta = rowMeta(f, locale);
          // Закреплённая строка. Разделитель не нужен, когда она на борту одна: черта
          // под единственной строкой отделяла бы её от пустоты.
          const isPinnedRow = f === pinnedFlight;

          return (
            // <li> carries the list semantics; the inner div stays the button, so both roles
            // survive (an li with role="button" would erase the list for assistive tech).
            <li key={i} className={isPinnedRow && shown.length > 1 ? 'fpin' : undefined}>
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
              aria-label={`${isPinnedRow ? t('pinned_flight') + ', ' : ''}${f.actual || f.scheduled}, ${f.flight}, ${city}, ${[...meta, label].join(', ')}`}
              className="frow"
              onClick={() => { haptic(); track(GOALS.flightCard, { from: isPinnedRow ? 'pinned' : 'row', past: !!f.ts && f.ts * 1000 < Date.now() }); setSelected(f); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic(); track(GOALS.flightCard, { from: 'keyboard' }); setSelected(f); } }}
              style={{ opacity: isPast ? 0.82 : 1 }}
            >
              {/* Полоса статуса. Ширина 4px и flexShrink: 0 — у строки
                  overflow: hidden, и скругление строки обрезает полосу по
                  своему радиусу, отдельного скругления ей не нужно. */}
              <div style={{ width: 4, background: color, flexShrink: 0 }} />

              {/* Row content. Размеры, отступы и ширины колонок — в CSS
                  (.frow-in и соседние), чтобы они менялись с шириной экрана.
                  Инлайн остаётся только то, что зависит от данных: цвета. */}
              <div className="frow-in">
                {/* КОГДА: время, прежнее время, номер рейса */}
                <div className="frow-when">
                  <div className="frow-time" style={{ color: f.actual ? (isPast ? C.past : C.orange) : (isPast ? C.past : C.text) }}>
                    {f.actual || f.scheduled}
                  </div>
                  {f.actual && <div className="frow-was" style={{ color: C.secondary }}>{f.scheduled}</div>}
                  {/* 0.75, а не 0.42: на фоне строки 0.42 давало 4.06:1 при норме AA 4.5, а на
                      прошедшей строке, где сверху лежит групповая прозрачность, — 2.50:1. Для
                      сравнения город и время в той же строке идут 19.65:1. Номер рейса — ровно то,
                      по чему человек ищет свою строку, и он был самым тусклым текстом на экране.

                      С 0.65 до 0.75 поднято 31.10.2026: переписанный check:contrast научился
                      мерить СВЕТЛУЮ тему, которой при его написании не было, и нашёл там 3.77:1
                      на прошедшей строке — тот же дефект в другой теме. Порог проходится с
                      0.59 эффективной альфы, 0.75 даёт 0.615 и 4.81:1. В тёмной теме рост альфы
                      только добавляет контраста (8.33:1 → 9.44:1). */}
                  <div className="frow-no" style={{ color: 'rgba(var(--ab-ink),0.75)' }}>{f.flight}</div>
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
                {/* КУДА: город с кодом, под ними авиакомпания и длительность */}
                <div className="frow-where">
                  {/* Только имя города. Код ИАТА ушёл строкой ниже, к авиакомпании.
                      Рядом с именем он не помещался принципиально: на 375px под эту
                      колонку остаётся ~120px, а «Petersburg (LED)» жирным шестнадцатым
                      требует ~130. Отсюда росли оба прежних костыля — подбор кегля по
                      длине имени и зажим в три строки, — и оба проигрывали: код всё
                      равно оставался сиротой на своей строке. Теперь строка разбита по
                      смыслу: крупно то, КУДА летит рейс, мелко — чем и как долго. */}
                  {/* Значок закрепления стоит ПЕРЕД именем города и обязан остаться с ним на
                      одной строке. Поэтому он не инлайновый внутри имени, а отдельный элемент
                      флексовой обоймы: имя переносится внутри СВОЕЙ коробки, и значок не может
                      остаться один на первой строке — а именно так и вышло бы, окажись первое
                      слово шире остатка колонки («Екатеринбург» занимает 101px из 117 на 375px).
                      Имя города при этом сохраняет свой зажим в три строки и многоточие. */}
                  {isPinnedRow ? (
                    <div className="frow-city-pin">
                      <svg viewBox="5 2 14 20" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7.8 3.2h8.4v3.2h-2.6v5l4 3H6.4l4-3v-5H7.8z" fill={C.blue} />
                        <path d="M12 14.4v6.4" />
                      </svg>
                      <div className="frow-city" style={{ color: C.text }}>{city}</div>
                    </div>
                  ) : (
                    <div className="frow-city" style={{ color: C.text }}>{city}</div>
                  )}
                  {/* Не больше двух строк и перенос ТОЛЬКО по разделителю: каждая часть nowrap. На 375px
                      колонка ~125px, и в одну строку с многоточием авиакомпания съедалась целиком
                      («1 ч 30 мин · Nor…»). Теперь «1 ч 30 мин ·» / «Nordwind», на десктопе — одна строка.

                      Видимых частей не больше двух (30.10.2026). Третья в две строки не влезала и
                      обрезалась на самом разделителе: «IST · 7 ч ·» / «Turkish Airlines · …» —
                      две висящие точки и многоточие вместо сведений. Поставщик отдаёт все три
                      части разом редко (тип самолёта — 11 строк из 6 180 на 20.10), поэтому
                      обрезка снимает почти всегда ничего; когда снимает, снимается самое
                      последнее по важности, а в карточке рейса тип самолёта остаётся целиком.
                      В aria-label идёт ПОЛНЫЙ список: там ширины нет и терять нечего. */}
                  {(code || meta.length > 0) && (() => {
                    const shown = meta.slice(0, 2);
                    return (
                      <div className="frow-meta" style={{ color: C.secondary }}>
                        {code && <bdi className="frow-code">{code}</bdi>}
                        {code && shown.length > 0 && <span>{' · '}<wbr /></span>}
                        {shown.map((m, k) => <span key={k} style={{ whiteSpace: 'nowrap' }}>{m}{k < shown.length - 1 ? ' · ' : ''}{k < shown.length - 1 ? <wbr /> : null}</span>)}
                      </div>
                    );
                  })()}
                </div>

                {/* Ширина статуса не зависит от его текста. Раньше maxWidth 80/88
                    ограничивал только максимум: «Посадка» занимала 66px, «Последний
                    вызов» — 80px. На 375px город при обновлении сжимался с 129 до
                    115px и переносил IATA на новую строку. В Safari это создавало
                    нового LCP-кандидата уже после гидратации, хотя табло давно видно.
                    Резервируем прежний максимальный размер колонки (88px) сразу:
                    обновление меняет статус, но не ширину соседнего города. Проверено
                    на минимальном воспроизведении из SSR-строки SSH в WebKit и на
                    полном табло; шрифты, цвета и содержимое сохраняются. */}
                {/* Спокойный статус — обычным регистром и в одну строку (18.10.2026). Заглавные
                    «ПО / РАСПИСАНИЮ» в две строки делали КАЖДУЮ карточку на ~20px выше, а это
                    самый частый статус: на экран телефона входило 4.5 рейса. Тревожные статусы
                    (задержка, посадка, последний вызов, отмена) остаются заглавными и жирными —
                    они и должны бросаться в глаза, а «всё по плану» — нет. */}
                {/* ЧТО С НИМ: выход и статус */}
                <div className="frow-what">
                  <div className="frow-status">
                    {/* Подпись и номер выхода разрешено разнести по строкам, а сам номер —
                        нет (30.10.2026). «Выход A12-B14» одной неразрывной строкой занимал
                        112px в колонке шириной 86 и вылезал прямо на стрелку справа: nowrap
                        на всей строке означал, что выравнивание по краю уже не работает —
                        строка шире коробки просто растёт вправо. Теперь перенос возможен
                        только по пробелу между словом и номером, а номер с дефисом остаётся
                        целым, как написан на табличке. Ровно та же поправка, что строкой
                        ниже сделана для спокойного статуса.
                        Кегль у длинного номера на ступень меньше: «A12-B14» восемнадцатым
                        занимает 72px при колонке 76 на 320px — впритык. */}
                    {f.gate && (
                      <div className="frow-gate">
                        <span style={{ fontSize: 12, color: C.secondary }}>{t('gate')} </span>
                        <bdi style={{ fontSize: f.gate.length > 4 ? 15 : 18, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{f.gate}</bdi>
                      </div>
                    )}
                    {/* nowrap у спокойного статуса снят: в 124px колонке он и так
                        в одну строку, а на телефоне «По расписанию» упиралось в
                        88px и вылезало за край вместо переноса. */}
                    <div style={(f.status === 'ontime' || f.status === 'scheduled') ? {
                      fontSize: 11.5, fontWeight: 600, color, lineHeight: 1.3,
                    } : {
                      fontSize: 12, fontWeight: 700, color, letterSpacing: '0.03em', textTransform: 'uppercase',
                      lineHeight: 1.3,
                      textShadow: !isPast && f.status === 'finalcall' ? '0 0 10px rgba(255,69,58,0.15)' : 'none',
                    }}>
                      {label}
                    </div>
                  </div>
                  <svg data-flip width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" className="route-arrow" style={{ flexShrink: 0 }}>
                    <path d="M1 1L7 7L1 13" stroke="rgba(var(--ab-ink),0.22)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
            </li>
          );
        }), [shown, realNow, nowMs, t, locale, pinnedFlight]);

  const moreAbove = allPast && !showAll;
  const moreButton = !loading && visible.length > shown.length ? (
          <button className="press" onClick={() => { track(GOALS.boardMore, { shown: INITIAL, total: visible.length }); setShowAll(true); }} style={{
            width: '100%', height: 56, marginTop: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            border: '1px solid rgba(var(--ab-ink),0.08)', background: 'rgba(var(--ab-ink),0.02)',
            borderRadius: 18, color: C.text, fontSize: 15, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>
            {mode === 'departures' ? t('more_departures') : t('more_arrivals')}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 5L6.5 8.5L10 5" stroke="var(--ab-8a8a8a)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
  ) : null;
  useEffect(() => { setShowAll(false); }, [mode, filter, trimSearch]);

  function switchMode(next: Mode) {
    if (next === mode) { setFilter('all'); return; }
    // Отмена синхронна с нажатием, ещё до следующего effect. Старые вылеты
    // нельзя показывать/выбирать под активной кнопкой «Прилёты» даже на один тик.
    requestRef.current?.abort();
    const cached = boardCache.current!.get(`${airport.iata}:${locale}:${next}`);
    setFlights(cached?.rows ?? []);
    const updated = cached?.fetchedAt ? new Date(cached.fetchedAt) : null;
    setUpdated(updated);
    setNowMs(cached?.fetchedAt || 0);
    setAllPast(cached?.allPast ?? false);
    setUpdLabel(updated ? relTime(updated, t) : t('updating_now'));
    setIsLive(!!updated && Date.now() - updated.getTime() < 90_000);
    setLoading(!cached);
    setSelected(null);
    setMode(next);
    setFilter('all');
  }

  return (
    // 100dvh keeps the footer from jumping up while a real board loads. With no scheduled
    // service nothing will ever fill it, so reserving a screenful leaves a dead gap between
    // the notice and the rest of the page.
    //
    // Резерв снимается, КАК ТОЛЬКО на борту есть хоть одна строка. Прыгать нечему:
    // строки пришли уже в серверном HTML, и высоту дальше задаёт содержимое. А вот
    // когда строк мало — поздней ночью, или когда всё уже вылетело, — экран резерва
    // оставался пустым: между последним рейсом и справочной зияло 293px пустоты
    // (замер на IST). Резерв нужен ровно в тот момент, ради которого он заведён:
    // пока показывать нечего.
    //
    // Обёртка прозрачна: под ней лежат слои фона (пятна + узор), и непрозрачная
    // заливка их перекрывала. Во встраиваемом виджете (bare) фон остаётся: там
    // под ним чужая страница, а не наша.
    <div style={{ background: bare ? C.bg : 'transparent', minHeight: bare || shown.length > 0 ? undefined : '100dvh', paddingBottom: bare ? 16 : 'calc(48px + env(safe-area-inset-bottom))' }}>

      {/* ── Airport header — compact. The identity is one line: code + name + clock. The old
          header spent ~380px (a 76px IATA glyph, an always-open search field, two control
          rows and two meta lines) before the first flight row; on a 812px phone the board the
          visitor searched for showed exactly one row. Premium here means the content leads. */}
      {/* Шапка аэропорта — стеклянная панель, а не текст прямо на обоях: на
          пёстром фоне серые вторичные строки читались плохо, а блок не имел
          границ и сливался с табло под ним. */}
      {/* Нижний отступ 6, а не 12: у блока вкладок свой отступ сверху, и
          вместе они давали 18 против 10 у соседних стыков. */}
      <div style={{ padding: '10px 16px 6px' }}>
      <div className="ap-head glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, color: C.text }}>{airport.iata}</span>
            {/* Leading space, deliberately.
                The two spans are separated visually by the flex `gap`, which is layout only —
                nothing separates them in the text. So the h1 read as "AERСочи" / "MADMadrid"
                to anything consuming textContent: crawlers, screen readers, and the assistants
                the AEO work is aimed at. A space as the first child of a flex item is stripped
                for layout but kept in textContent, so this changes the read text and not a
                single rendered pixel. */}
            <span style={{ fontSize: 15, fontWeight: 500, color: C.secondary, lineHeight: 1.3, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{' '}{displayName || airport.name}</span>
            {/* Пробел перед разделителем — по той же причине, что и у имени выше: между
                flex-элементами текста нет, и без него h1 читался бы «УфаПрилёты». */}
            {headingNote && (
              <span style={{ fontSize: 14, fontWeight: 600, color: C.secondary, lineHeight: 1.25, flexShrink: 0, opacity: 0.85 }}>{' · '}{headingNote}</span>
            )}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2.5vw, 12px)', flexShrink: 0 }}>
            {/* Сердца здесь больше нет: оно переехало в шапку сайта и там же стало
                переключателем. Две одинаковые на вид кнопки в двух сантиметрах друг
                от друга — верный способ заставить человека нажать не ту. */}
            {/* Время — второй по важности элемент шапки после кода аэропорта:
                по нему сверяются с расписанием. Моноширинные цифры, чтобы
                строка не дёргалась каждую минуту при смене знаков. */}
            <div style={{ fontSize: 'clamp(30px, 8vw, 40px)', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: C.text, lineHeight: 1 }}>{time}</div>
          </div>
        </div>

        {/* Подпись «Местное время» ушла из блока с часами на строку описания:
            под крупными цифрами она висела отдельной мелкой строкой и ломала
            правый край панели. Здесь она читается как подпись к той же строке,
            а описание и подпись делят одну линию. */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, margin: '6px 0 0' }}>
          {lead
            ? <p style={{ fontSize: 13.5, lineHeight: 1.5, color: C.secondary, margin: 0, maxWidth: 620 }}>{lead}</p>
            : <span />}
          <span style={{ fontSize: 11.5, color: C.secondary, letterSpacing: '0.03em', opacity: 0.75, flexShrink: 0, whiteSpace: 'nowrap' }}>{t('local_time')}</span>
        </div>
        {statusLine && (
          <p style={{ fontSize: 12.5, lineHeight: 1.45, color: C.text, margin: '5px 0 0', maxWidth: 620, fontVariantNumeric: 'tabular-nums' }}>{statusLine}</p>
        )}

        {/* One meta line: freshness + row count. These were two separate rows. */}
        {!bare && <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, minHeight: 18 }}>
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
          {isStale && <span aria-hidden="true" style={{ fontSize: 12, color: C.secondary, opacity: 0.5 }}>·</span>}
          {isStale && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.orange, letterSpacing: '0.02em' }}>
              {t('board_stale')}
            </span>
          )}
          {!loading && flights.length > 0 && <span aria-hidden="true" style={{ fontSize: 12, color: C.secondary, opacity: 0.5 }}>·</span>}
          {!loading && flights.length > 0 && (
            <span style={{ fontSize: 12, color: C.secondary, opacity: 0.85 }}>
              {(() => { const n = flights === initialFlights && boardTotal != null ? boardTotal : flights.length; return mode === 'departures' ? t('departures_on_board', { count: n }) : t('arrivals_on_board', { count: n }); })()}
            </span>
          )}
        </div>}

        {/* «Об аэропорте» — под аккуратной кнопкой в самой шапке. Заголовок
            второго уровня сохранён внутри summary: он остаётся в структуре
            документа и в серверном HTML, как и сам абзац. */}
        {aboutExtra && aboutTitle && (
          <details className="ap-about">
            <summary>
              <h2>{aboutTitle}</h2>
              <DisclosureArrow />
            </summary>
            {aboutExtra}
          </details>
        )}
      </div>
      </div>

      {/* ── Controls: mode tabs + search icon in ONE row; the input expands in place ── */}
      {!bare && <>
      <div style={{ padding: '6px 16px 10px', maxWidth: 960, margin: '0 auto' }}>
        {/* Оба слоя остаются в DOM: поле растёт от лупы без скачка высоты табло.
            inert исключает скрытые кнопки из Tab/VoiceOver; reduced-motion — в CSS.
            При закрытии фильтр сбрасывается, чтобы не оставлять невидимый запрос. */}
        <div ref={searchControlsRef} className="board-search-controls" data-open={searchOpen}>
          <div className="board-search-modes" inert={searchOpen}>
            <div className="glass" style={{ flex: 1, display: 'flex', borderRadius: 999, padding: 4, gap: 2 }}>
              {(['departures', 'arrivals'] as Mode[]).map(m => {
                const active = mode === m;
                return (
                  // Сохраняем переключение без перезагрузки, но даём настоящий href:
                  // раньше верхние кнопки не связывали табло с /arrivals для краулера
                  // и не позволяли открыть нужный режим в новой вкладке. Вылеты ведут
                  // сразу на canonical родителя, не на дубль /departures. Обычный клик
                  // обслуживает прежний switchMode; модификаторы/средняя кнопка и
                  // отключённый JS используют URL. role=button сохраняет семантику
                  // выбранного режима и Space для клавиатуры; оформление прежнее.
                  <a key={m} href={`/${locale}/airport/${airport.iata}${m === 'arrivals' ? '/arrivals' : ''}`} role="button" aria-pressed={active} className="press"
                    onClick={e => {
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault();
                      haptic(); track(GOALS.boardMode, { mode: m }); switchMode(m);
                    }}
                    onKeyDown={e => {
                      if (e.key === ' ') e.preventDefault();
                    }}
                    onKeyUp={e => {
                      if (e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
                    }} style={{
                    textDecoration: 'none', fontFamily: 'inherit', lineHeight: 'normal',
                    flex: 1, padding: '10px 0', minHeight: 40, fontSize: 14,
                    border: 'none', borderRadius: 999, cursor: 'pointer',
                    /* Подложки у выбранной вкладки больше нет (30.10.2026, решение
                       владельца): var(--glass-dense) внутри стеклянной капсулы давал
                       второй слой стекла поверх первого — светлую плашку в оправе.
                       Выбранную вкладку теперь отличают цвет и насыщенность начертания.
                       Насыщенность здесь не для красоты: цвет остался бы единственным
                       признаком состояния, а 700 против 600 — признак нецветовой, и он
                       ничего не двигает, потому что ширину вкладки задаёт flex, а не
                       текст. Программе чтения состояние и так сообщает aria-pressed. */
                    background: 'transparent', color: active ? C.text : C.secondary,
                    fontWeight: active ? 700 : 600,
                    transition: 'color 0.18s ease', letterSpacing: '-0.01em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    {/* Вектор вместо знаков ✈ и 🛬: второй — цветной эмодзи, он
                        выбивался из тонкой графики остального интерфейса, а его
                        вид зависел от системы. */}
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {m === 'departures'
                        ? <><path d="M3 21h18" /><path d="M6.5 16.5 4 10.5l2.2-.7 2.2 2.6 3.1.7-2-7.4 2.4-.8 4.2 8.6 4.1 1c1.1.3 1.6 1.2 1.3 2l-15-2.6z" /></>
                        : <><path d="M3 21h18" /><path d="M20.6 16.2 4.6 12.5l-1-6.3 2.3-.3 2.2 3.6 3.1.8-1-7.6 2.5-.4 3.6 9.1 4 1c1.1.3 1.6 1.2 1.3 2z" /></>}
                    </svg>
                    {m === 'departures' ? t('departures') : t('arrivals')}
                  </a>
                );
              })}
            </div>
            <button
              type="button"
              aria-label={t('search_placeholder')}
              aria-expanded={searchOpen}
              ref={searchToggleRef}
              className="press glass"
              onClick={() => setSearchOpen(true)}
              style={{
                width: 52, height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, border: 'none', cursor: 'pointer',
              }}
            >
              {/* 22 в кнопке 52px: прежние 16 занимали меньше трети её поперечника,
                  и лупа тонула в подложке. Соседние круглые кнопки сайта держат
                  около половины: 20 в сорока у карточки рейса, 20–22 в шапке. */}
              <IconSearch color={C.secondary} size={22} />
            </button>

          </div>
          <div className="board-search-panel" inert={!searchOpen}>
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
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  setSearch(''); setSearchOpen(false);
                  requestAnimationFrame(() => searchToggleRef.current?.focus({ preventScroll: true }));
                }
              }}
              style={{
                width: '100%', height: 46, padding: '0 44px', fontSize: 16,
                border: `1px solid ${search ? 'var(--ab-333333)' : C.border}`, borderRadius: 13,
                outline: 'none', background: C.surface, color: C.text, WebkitAppearance: 'none',
              }}
            />
            <button
              type="button"
              aria-label={tNav('clear')}
              onClick={() => { setSearch(''); setSearchOpen(false);
                  requestAnimationFrame(() => searchToggleRef.current?.focus({ preventScroll: true })); }}
              style={{
                position: 'absolute', insetInlineEnd: 1, top: '50%', transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', borderRadius: '50%', width: 44, height: 44,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
              }}
            >
              <span style={{ background: 'var(--ab-2c2c2e)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconClose color={C.secondary} /></span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter pills ───────────────────────────────────── */}
      <div className="pillrow" style={{ display: 'flex', gap: 7, padding: '0 16px 12px', overflowX: 'auto', maxWidth: 960, margin: '0 auto' }}>
        {FILTERS.map(key => {
          const active = filter === key;
          return (
            /* Выбранный фильтр — плотное стекло с рамкой, а не сплошная заливка
               цветом текста. Белый круг посреди стеклянных капсул читался как
               чужеродный элемент: во всём остальном интерфейсе выбранное
               состояние показывается плотностью стекла (вкладки табло, пункт
               меню языка, раскрытая плитка справочной), и фильтры были
               единственным местом с инверсией. */
            <button key={key} type="button" aria-pressed={active} className={`press${active ? ' glass-dense' : ' glass-soft'}`} onClick={() => { haptic(); track(GOALS.boardFilter, { filter: key }); setFilter(key); }} style={{
              padding: '8px clamp(12px, 4vw, 15px)', minHeight: 44,
              fontSize: 'clamp(12px, 3.6vw, 13px)', fontWeight: active ? 600 : 400,
              border: 'none', borderRadius: 999, cursor: 'pointer',
              boxShadow: active ? 'var(--glass-rim), inset 0 0 0 1.5px var(--ab-0a84ff)' : 'var(--glass-rim)',
              color: active ? C.text : C.secondary,
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'color 0.15s ease, box-shadow 0.15s ease',
            }}>
              {t(`filter_${key}`)}
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
              {loadFailed && flights.length === 0 ? t('board_pending') : pendingNote ?? t('no_flights')}
            </div>
          </div>
        )}

        {/* Закреплённый рейс отдельной карточкой БОЛЬШЕ НЕ рисуется (30.10.2026).
            Сжатая полоска сверху показывала время, номер, город и точку статуса — то есть
            теряла и формат строки табло, и половину сведений: прежнее время, авиакомпанию,
            длительность, выход, подпись статуса словами. Вместо неё закреплённый рейс стоит
            первой строкой списка в своём обычном виде (см. `shown` и класс .fpin). */}

        {/* Прямая констатация, когда впереди не осталось ничего.
            Раньше страница молча показывала вчерашнее как сегодняшнее: борт выглядел
            обычным, статусы говорили «Посадка» и «Последний вызов», а все рейсы уже улетели.
            Признак вычислялся внутри lib/flights.ts и наружу не отдавался. */}
        {allPast && (
          <div style={{
            maxWidth: 960, margin: '0 auto 10px', padding: '13px 18px',
            borderRadius: 'var(--r-card)',
            /* Стекло, как у остальных блоков, плюс янтарный оттенок. Было:
               плоская заливка без размытия и жёсткая рамка — на обоях
               предупреждение выглядело наклейкой поверх страницы. */
            background: 'color-mix(in srgb, rgba(255,159,10,.14) 55%, var(--glass))',
            WebkitBackdropFilter: 'var(--blur)', backdropFilter: 'var(--blur)',
            boxShadow: `var(--glass-rim), inset 0 0 0 1px color-mix(in srgb, ${C.orange} 22%, transparent)`,
            color: 'var(--ab-e4e4e7)',
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
        {flightRows}
        </ul>

        {!moreAbove && moreButton}
      </div>

      {/* ── Bottom sheet ───────────────────────────────────── */}
      <BottomSheet
        isPinned={!!selected && pinned?.flight === selected.flight}
        onTogglePin={() => { if (selected) togglePin(selected.flight); }}
        flight={selected}
        clockMs={realNow}
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
