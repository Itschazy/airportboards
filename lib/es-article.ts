/**
 * Определённый артикль перед названием страны в испанском: «en las Islas Caimán», а не
 * «en Islas Caimán».
 *
 * Шаблон «Aeropuertos en {country}» подставляет голое имя, поэтому заголовок и H1 страницы
 * страны читались «Aeropuertos en Islas Caimán», «Aeropuertos en Estados Unidos»,
 * «Aeropuertos en Países Bajos». Для носителя это не стилистическая мелочь, а пропущенное
 * слово.
 *
 * Список закрытый и намеренно УЗКИЙ. У части названий артикль факультативен и в современном
 * узусе всё чаще опускается — «en Perú», «en Argentina», «en India», «en Japón» звучат
 * нормально, и добавлять к ним артикль значит менять живое употребление на архаичное. Здесь
 * перечислены только те, где артикль ОБЯЗАТЕЛЕН: множественные названия островных групп и
 * составные имена с родовым словом («República», «Reino», «Estados», «Emiratos»).
 *
 * Перечислены все 22 таких страны, у которых есть аэропорты с рейсами; список проверяется
 * scripts/check-es-article.mjs против data/country-names.json, поэтому новая страна в данных
 * не пройдёт молча.
 */
const ARTICLES: Record<string, 'el' | 'la' | 'los' | 'las'> = {
  'Bahamas': 'las',
  'Comoras': 'las',
  'Filipinas': 'las',
  'Islas Caimán': 'las',
  'Islas Cook': 'las',
  'Islas Feroe': 'las',
  'Islas Marianas del Norte': 'las',
  'Islas Salomón': 'las',
  'Islas Turcas y Caicos': 'las',
  'Islas Vírgenes': 'las',
  'Islas Vírgenes Británicas': 'las',
  'Maldivas': 'las',
  'Seychelles': 'las',
  'Emiratos Árabes Unidos': 'los',
  'Estados Unidos': 'los',
  'Países Bajos': 'los',
  'Reino Unido': 'el',
  'República Centroafricana': 'la',
  'República Checa': 'la',
  'República de Corea': 'la',
  'República Democrática del Congo': 'la',
  'República Dominicana': 'la',
};

/** Названия, которым в испанском нужен артикль. Экспортируется для проверки. */
export const ES_ARTICLE_NAMES = Object.keys(ARTICLES);

/**
 * Название страны в позиции после предлога. Для не-испанских локалей возвращает имя как есть:
 * их строки этот параметр не используют, но передаётся он отовсюду, и вернуть испанский
 * артикль в немецкий заголовок было бы хуже, чем не вернуть ничего.
 */
export function countryIn(name: string, locale: string): string {
  if (locale !== 'es' || !name) return name;
  const art = ARTICLES[name.trim()];
  return art ? `${art} ${name}` : name;
}
