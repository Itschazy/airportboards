import { ImageResponse } from 'next/og';
import { BrandIcon } from '@/lib/brand-icon';

/**
 * 192px сохраняет устанавливаемость PWA в Chromium: одного старого значка 180px
 * недостаточно для beforeinstallprompt, на котором основан InstallPrompt.tsx.
 * Поэтому этот размер нельзя убрать как дубликат поисковой иконки 120px.
 * Изменена только отрисовка: общий вектор вместо глифа, размер и URL сохранены.
 * Проверено production-сборкой и манифестами всех 12 локалей.
 */
// Путь сохранён: его используют metadata Next и установленные приложения.
export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} />, { ...size });
}
