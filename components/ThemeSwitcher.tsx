'use client';
import { useTranslations } from 'next-intl';

/** Значок обозначает действие: солнце включает светлую тему, луна — тёмную.
 * CSS выбирает значок по той же теме, что и страницу: без ожидания гидратации.
 * До ручного выбора работает prefers-color-scheme, в том числе при смене темы ОС.
 * Storage необязателен: в приватном режиме кнопка всё равно меняет текущую страницу.
 */
export function ThemeSwitcher() {
  const t = useTranslations('nav');
  function toggle() {
    const root = document.documentElement;
    const light = root.dataset.theme === 'light' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches);
    const next = light ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('ab_theme', next); } catch {}
  }
  return <button type="button" onClick={toggle} style={{width:44,height:44,flexShrink:0,marginInlineEnd:6,border:'1px solid var(--ab-1a1a1a)',borderRadius:8,background:'transparent',color:'var(--ab-ffffff)',cursor:'pointer',display:'grid',placeItems:'center'}}>
    <span className="theme-sun"><span aria-hidden="true">☀</span><span className="sr-only">{t('theme_light')}</span></span>
    <span className="theme-moon"><span aria-hidden="true">☾</span><span className="sr-only">{t('theme_dark')}</span></span>
  </button>;
}
