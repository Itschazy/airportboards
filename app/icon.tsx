import { ImageResponse } from 'next/og';
import { BrandIcon } from '@/lib/brand-icon';

// 120px: рекомендация Яндекса; квадрат больше 48px для Google.
// Путь сохранён: его используют metadata Next и установленные приложения.
export const size = { width: 120, height: 120 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} />, { ...size });
}
