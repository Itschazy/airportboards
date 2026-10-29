'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n';

/**
 * Память вкладок: какой адрес человек смотрел последним в каждом разделе.
 *
 * Лежит в sessionStorage, а не в localStorage, намеренно: это память ОДНОЙ
 * сессии просмотра. Вернуть человека завтра на вчерашнее табло — не услуга:
 * он уже не помнит, почему там оказался, а рейсы там давно другие.
 *
 * Разделов четыре, и всё, что не избранное, не карта и не настройки, — это
 * «Поиск»: аэропорт, маршрут, город, рейс и указатель открываются именно оттуда.
 */
const TAB_KEY = 'ab_tab_memory';
type Tab = 'search' | 'favorites' | 'map' | 'settings';

function tabOf(pathname: string): Tab {
  const rest = pathname.replace(/^\/[^/]+/, '') || '/';
  if (rest === '/favorites' || rest.startsWith('/favorites/')) return 'favorites';
  if (rest === '/flight-map' || rest.startsWith('/flight-map/')) return 'map';
  if (rest === '/settings' || rest.startsWith('/settings/')) return 'settings';
  return 'search';
}

/**
 * Нижняя панель навигации: поиск, избранное, перелёты (пока RU), настройки.
 *
 * ЕСТЬ В СЕРВЕРНОМ HTML с первого кадра. Прежде она ждала чтения localStorage и до
 * него не рисовалась вовсе: избранного на сервере не знают, а значок «Избранное»
 * заливается, когда в списке что-то есть. Из-за этого главная навигация появлялась
 * заметно позже самой страницы. Теперь ждёт ТОЛЬКО заливка значка: панель рисуется
 * сразу, пустым сердцем, и после гидратации оно наливается у того, у кого избранное
 * не пусто. Ни один размер при этом не меняется, поэтому вёрстка не дёргается.
 *
 * ЧЕГО ЭТО СТОИТ ДЛЯ ПОИСКА. Три исходные ссылки в HTML каждой страницы, две из которых ведут
 * на /favorites и /settings — адреса с noindex. Обходчик сходит туда по одному разу
 * на локаль (24 адреса на весь сайт), увидит noindex и перестанет; доля веса, уходящая
 * в эти две ссылки из примерно ста тридцати на странице, — около полутора процентов.
 * Прежде панели в HTML не было вовсе именно ради этих полутора процентов, но платой
 * была навигация, приезжающая вторым рейсом. Решение владельца 28.10.2026: панель
 * важнее. Набор адресов в карте сайта и число ссылок на индексируемые страницы при
 * этом не изменились — проверено сверкой до и после.
 *
 * Без JS панель теперь тоже работает: поиск и настройки — обычные ссылки. Избранное
 * откроется пустым, что честно: список и так лежит в localStorage.
 *
 * Место под панель держит CSS (padding-bottom у body), а не она сама.
 */
