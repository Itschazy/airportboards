'use client';

import { useEffect, useState } from 'react';
import { readFavorites, subscribeFavorites, type FavAirport } from '@/lib/favorites';

/**
 * Список избранного для клиентского компонента.
 *
 * Первый проход ВСЕГДА возвращает пустой список, даже если в хранилище что-то есть:
 * этот же код выполняется на сервере при SSR, где localStorage нет, и чтение прямо в
 * useState дало бы разметку, не совпадающую с серверной (React тогда выбрасывает весь
 * поддеревом отрисованное и жалуется в консоль). Поэтому хранилище читается в эффекте,
 * а `ready` отличает «ещё не читали» от «прочитали, там пусто» — без этого блок
 * избранного мигал бы подписью «пока пусто» у человека, у которого он не пуст.
 */
export function useFavorites(): { favorites: FavAirport[]; ready: boolean } {
  const [favorites, setFavorites] = useState<FavAirport[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setFavorites(readFavorites());
    sync();
    setReady(true);
    // Снимаем строй правил, который скрипт в <head> поставил ДО первой отрисовки.
    // Он залил сердца избранных аэропортов, пока React ещё не знал о хранилище;
    // дальше состояние ведёт React, и держать те правила нельзя — снятый аэропорт
    // остался бы залитым, потому что стиль сильнее атрибута разметки.
    try { document.documentElement.dataset.hydrated = '1'; } catch { /* нет DOM — нечего снимать */ }
    return subscribeFavorites(sync);
  }, []);

  return { favorites, ready };
}
