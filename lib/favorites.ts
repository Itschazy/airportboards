/**
 * Избранные аэропорты — список на устройстве, без учётной записи.
 *
 * Сайт не знает, кто его читает: входа нет, а 98.3% посещений садятся прямо на страницу
 * аэропорта из поиска. Поэтому избранное живёт в localStorage рядом с `ab_recent`
 * (components/RecentlyViewed.tsx) и темой (`ab_theme`) и никуда не отправляется.
 *
 * Отличие от «Недавних» принципиальное и ради него всё и делается: недавние пишутся САМИ
 * при каждом открытии борта и вытесняют друг друга через пять штук, то есть один обход
 * каталога стирает те аэропорты, за которыми человек и ходит. Избранное человек назначает
 * сам, и оттуда ничего не исчезает без его нажатия.
 *
 * Подписка нужна потому, что список читают сразу в трёх местах: сердечко в шапке
 * аэропорта, значок в нижней панели (он залит, когда избранное не пусто) и сам список
 * на /favorites. Без общего оповещения нажатие меняло бы только само сердечко, а значок
 * внизу оставался бы прежним до перезагрузки. Событие `storage` добавляет к этому вторую
 * вкладку: браузер присылает его только в ЧУЖИЕ вкладки, поэтому своё событие приходится
 * рассылать самому.
 */
export type FavAirport = {
  iata: string;
  /** Имя и город — чтобы блок избранного рисовался без обращения к каталогу на клиенте. */
  name?: string;
  city?: string;
  iso2?: string;
};

const KEY = 'ab_fav';
const EVENT = 'ab_fav_change';

/** Потолок списка. Избранное — это «мои аэропорты», а не второй каталог: двадцать
 *  позиций уже не просматриваются глазом, а место в localStorage делится с бортами. */
export const FAV_LIMIT = 20;

export function readFavorites(): FavAirport[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    // Чужая или испорченная запись не должна валить страницу: берём только то, что
    // похоже на запись аэропорта, остальное молча отбрасываем.
    return raw
      .filter((x): x is FavAirport => !!x && typeof x === 'object' && typeof x.iata === 'string')
      .slice(0, FAV_LIMIT);
  } catch {
    return [];
  }
}

function write(list: FavAirport[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, FAV_LIMIT)));
  } catch { /* приватный режим или переполнение: список просто не сохранится */ }
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* старый браузер без CustomEvent — обновится при следующем переходе */ }
}

export function isFavorite(iata: string): boolean {
  return readFavorites().some(a => a.iata === iata);
}

/** Переключает и возвращает НОВОЕ состояние — вызывающему не нужно перечитывать список. */
export function toggleFavorite(entry: FavAirport): boolean {
  const list = readFavorites();
  const without = list.filter(a => a.iata !== entry.iata);
  if (without.length !== list.length) {
    write(without);
    return false;
  }
  // Новый в начало: последний назначенный аэропорт чаще всего и нужен сейчас.
  write([entry, ...without]);
  return true;
}

export function removeFavorite(iata: string) {
  write(readFavorites().filter(a => a.iata !== iata));
}

/** Возвращает отписку. Вызывать только из useEffect — на сервере window нет. */
export function subscribeFavorites(fn: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === KEY) fn(); };
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', onStorage);
  };
}
