/**
 * Fold a place name to its bare letters, so two spellings of the same place compare equal.
 *
 * NFKD splits accented letters into base + combining mark and folds full-width forms; stripping
 * everything that is not a letter or digit then removes the marks along with spaces, hyphens and
 * punctuation. "Ålesund" and "Alesund", "Алма‑Ата" (non-breaking hyphen) and "Алма-Ата",
 * "エルアリシュ" and "エル＝アリシュ" all land on the same string.
 */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
}

/**
 * Should the title append the city after the airport name?
 *
 * "no" when the name already contains it — "Sochi Airport, Sochi" is noise.
 *
 * Two things defeated the naive substring test, and both shipped as duplicated place names in
 * live titles:
 *
 *   1. Comparing the LOCALISED name against the LOCALISED city broke when 238 corrupted localised
 *      names were deleted and began falling back to English — an English name cannot contain a
 *      Hindi city, so the check appended one: "Václav Havel Airport Prague, प्राग".
 *   2. Even when both are in the same script, they are independently transliterated and differ by
 *      a hyphen, a space or a diacritic. Measured across all twelve locales: 2,716 titles printed
 *      the same place twice — hi 1,188, ar 269, en 252, ja 214, ko 213, ru 135.
 *
 * Folding both sides and testing the English city as well closes both.
 */
/**
 * Расстояние Левенштейна, оборванное на пороге: считать дальше незачем, а на 6000 аэропортов
 * × 12 локалей обрыв экономит большую часть работы.
 */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > max) return false;
    prev = row;
  }
  return prev[b.length] <= max;
}

/**
 * Тот же город, записанный чуть иначе.
 *
 * Два справочника — airport-names.json и city-names.json — транслитерировались независимо, и
 * там, где они разошлись на одну букву, точное вхождение не срабатывало, а заголовок печатал
 * место дважды: «Онлайн-табло аэропорта Анталия, Анталья (AYT)», «Усть-Каменногорск,
 * Усть-Каменогорск (UKK)», «इस्तांबुल, इस्तानबुल (IST)». На UKK это стоило видимого текста:
 * 91 знак, и в выдаче обрезалось ровно на «прилеты и вылеты сегодня» — на словах, которые
 * люди набирают.
 *
 * Порог — 15% длины, не меньше единицы, и сравнение идёт по ОКНУ внутри имени, потому что
 * город обычно лишь часть названия аэропорта («Международный аэропорт Анталья»).
 *
 * Второе написание при этом никуда не девается: оно остаётся в справочнике, а значит в
 * поисковом индексе, и запрос «Анталия» находит AYT так же, как «Анталья» — проверяется в
 * scripts/check-search-i18n.mjs. Из ЗАГОЛОВКА оно уходит, потому что охват оно не приносит:
 * по данным Яндекс.Вебмастера сайт показывается по написаниям, которых в заголовке нет вовсе
 * («мин воды» — 467 показов при заголовке «Минеральные Воды», «сухуми» — 218 при «Сухум»).
 */
function sameCity(name: string, city: string): boolean {
  if (!city) return false;
  if (name.includes(city)) return true;
  if (city.length < 5) return false;                 // на коротких именах опечатка = другое место
  // Обратное вхождение: имя города длиннее имени аэропорта на служебное слово —
  // «미나미다이토» против «미나미다이토촌» (посёлок), «Арката» против «Арката Калифорния».
  if (name.length >= 5 && city.startsWith(name)) return true;
  // 20%, а не 15%: «나이아가라폴스» против «나이아가라 폭포» — Ниагарский водопад
  // транслитерацией и переводом — расходится на два знака из семи.
  const max = Math.max(1, Math.round(city.length * 0.2));
  for (let i = 0; i + city.length - max <= name.length; i++) {
    for (let len = city.length - max; len <= city.length + max; len++) {
      if (i + len > name.length) break;
      if (within(name.slice(i, i + len), city, max)) return true;
    }
  }
  return false;
}

export function showCityFlag(name: string, localisedCity: string, englishCity?: string | null): 'yes' | 'no' {
  const n = fold(name);
  if (!n) return 'yes';
  for (const city of [localisedCity, englishCity]) {
    if (!city) continue;
    // Уточнение в скобках — часть имени ГОРОДА, а не имени аэропорта: «Арката» против
    // «Арката (Калифорния)», «Алтай» против «Алтай (город)». Без снятия скобок строки
    // расходятся длиной и заголовок печатает «аэропорта Арката, Арката (Калифорния)».
    const bare = city.replace(/\s*[（(][^）)]*[）)]/g, ' ').trim();
    for (const variant of bare && bare !== city ? [city, bare] : [city]) {
      const c = fold(variant);
      if (c && sameCity(n, c)) return 'no';
    }
  }
  return 'yes';
}
