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
  return <button type="button" onClick={toggle} className="hdr-pill hdr-pill-btn glass" style={{width:52,justifyContent:'center',color:'var(--ab-ffffff)'}}>
    {/* Тонкая векторная графика вместо символов ☀ и ☾: текстовые знаки
        рисуются шрифтом, поэтому их толщину и размер не задать, а вид
        отличается от системы к системе. */}
    <span className="theme-sun">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.15" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.4" />
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
      </svg>
      <span className="sr-only">{t('theme_light')}</span>
    </span>
    <span className="theme-moon">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.4 14.3A8.6 8.6 0 0 1 9.7 3.6a8.9 8.9 0 1 0 10.7 10.7z" />
      </svg>
      <span className="sr-only">{t('theme_dark')}</span>
    </span>
  </button>;
}
