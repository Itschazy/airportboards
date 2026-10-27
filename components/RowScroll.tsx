'use client';

import { useEffect } from 'react';

/**
 * Горизонтальные ряды (.scroll-row) мышью не листались.
 *
 * Колесо даёт deltaY, а ряд прокручивается только по X — браузер такой
 * жест в горизонтальную прокрутку не переводит и вместо ряда прокручивает
 * страницу. Проверено замером: scrollLeft оставался на месте, пока
 * window.scrollY рос. Для тачпада и пальца всё работало и раньше, поэтому
 * дефект не бросался в глаза, но на мыши каталог стран шириной 3268px был
 * доступен ровно на один экран.
 *
 * Обработчик один на документ, а не на каждый ряд: рядов на странице
 * несколько, часть появляется при раскрытии справки, и подписка на каждый
 * потребовала бы следить за их появлением.
 *
 * Прокрутку перехватываем, только пока ряду есть куда ехать. На краю событие
 * не трогаем — иначе колесо упиралось бы в ряд и страница переставала
 * прокручиваться. Горизонтальные жесты (deltaX, тачпад) не трогаем вовсе.
 */
export function RowScroll() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;                       // масштабирование страницы
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const row = (e.target as Element | null)?.closest?.('.scroll-row') as HTMLElement | null;
      if (!row) return;
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 1) return;
      const next = row.scrollLeft + e.deltaY;
      if (next < 0 || next > max) return;          // край: отдаём колесо странице
      row.scrollLeft = next;
      e.preventDefault();
    };
    /* Ползунок виден, только пока рядом пользуются: прокрутка, колесо или
       курсор над ним. Через 1,1 с покоя гаснет, после ухода курсора — через
       0,25 с. Класс снимается по таймеру на каждый ряд отдельно, поэтому
       соседние ряды не гасят друг друга. */
    const timers = new WeakMap<HTMLElement, number>();
    const show = (row: HTMLElement, delay: number) => {
      row.classList.add('sc-on');
      const prev = timers.get(row);
      if (prev) clearTimeout(prev);
      timers.set(row, window.setTimeout(() => row.classList.remove('sc-on'), delay));
    };
    const rowOf = (e: Event) =>
      (e.target as Element | null)?.closest?.('.scroll-row') as HTMLElement | null;

    const onActive = (e: Event) => { const r = rowOf(e); if (r) show(r, 1100); };
    const onLeave = (e: Event) => { const r = rowOf(e); if (r) show(r, 250); };

    /* Перетаскивание ряда мышью, как у слайдера.
     *
     * Только мышь и перо: палец и так панорамирует ряд родной прокруткой, и
     * перехват ломал бы инерцию. Тащить начинаем не сразу, а после 4px —
     * иначе обычный щелчок по карточке превращался бы в микро-рывок.
     *
     * После перетаскивания гасим ближайший click: иначе отпускание пальца над
     * карточкой уводило бы на страницу аэропорта, хотя человек просто листал.
     * Снап на время перетаскивания выключаем — он тянет ряд назад под курсором. */
    let drag: { row: HTMLElement; startX: number; startLeft: number; moved: boolean } | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      const row = rowOf(e);
      if (!row || row.scrollWidth - row.clientWidth <= 1) return;
      drag = { row, startX: e.clientX, startLeft: row.scrollLeft, moved: false };
    };

    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) < 4) return;
        drag.moved = true;
        drag.row.classList.add('sc-drag');
        drag.row.setPointerCapture?.(e.pointerId);
      }
      drag.row.scrollLeft = drag.startLeft - dx;
      show(drag.row, 1100);
      e.preventDefault();
    };

    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const { row, moved } = drag;
      drag = null;
      row.releasePointerCapture?.(e.pointerId);
      row.classList.remove('sc-drag');
      if (!moved) return;
      const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
      row.addEventListener('click', swallow, { capture: true, once: true });
      /* Снимаем ловушку через 250мс, а не в следующем тике: click приходит
         ПОСЛЕ pointerup, и таймер на 0 успевал убрать её раньше — карточка
         открывалась, хотя человек просто листал ряд. Поймано на проверке. */
      setTimeout(() => row.removeEventListener('click', swallow, { capture: true }), 250);
    };

    /* Карточки — ссылки, и браузер на них запускает СВОЁ перетаскивание
       (то, которым ссылку бросают в адресную строку). Оно перехватывает
       указатель, и наш обработчик переставал получать pointermove: тянуть
       получалось только за промежутки между карточками. Отменяем его. */
    const onDragStart = (e: DragEvent) => { if (rowOf(e)) e.preventDefault(); };

    document.addEventListener('dragstart', onDragStart);
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onUp, { passive: true });

    // passive: false — иначе preventDefault() игнорируется
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('scroll', onActive, { capture: true, passive: true });
    document.addEventListener('wheel', onActive, { passive: true });
    document.addEventListener('pointermove', onActive, { passive: true });
    document.addEventListener('pointerleave', onLeave, { capture: true, passive: true });
    return () => {
      document.removeEventListener('dragstart', onDragStart);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('scroll', onActive, { capture: true });
      document.removeEventListener('wheel', onActive);
      document.removeEventListener('pointermove', onActive);
      document.removeEventListener('pointerleave', onLeave, { capture: true });
    };
  }, []);

  return null;
}
