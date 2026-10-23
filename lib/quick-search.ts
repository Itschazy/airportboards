// Только короткие поля подсказки: полный каталог, координаты и многоязычные алиасы
// остаются на сервере. Это быстрый первый ответ, а не замена полного ранжирования.
export type AirportSuggestion = { iata: string; name: string; city: string; country: string; iso2: string };
export type QuickTuple = [string, string, string, string, string];
type Prepared = { airport: AirportSuggestion; code: string; city: string; words: string[] };
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function prepareQuick(rows: QuickTuple[]): Prepared[] {
  return rows.map(([iata, name, city, country, iso2]) => ({
    airport: { iata, name, city, country, iso2 }, code: iata.toLowerCase(),
    city: fold(city), words: words(`${city} ${name}`),
  }));
}

export function quickSearch(index: Prepared[], query: string): AirportSuggestion[] {
  const q = fold(query.trim());
  const tokens = words(q);
  if (q.length < 2 || !tokens.length) return [];
  // Каждое слово обязано совпасть с началом названия или кодом. Популярный JFK
  // никогда не становится ответом на AYT только потому, что уже был загружен.
  // Опечатки, транслитерация и сложные алиасы обрабатываются полным API-поиском.
  return index.flatMap((row, order) => {
    if (!tokens.every(token => row.code.startsWith(token) || row.words.some(word => word.startsWith(token)))) return [];
    const score = row.code === q ? 3 : row.city === q ? 2 : row.city.startsWith(q) ? 1 : 0;
    return [{ ...row, score, order }];
  }).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 10).map(row => row.airport);
}

// Пришедший полный ответ подтверждает состав выдачи, но не переставляет уже
// видимые буквальные совпадения под пальцем. Например, «каз» быстро показывает
// Казань, а нечёткий серверный поиск добавляет Као (KAZ) по транслитерации.
// Неподтверждённые строки убираются, новые идут после сохранённых совпадений.
export function prioritizeQuick(full: AirportSuggestion[], quick: AirportSuggestion[]): AirportSuggestion[] {
  const byCode = new Map(full.map(a => [a.iata, a]));
  const first = quick.flatMap(a => { const match = byCode.get(a.iata); return match ? [match] : []; });
  const kept = new Set(first.map(a => a.iata));
  return [...first, ...full.filter(a => !kept.has(a.iata))];
}
