/**
 * Bing 30.10.2026: длинное формальное имя вытесняло намерение (прилёты/вылеты).
 * Сокращаем только SEO-title, а не имя аэропорта, H1 или справочную.
 * Убираем классификационные слова только при превышении 70 символов; русское «Онлайн-табло аэропорта» заменяем на «Табло»; собственное
 * имя, город, IATA и направления остаются; Live никогда не добавляется к устаревшему табло. Не обрезаем строку по длине:
 * оставшийся длинный заголовок безопаснее потери различия между аэропортами.
 * Регрессии и охват: scripts/check-airport-title.mjs.
 */
export function compactAirportTitle(title: string, locale: string): string {
  if (title.length <= 70) return title;
  if (locale === 'ru') return title.replace(/^Онлайн-табло аэропорта /, 'Табло ');
  if (locale !== 'en') return title;
  const shorter = title.replace(/\bInternational Airport\b/g, 'Airport').replace(/\bInternational (?=Thurgood Marshall Airport\b)/g, '').replace(/\bRegional Airport\b/g, 'Airport');
  // Airport — тип объекта, не собственное имя: IATA и само имя сохраняются.
  // Нужно для BWI/SNA с несколькими частями имени; не отрезаем маршала/город.
  const named = shorter.length <= 70 ? shorter : shorter.replace(/ Airport\b/g, '');
  // При длинном имени BWI/ECP последним снимаем лишь обещание Live;
  // направления Arrivals & Departures сохраняем, устаревшее Live не добавляем.
  return named.length <= 70 ? named : named.replace(/ Live (?=Arrivals)/, ' ');
}
