'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DisclosureArrow } from './DisclosureArrow';
import { locales, localeNames, localeFlags, rtlLocales, type Locale } from '@/lib/i18n';

/**
 * Настройки списком групп с раскрывающимися строками.
 *
 * Строй списка — из «Кабинета отложки»: группа-карточка, волосяная линия между строками,
 * подпись группы мелкими прописными. Раскрытие на <details>, поэтому содержимое всех
 * разделов лежит в разметке и в закрытом виде: ссылки на двенадцать языков и на правовые
 * страницы обходчик видит, не нажимая ничего.
 *
 * Разделов четыре, и выбран каждый по делу:
 *   тема и язык — то, что человек действительно меняет;
 *   часовой пояс — не переключатель, а объяснение (см. ниже);
 *   документы — правовые страницы, которым в подвале тесно.
 */
export function SettingsControls({ locale }: { locale: Locale }) {
  const t = useTranslations('nav');
  const tLegal = useTranslations('legal');
  const [zone, setZone] = useState<string | null>(null);
  // Список языков живёт в <dialog>: на телефоне это шторка снизу, на широком
  // экране — окно по центру. Раскрытие прямо в плитке раздвигало страницу и
  // уводило нижние разделы за край, а на широком экране список из двенадцати
  // строк занимал пол-страницы.
  const langRef = useRef<HTMLDialogElement>(null);

  // Пояс читателя и его смещение. Только для показа: ни одно время на сайте от него
  // не зависит, и в этом весь смысл раздела — снять вопрос, не обманув.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const off = -new Date().getTimezoneOffset();
      const sign = off < 0 ? '−' : '+';
      const h = Math.floor(Math.abs(off) / 60);
      const m = Math.abs(off) % 60;
      setZone(`${tz} · UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`);
    } catch { /* редкий движок без Intl — строка просто не появится */ }
  }, []);

  // Состояния темы у компонента нет вовсе: что показать, решает CSS по data-theme,
  // который выставлен ещё до первого кадра. Здесь остаётся только запись выбора.
  const applyTheme = (next: 'light' | 'dark') => {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ab_theme', next); } catch { /* приватный режим: тема до перезагрузки */ }
  };

  const docs = [
    { href: `/${locale}/about`, label: tLegal('about') },
    { href: `/${locale}/contact`, label: tLegal('contact') },
    { href: `/${locale}/privacy`, label: tLegal('privacy') },
    { href: `/${locale}/terms`, label: tLegal('terms') },
  ];

  return (
    <>
      {/* Тема и язык — двумя крупными плитками в ряд, а не строками списка.
          Это два самых частых действия на странице. Подпись сверху называет, что
          меняют, крупный значок под ней показывает состояние быстрее слов: солнце
          или луна — какая тема сейчас, флаг — какой язык. Тема переключается прямо по нажатию: вариантов два, прятать
          их за раскрытием незачем. Язык раскрывает ряд из двенадцати под плитками
          во всю ширину. */}
      <div className="set-tiles">
        {/* Значок и подпись темы — ОБА варианта в разметке, нужный выбирает CSS.
            Раньше их выбирал React по своему состоянию, а состояние появляется только
            после гидратации: у человека со светлой темой сначала висела луна, а подпись
            «Светлая» не показывалась вовсе — её нечем было заполнить. Скрипт в <head>
            ставит data-theme до первого кадра, поэтому правило ниже срабатывает сразу,
            и мигания нет. Тем же приёмом залито сердце в нижней панели.

            Текущее значение читается из DOM прямо в обработчике, а не из состояния:
            состояние для этого больше не нужно вовсе. */}
        <button
          type="button"
          className="press set-tile"
          onClick={() => {
            const root = document.documentElement;
            const light = root.dataset.theme === 'light'
              || (!root.dataset.theme && matchMedia('(prefers-color-scheme: light)').matches);
            applyTheme(light ? 'dark' : 'light');
          }}
        >
          <span className="set-tile-t">{t('theme')}</span>
          <span className="set-tile-ico" aria-hidden="true">
            <span className="tv-dark">
              <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.4 14.3A8.6 8.6 0 0 1 9.7 3.6a8.9 8.9 0 1 0 10.7 10.7z" />
              </svg>
            </span>
            <span className="tv-light">
              <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.4" />
                <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
              </svg>
            </span>
          </span>
          <span className="set-tile-v">
            <span className="tv-dark">{t('theme_dark')}</span>
            <span className="tv-light">{t('theme_light')}</span>
          </span>
        </button>

        <button
          type="button"
          className="press set-tile"
          aria-haspopup="dialog"
          aria-controls="set-langs"
          onClick={() => langRef.current?.showModal()}
        >
          <span className="set-tile-t">{t('language')}</span>
          <span className="set-tile-ico locale-flag" aria-hidden="true">{localeFlags[locale]}</span>
          <span className="set-tile-v">{localeNames[locale]}</span>
        </button>

        {/* Окно есть в разметке всегда, закрытым: ссылки на двенадцать языков
            остаются в исходном HTML, как и было при раскрытии на месте.
            Закрытие по фону — свой обработчик: клик по ::backdrop приходит самому
            <dialog>, и отличить его от клика по содержимому можно только так. */}
        <dialog
          ref={langRef}
          id="set-langs"
          className="lang-dialog"
          aria-label={t('language')}
          onClick={e => { if (e.target === langRef.current) langRef.current?.close(); }}
        >
          <div className="sheet-handle" aria-hidden="true" />
          <div className="lang-head">
            <h2>{t('language')}</h2>
            <button type="button" className="lang-close" aria-label={t('close')} onClick={() => langRef.current?.close()}>×</button>
          </div>
          <ul className="set-langs">
            {locales.map(loc => (
              <li key={loc}>
                {/* lang и dir стоят на САМОМ НАЗВАНИИ, а не на плитке: «العربية» внутри
                    русской страницы иначе читается программой чтения с экрана правилами
                    русского языка. На плитке dir="rtl" ещё и переворачивал раскладку —
                    у одной строки из двенадцати флаг уезжал к правому краю, и столбец
                    флагов ломался. Направление нужно тексту, а не коробке. */}
                <Link
                  href={`/${loc}/settings`}
                  hrefLang={loc}
                  lang={loc}
                  className={`set-lang${loc === locale ? ' set-lang--on' : ''}`}
                  aria-current={loc === locale ? 'true' : undefined}
                >
                  <span aria-hidden="true" className="locale-flag">{localeFlags[loc]}</span>
                  <bdi lang={loc} dir={rtlLocales.includes(loc) ? 'rtl' : 'ltr'}>{localeNames[loc]}</bdi>
                </Link>
              </li>
            ))}
          </ul>
        </dialog>
      </div>

      <div className="sg-h">{t('timezone')}</div>
      <div className="sg">
        <details className="sdet">
          <summary>
            <span className="srow-t">{t('tz_yours')}</span>
            {/* suppressHydrationWarning: пояс известен только браузеру, и сервер
                рисует строку пустой. Это единственное расхождение, и оно намеренное. */}
            <span className="srow-v" suppressHydrationWarning>{zone || ''}</span>
            <DisclosureArrow className="srow-chev" />
          </summary>
          <div className="sdet-body">
            <p>{t('tz_rule')}</p>
          </div>
        </details>
      </div>

      <div className="sg-h">{t('documents')}</div>
      <div className="sg">
        {docs.map(d => (
          <Link key={d.href} href={d.href} className="srow">
            <span className="srow-t">{d.label}</span>
            <svg data-flip className="srow-chev" width="7" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 5.5 16 12l-6.5 6.5" />
            </svg>
          </Link>
        ))}
      </div>
    </>
  );
}
