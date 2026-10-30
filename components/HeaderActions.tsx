'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isFavorite, toggleFavorite, subscribeFavorites } from '@/lib/favorites';
import { useTranslations } from 'next-intl';
import { GOALS, track } from '@/lib/track';
import type { Locale } from '@/lib/i18n';

/**
 * Две круглые кнопки по бокам названия в шапке: «Поделиться» слева, избранное справа.
 *
 * Сердце ЗНАЕТ, где оно стоит. На странице аэропорта это переключатель: добавляет
 * именно этот аэропорт и заливается, когда он уже в списке. На всех остальных —
 * ссылка на сам список. Иначе пришлось бы держать две одинаковые на вид кнопки в
 * двух сантиметрах друг от друга (так и было до 28.10.2026: одна в шапке, другая в
 * карточке аэропорта), и человек нажимал бы не ту.
 *
 * Код аэропорта берётся из адреса, а не из пропса: шапка живёт в раскладке и о
 * странице ничего не знает. Город и название подтягиваются одним бесплатным запросом
 * в каталог В МОМЕНТ ДОБАВЛЕНИЯ — без них список показывал бы «KZN KZN» вместо
 * «KZN Казань». К поставщику рейсов этот путь не ходит.
 *
 * Для поиска это +1 ссылка на страницу (и только там, где сердце — ссылка), а НАБОР
 * адресов не меняется: на /favorites уже ведёт нижняя панель.
 */
/** slot: какую из двух кнопок рисовать. Две отдельные вставки, а не одна пара,
 *  потому что между ними в сетке стоит название сайта. */
export function HeaderActions({ locale, slot }: { locale: Locale; slot: 'share' | 'fav' }) {
  const t = useTranslations('ui');
  const tNav = useTranslations('nav');
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  // Строгое совпадение с адресом борта: /<язык>/airport/<КОД>, без подстраниц
  // прилётов и вылетов — там сердце тоже уместно, поэтому хвост разрешён.
  const iata = pathname.match(new RegExp(`^/${locale}/airport/([A-Z0-9]{3})(?:/|$)`))?.[1] ?? null;
  const [on, setOn] = useState(false);
  const onMap = pathname === `/${locale}/flight-map`;

  useEffect(() => {
    if (!iata) return;
    const sync = () => setOn(isFavorite(iata));
    sync();
    return subscribeFavorites(sync);
  }, [iata]);

  const toggleFav = useCallback(async () => {
    if (!iata) return;
    const next = toggleFavorite({ iata });
    setOn(next);
    try { (navigator as unknown as { vibrate?: (ms: number) => void }).vibrate?.(6); } catch { /* нет мотора */ }
    track(GOALS.favoriteToggle, { on: next });
    if (!next) return;
    // Дополняем запись городом и названием. Запрос в каталог аэропортов бесплатный
    // (см. app/api/airports/search): он читает справочник, а не борт.
    try {
      const r = await fetch(`/api/airports/search?locale=${locale}&q=${iata}`);
      const a = (await r.json())?.airports?.find((x: { iata: string }) => x.iata === iata);
      if (a && isFavorite(iata)) {
        toggleFavorite({ iata });
        toggleFavorite({ iata, name: a.name, city: a.city, iso2: a.iso2 });
      }
    } catch { /* остался код — список покажет его одного */ }
  }, [iata, locale]);

  /**
   * Телефон отдаёт системное меню, компьютер копирует ссылку. Запасной путь через
   * выделенный textarea нужен для встроенных браузеров приложений, где Clipboard API
   * запрещён: без него кнопка молча не делала бы ничего. Тот же порядок, что у
   * «Поделиться рейсом» в карточке — расходиться им незачем.
   */
  const share = useCallback(async () => {
    const url = `${location.origin}${location.pathname}`;
    const title = document.title;
    if (navigator.share) {
      try { await navigator.share({ title, url }); track(GOALS.pageShare, { via: 'share' }); return; }
      catch (e) { if ((e as Error)?.name === 'AbortError') return; /* закрыл меню — не ошибка */ }
    }
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch { /* ниже запасной путь */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* совсем некуда — ниже покажем ссылку */ }
    }
    if (!ok) { window.prompt(tNav('share'), url); track(GOALS.pageShare, { via: 'prompt' }); return; }
    track(GOALS.pageShare, { via: 'copy' });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tNav]);

  /**
   * Карта перелётов отдаёт шапке свои два действия: «Ваша история» слева и «+»
   * справа. Своей строки заголовка у страницы больше нет — она занимала экран
   * ради слов, которые и так написаны во вкладке и в нижней панели.
   *
   * Нажатие ПЕРЕАДРЕСУЕТСЯ кнопке внутри страницы, а не вызывает движок карты
   * напрямую: он связывает обработчики только внутри своего корня, и шапка,
   * которая живёт в раскладке, ему не видна. Пока движок не поднялся, кнопка
   * внутри страницы выключена — нажатие просто ничего не делает, как и раньше.
   */
  if (onMap) {
    const fire = (action: 'share' | 'add') =>
      document.querySelector<HTMLButtonElement>(`.flight-map-root [data-action="${action}"]`)?.click();
    if (slot === 'share') {
      return (
        <button type="button" onClick={() => fire('share')} className="press hdr-act"
                aria-label={tNav('map_share')} title={tNav('map_share')}>
          {/* Стрелка пересылки, а не коробка со стрелкой вверх: коробка — системный
              знак iOS, и за его пределами она читается как «выгрузить», а не
              «поделиться». Стрелка знакома по Телеграму и ВК, откуда пересылка
              ссылок и приходит. Второй экземпляр глифа — у кнопки страницы ниже. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.5 6.5 20 11.5l-5.5 5" />
            <path d="M20 11.5H10.8C7 11.5 4 14.6 4 18.4" />
          </svg>
        </button>
      );
    }
    return (
      <button type="button" onClick={() => fire('add')} className="press hdr-act"
              aria-label={tNav('map_add')} title={tNav('map_add')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    );
  }

  // Обе кнопки относятся к ОТКРЫТОМУ аэропорту, поэтому вне его страницы их нет.
  // Пустышка, а не null: сетка шапки рассчитана на три ячейки, и без боковых
  // название перестало бы стоять по центру.
  if (!iata) return <span />;

  if (slot === 'fav') {
    const label = on ? t('fav_remove') : t('fav_add');
    const heart = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor"
           strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
      </svg>
    );
    // fav-heart и data-iata — те же имена, по которым скрипт в <head> заливает
    // сердце ещё до первой отрисовки (см. layout.tsx).
    return (
      <button type="button" onClick={toggleFav} aria-pressed={on} aria-label={label} title={label}
              data-iata={iata} className={`press hdr-act fav-heart${on ? ' fav-heart--on' : ''}`}>
        {heart}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="press hdr-act"
      aria-label={copied ? t('link_copied') : tNav('share')}
      title={copied ? t('link_copied') : tNav('share')}
    >
      {/* Галочка вместо стрелки на две секунды после копирования: без видимого ответа
          человек не понимает, скопировалось ли, и жмёт второй раз. */}
      {copied ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 6.5 20 11.5l-5.5 5" />
          <path d="M20 11.5H10.8C7 11.5 4 14.6 4 18.4" />
        </svg>
      )}
    </button>
  );
}
