import brand from './brand-icon.json';

/**
 * Один вектор для поисковой favicon, ICO и значков телефона. Раньше ICO содержал
 * полигон, а PNG — глиф ✈: форма различалась и Satori загружал внешний шрифт.
 * Теперь геометрия/цвета общие с scripts/gen-favicon.mjs, без текста и сети.
 * Масштаб 0.8 удерживает весь самолёт внутри круга радиусом 40% холста — safe zone
 * maskable PWA. Полный непрозрачный фон не оставляет белых углов на тёмной теме.
 * Вертикальная симметрия, расширенный фюзеляж и сплошной фон нужны для 16px:
 * диагональный тонкий глиф терялся при уменьшении. Малые размеры и маски проверены
 * на локальной production-сборке, палитра/непрозрачность — по пикселям PNG.
 * Цвет не обещает рост CTR.
 */
export function BrandIcon({ size }: { size: number }) {
  const points = brand.plane.map(([x, y]) =>
    `${50 + (x - 50) * brand.inset},${50 + (y - 50) * brand.inset}`,
  ).join(' ');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect width="100" height="100" fill={brand.background} />
      <polygon points={points} fill={brand.foreground} />
    </svg>
  );
}
