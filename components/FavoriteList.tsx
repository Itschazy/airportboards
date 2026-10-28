'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { removeFavorite } from '@/lib/favorites';
import { useFavorites } from './use-favorites';

type Counts = Record<string, { dep: number | null; arr: number | null }>;

/**
 * Список избранного: строки того же вида, что «Популярные аэропорты» на главной.
 *
 * Своего заголовка у блока нет. Он тут был — и стоял прямо под заголовком первого уровня
 * «Избранное», слово в слово повторяя его; страница сообщала одно и то же дважды подряд.
 *
 * Счётчики рейсов берутся из того же /api/airports/counts, что и на главной. Этот путь
 * НИКОГДА не тратит квоту поставщика: он только читает хранилище (см. комментарий в самом
 * обработчике). Ограничение там — двенадцать кодов за запрос, а избранного бывает до
 * двадцати, поэтому коды идут частями.
 *
 * Строки подписей приходят пропсами, а не из useTranslations: заголовки живут в
 * пространстве `home`, а его на клиент не передают (lib/client-messages.ts).
 */
export function FavoriteList({ locale, title, empty, depLabel, arrLabel }: {
  locale: string;
  /** Заголовок пустой страницы — «Избранные аэропорты». */
  title: string;
  /**
   * Объяснение «как добавить». Живёт ТОЛЬКО в заглушке пустого списка и исчезает
   * вместе с ней, как только добавлен первый аэропорт: дальше оно рассказывает
   * человеку то, что он уже сделал. Раскрывашка «Как добавить» под списком, которая
   * стояла здесь до 28.10.2026, занимала строку на пустом месте у всех.
   */
  empty: string;
  depLabel: string;
  arrLabel: string;
}) {
  const t = useTranslations('ui');
  const { favorites, ready } = useFavorites();
  const [counts, setCounts] = useState<Counts>({});

  const codes = favorites.map(a => a.iata).join(',');
  useEffect(() => {
    if (!codes) return;
    const chunks: string[][] = [];
    const all = codes.split(',');
    for (let i = 0; i < all.length; i += 12) chunks.push(all.slice(i, i + 12));
    let alive = true;
    Promise.all(chunks.map(ch =>
      fetch(`/api/airports/counts?codes=${ch.join(',')}`).then(r => r.json()).catch(() => ({})),
    )).then(parts => {
      if (alive) setCounts(Object.assign({}, ...parts));
    });
    return () => { alive = false; };
  }, [codes]);

  // До чтения хранилища не рисуем ничего: иначе у человека, у которого в избранном
  // десять аэропортов, успевает мигнуть «пока пусто».
  if (!ready) return null;

  // Пустая страница: сердце, заголовок, одна строка объяснения — по центру экрана.
  // Кнопки «Все аэропорты» здесь нет намеренно: она уводила туда, где избранное всё
  // равно не добавляют, — добавляют с борта конкретного аэропорта.
  if (favorites.length === 0) {
    return (
      <div className="fav-blank">
        {/* Контурное сердце тонкой линией: заливка на пустой странице читалась бы
            как «что-то уже есть». Круглая подложка держит значок на пёстрых обоях. */}
        <span className="fav-blank-ico" aria-hidden="true">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
          </svg>
        </span>
        <h2 className="fav-blank-t">{title}</h2>
        <p className="fav-blank-p">{empty}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="fav-grid">
        {favorites.map(a => {
          const c = counts[a.iata];
          return (
            <li key={a.iata} className="fav-item">
              <Link href={`/${locale}/airport/${a.iata}`} className="fav-link">
                <span className="fav-iata">{a.iata}</span>
                <span className="fav-city">{a.city || a.name || a.iata}</span>
                {(typeof c?.dep === 'number' || typeof c?.arr === 'number') && (
                  <span className="fav-counts">
                    {typeof c?.dep === 'number' && <span><b className="fav-dep">{c.dep}</b> {depLabel}</span>}
                    {typeof c?.arr === 'number' && <span style={{ marginInlineStart: 10 }}><b className="fav-arr">{c.arr}</b> {arrLabel}</span>}
                  </span>
                )}
              </Link>
              {/* Крестик — отдельная кнопка рядом со ссылкой, а не внутри неё:
                  вложенная в <a> кнопка даёт недопустимую разметку и на части
                  браузеров срабатывает переходом вместо удаления. */}
              <button
                type="button"
                className="fav-del press"
                aria-label={`${t('fav_remove')}: ${a.iata}`}
                title={t('fav_remove')}
                onClick={() => removeFavorite(a.iata)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
