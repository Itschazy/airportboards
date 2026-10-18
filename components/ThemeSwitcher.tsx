'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { THEME_KEY, themePreference, type ThemePreference } from '@/lib/theme';

/** Рядом с языком остаётся одна кнопка 44 px, а не ещё три постоянно видимых пункта.
 * Выбор «Как на устройстве» возвращает автоматическую тему; ручной выбор сохраняется
 * между страницами и визитами. Без localStorage переключение работает до перезагрузки.
 * Native radio внутри раскрывающегося блока даёт стрелки и озвучивание без своего меню.
 */
export function ThemeSwitcher() {
  const t = useTranslations('nav');
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  function apply(next: ThemePreference) {
    setTheme(next); document.documentElement.dataset.theme = next;
  }
  useEffect(() => {
    try { apply(themePreference(localStorage.getItem(THEME_KEY))); } catch { /* системная тема */ }
    const sync = (e: StorageEvent) => { if (e.key === THEME_KEY || e.key === null) apply(themePreference(e.newValue)); };
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && root.current?.contains(document.activeElement)) { setOpen(false); trigger.current?.focus(); } };
    addEventListener('storage', sync); document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape);
    return () => { removeEventListener('storage', sync); document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  return <div ref={root} className="theme-control" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className="theme-trigger" aria-label={`${t('theme')}: ${t(`theme_${theme}`)}`} title={`${t('theme')}: ${t(`theme_${theme}`)}`} aria-expanded={open} aria-controls="theme-options" onClick={() => setOpen(v => !v)}>
      <svg className="theme-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>
      <svg className="theme-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/></svg>
    </button>
    <fieldset id="theme-options" className="theme-options" hidden={!open}>
      <legend className="sr-only">{t('theme')}</legend>
      {(['system','light','dark'] as const).map(value => <label key={value}>
        <input type="radio" name="appearance" value={value} checked={theme === value} onChange={() => {
          apply(value); try { localStorage.setItem(THEME_KEY, value); } catch { /* остаётся до перезагрузки */ }
        }} />{t(`theme_${value}`)}
      </label>)}
    </fieldset>
  </div>;
}
