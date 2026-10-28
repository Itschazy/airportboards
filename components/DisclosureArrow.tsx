/** Стрелка «развернуть» у <details>.
 *
 * Была символом «⌄»: шрифт рисует его мелким, смещённым от базовой линии и
 * по-разному на разных системах — рядом с подписью он выглядел случайной
 * галочкой. Вектор даёт одинаковый шеврон везде, его толщину и размер видно
 * в коде, а цвет наследуется от подписи.
 *
 * Поворот на 180° при открытии и цвет задаёт .disclosure-arrow в globals.css.
 */
/** className переопределяется там, где у стрелки своя геометрия поворота:
 *  в списке настроек это .srow-chev, и правило поворота там своё. */
export function DisclosureArrow({ className = 'disclosure-arrow' }: { className?: string } = {}) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}