export function BottomNav({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [memory, setMemory] = useState<Partial<Record<Tab, string>>>({});
  const current = tabOf(pathname);

  // Запоминаем адрес ПОСЛЕ отрисовки: на сервере sessionStorage нет, и читать его
  // в теле компонента значило бы разойтись с серверной разметкой. Ссылки панели
  // в исходном HTML остаются корнями разделов — их и видит обходчик.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TAB_KEY);
      const map = raw ? JSON.parse(raw) as Record<string, string> : {};
      map[current] = pathname + location.search;
      sessionStorage.setItem(TAB_KEY, JSON.stringify(map));
      setMemory(map);
    } catch { /* приватный режим — просто живём без памяти */ }
  }, [pathname, current]);

  /**
   * Адрес вкладки: запомненный — только для ЧУЖОЙ вкладки. Нажатие на вкладку,
   * в которой человек уже находится, всегда возвращает в её начало: иначе из
   * глубокой страницы наверх не выбраться вовсе.
   *
   * Чужую память другого языка не берём: после смены локали путь из прошлой
   * увёл бы на страницу не на том языке.
   */
  const hrefFor = (tab: Tab, root: string) => {
    if (tab === current) return root;
    const saved = memory[tab];
    if (!saved || (saved !== `/${locale}` && !saved.startsWith(`/${locale}/`))) return root;
    return saved;
  };


  // Подсвечен РАЗДЕЛ, а не один адрес: со страницы аэропорта, маршрута или
  // города человек пришёл из «Поиска», и панель обязана показывать, где он
  // находится. Прежде на всех этих страницах не горело ни одного пункта.
  const onSearch = current === 'search';
  const onFav = current === 'favorites';
  const onMap = current === 'map';
  const onSet = current === 'settings';
  // aria-current="page" — только на самой странице: для программы чтения с
  // экрана «текущая страница» и «текущий раздел» — разные утверждения, и
  // ставить первое на ссылку, ведущую в другое место, нельзя.
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isFav = pathname === `/${locale}/favorites`;
  const isMap = pathname === `/${locale}/flight-map`;
  const isSet = pathname === `/${locale}/settings`;

  return (
    <nav className="bottomnav" aria-label={t('aria_bottom')}>
      <div className="bn-pill">
        <Link href={hrefFor('search', `/${locale}`)} prefetch={false} className={`press bn-item${onSearch ? ' bn-item--on' : ''}`} aria-current={isHome ? 'page' : undefined}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.2 16.2 21 21" />
          </svg>
          <span className="bn-label">{t('search')}</span>
        </Link>

        <Link href={hrefFor('favorites', `/${locale}/favorites`)} prefetch={false} className={`press bn-item${onFav ? ' bn-item--on' : ''}`} aria-current={isFav ? 'page' : undefined}>
          {/* Залито у ВЫБРАННОГО пункта, у остальных — контур. Прежде сердце
              заливалось при непустом избранном, и на любой странице сайта горели
              сразу два «выбранных» значка. Заодно исчезла единственная причина
              мигания: выбранность знает сервер, а содержимое хранилища — нет. */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={onFav ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
          </svg>
          <span className="bn-label">{t('favorites')}</span>
        </Link>

        {/* Журнал и его помощь теперь переведены на все 12 языков. Ссылка
            появляется после проверки полного инструмента, а не SEO-заглушек.
            Прежние иконки, цвета и поведение соседних разделов сохранены. */}
        <Link href={hrefFor('map', `/${locale}/flight-map`)} prefetch={false}
          className={`press bn-item${onMap ? ' bn-item--on' : ''}`} aria-current={isMap ? 'page' : undefined}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill={onMap ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m22 16-8-5V4.5a2 2 0 0 0-4 0V11l-8 5v2l8-2.5V20l-2 1v1l4-1 4 1v-1l-2-1v-4.5l8 2.5Z" />
          </svg>
          <span className="bn-label">{t('my_flights')}</span>
        </Link>

        <Link href={hrefFor('settings', `/${locale}/settings`)} prefetch={false} className={`press bn-item${onSet ? ' bn-item--on' : ''}`} aria-current={isSet ? 'page' : undefined}>
          {/* Шестерня: шесть зубцов, а не восемь. Восемь на 26px сливались в круг,
              когда значок залит, и в колючую звезду, когда зазор увеличивали. Шесть
              крупных зубцов глубиной 3.2 с зазором в 18° читаются шестернёй при любом
              размере, а скруглённые стыки (stroke-linejoin) снимают остроту вершин.
              Отверстие — вторым контуром той же фигуры, иначе при заливке середина
              затекает и выходит монета. */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={onSet ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"
               fillRule="evenodd" aria-hidden="true">
            <path d="M9.63 5.84 L9.63 2.49 L14.37 2.49 L14.37 5.84 L16.15 6.87 L19.05 5.19 L21.42 9.30 L18.52 10.97 L18.52 13.03 L21.42 14.70 L19.05 18.81 L16.15 17.13 L14.37 18.16 L14.37 21.51 L9.63 21.51 L9.63 18.16 L7.85 17.13 L4.95 18.81 L2.58 14.70 L5.48 13.03 L5.48 10.97 L2.58 9.30 L4.95 5.19 L7.85 6.87 Z M15.7 12 A3.7 3.7 0 1 0 8.3 12 A3.7 3.7 0 1 0 15.7 12 Z" />
          </svg>
          <span className="bn-label">{t('settings')}</span>
        </Link>
      </div>
    </nav>
  );
}
