/** Тема не зависит от SSR-кэша: у всех читателей один HTML, предпочтение — локальное.
 * Скрипт в head выполняется до первого рисования, иначе сохранённая тёмная тема
 * вспыхивала бы светлой до гидратации. Недоступный storage означает системную тему.
 * CSS отслеживает смену системной темы самостоятельно, без ожидания React.
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_KEY = 'ab_theme';
export function themePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}
export const THEME_BOOTSTRAP = `(()=>{try{const t=localStorage.getItem('ab_theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'system'}catch{document.documentElement.dataset.theme='system'}})()`;
