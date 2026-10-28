'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n';

/**
 * Нижняя панель навигации: поиск, избранное, настройки.
 *
 * ЕСТЬ В СЕРВЕРНОМ HTML с первого кадра. Прежде она ждала чтения localStorage и до
 * него не рисовалась вовсе: избранного на сервере не знают, а значок «Избранное»
 * заливается, когда в списке что-то есть. Из-за этого главная навигация появлялась
 * заметно позже самой страницы. Теперь ждёт ТОЛЬКО заливка значка: панель рисуется
 * сразу, пустым сердцем, и после гидратации оно наливается у того, у кого избранное
 * не пусто. Ни один размер при этом не меняется, поэтому вёрстка не дёргается.
 *
 * ЧЕГО ЭТО СТОИТ ДЛЯ ПОИСКА. Три ссылки в HTML каждой страницы, две из которых ведут
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


  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isFav = pathname === `/${locale}/favorites`;
  const isSet = pathname === `/${locale}/settings`;

  return (
    <nav className="bottomnav" aria-label={t('aria_bottom')}>
      <div className="bn-pill">
        <Link href={`/${locale}`} className={`press bn-item${isHome ? ' bn-item--on' : ''}`} aria-current={isHome ? 'page' : undefined}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M16.2 16.2 21 21" />
          </svg>
          <span className="bn-label">{t('search')}</span>
        </Link>

        <Link href={`/${locale}/favorites`} className={`press bn-item${isFav ? ' bn-item--on' : ''}`} aria-current={isFav ? 'page' : undefined}>
          {/* Залито у ВЫБРАННОГО пункта, у остальных — контур. Прежде сердце
              заливалось при непустом избранном, и на любой странице сайта горели
              сразу два «выбранных» значка. Заодно исчезла единственная причина
              мигания: выбранность знает сервер, а содержимое хранилища — нет. */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
          </svg>
          <span className="bn-label">{t('favorites')}</span>
        </Link>

        <Link href={`/${locale}/settings`} className={`press bn-item${isSet ? ' bn-item--on' : ''}`} aria-current={isSet ? 'page' : undefined}>
          {/* Ползунки вместо шестерни. Шестерня на 26px разваливалась: с мелкими
              зубцами залитая читалась кругом, с крупными — колючей звездой. У
              ползунков нет мелких деталей вовсе — две линии и две точки, поэтому
              значок узнаётся и в 26px, и в 18. Залитое состояние тоже выходит само
              собой: заливка попадает в кружки, а полозья остаются линиями. */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill={isSet ? 'currentColor' : 'none'}
               stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M3.5 8.5h4.2M12.3 8.5h8.2" />
            <path d="M3.5 15.5h8.2M16.3 15.5h4.2" />
            <circle cx="10" cy="8.5" r="2.3" />
            <circle cx="14" cy="15.5" r="2.3" />
          </svg>
          <span className="bn-label">{t('settings')}</span>
        </Link>
      </div>
    </nav>
  );
}
