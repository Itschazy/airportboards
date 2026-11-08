import type { AirportSuggestion } from './quick-search';

// В ab_recent лежат подписи того языка, на котором аэропорт посещали. Не меняем
// историю и не везём весь каталог на телефон: один короткий запрос для пяти кодов.
// Поиск и нижние ссылки делят запрос/кэш; порядок остаётся пользовательским.
const cache = new Map<string, { expires: number; promise: Promise<AirportSuggestion[]> }>();
export async function localizeRecent<T extends { iata: string }>(rows: T[], locale: string): Promise<T[]> {
  const codes = [...new Set(rows.map(a => a.iata).filter(code => /^[A-Z]{3}$/.test(code)))].slice(0, 5).sort();
  if (!codes.length) return rows;
  const key = `${locale}:${codes.join(',')}`;
  let entry = cache.get(key);
  if (entry && entry.expires <= Date.now()) { cache.delete(key); entry = undefined; }
  if (!entry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const promise = fetch(`/api/airports/search?locale=${encodeURIComponent(locale)}&codes=${codes.join(',')}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error('Recent airport labels');
        const { airports } = await res.json();
        if (!Array.isArray(airports) || airports.length > 5) throw new Error('Recent airport response');
        return airports.filter((a): a is AirportSuggestion => a && codes.includes(a.iata) &&
          ['name', 'city', 'country', 'iso2'].every(field => typeof a[field] === 'string' && a[field].length <= 256));
      }).finally(() => clearTimeout(timer));
    entry = { expires: Date.now() + 3600_000, promise };
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    cache.set(key, entry);
  }
  try {
    const localized = new Map((await entry.promise).map(a => [a.iata, a]));
    return rows.map(a => localized.has(a.iata) ? { ...a, ...localized.get(a.iata)! } : a);
  } catch {
    if (cache.get(key) === entry) cache.delete(key);
    // Offline/старый сервер: ссылки и сохранённые подписи остаются доступными.
    return rows;
  }
}
