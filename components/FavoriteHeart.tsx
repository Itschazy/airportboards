'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { isFavorite, toggleFavorite, subscribeFavorites, type FavAirport } from '@/lib/favorites';
import { GOALS, track } from '@/lib/track';

/**
 * Сердечко «в избранное» в шапке аэропорта.
 *
 * Состояние читается в эффекте, а не при первой отрисовке: тот же компонент выполняется на
 * сервере, где хранилища нет, и залитое сердце в серверном HTML у человека без избранного
 * сначала горело бы, а потом гасло. До чтения кнопка нарисована в положении «не в избранном»
 * и уже занимает своё место, поэтому шапка не прыгает.
 *
 * Кнопка остаётся обычной <button> с aria-pressed, а не переключателем на div: роль и
 * состояние объявлены разметкой, подпись меняется вместе с состоянием, цель нажатия 44.
 */
export function FavoriteHeart({ entry }: { entry: FavAirport }) {
  const t = useTranslations('ui');
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(isFavorite(entry.iata));
    sync();
    return subscribeFavorites(sync);
  }, [entry.iata]);

  const label = on ? t('fav_remove') : t('fav_add');

  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleFavorite(entry);
        setOn(next);
        try { (navigator as any).vibrate?.(6); } catch {}
        track(GOALS.favoriteToggle, { on: next });
      }}
      data-iata={entry.iata}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`press fav-heart${on ? ' fav-heart--on' : ''}`}
    >
      {/* Один и тот же контур: при включении заливается currentColor, а не подменяется
          другим рисунком — иначе контур и заливка расходятся в геометрии и значок
          дёргается в момент нажатия. */}
      <svg width="22" height="22" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'}
           stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
      </svg>
    </button>
  );
}
