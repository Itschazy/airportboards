'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GOALS, track } from '@/lib/track';
import type { Locale } from '@/lib/i18n';

/**
 * Две круглые кнопки по бокам названия в шапке: «Поделиться» слева, избранное справа.
 *
 * Клиентский компонент только ради «Поделиться» — оно трогает navigator.share и буфер
 * обмена. Сердце рядом с ним обычная ссылка и могло бы остаться серверной, но тогда
 * пришлось бы заводить второй компонент ради одной строки разметки.
 *
 * Для поиска это +1 ссылка на страницу, и НАБОР адресов не меняется: на /favorites уже
 * ведёт нижняя панель. То есть вес страницы распределяется между теми же адресами.
 */
/** slot: какую из двух кнопок рисовать. Две отдельные вставки, а не одна пара,
 *  потому что между ними в сетке стоит название сайта. */
export function HeaderActions({ locale, slot }: { locale: Locale; slot: 'share' | 'fav' }) {
  const t = useTranslations('ui');
  const tNav = useTranslations('nav');
  const [copied, setCopied] = useState(false);

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

  if (slot === 'fav') {
    return (
      <Link href={`/${locale}/favorites`} className="press hdr-act" aria-label={tNav('favorites')} title={tNav('favorites')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21C12 21 3 14.6 3 8.9C3 6.1 5.2 4 8 4c1.7 0 3.2 0.9 4 2.3C12.8 4.9 14.3 4 16 4c2.8 0 5 2.1 5 4.9c0 5.7-9 12.1-9 12.1z" />
        </svg>
      </Link>
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
          <path d="M12 15.5V3.5" />
          <path d="M8 7.2 12 3.2l4 4" />
          <path d="M5 13v5.6A1.4 1.4 0 0 0 6.4 20h11.2a1.4 1.4 0 0 0 1.4-1.4V13" />
        </svg>
      )}
    </button>
  );
}
