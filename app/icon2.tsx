import { ImageResponse } from 'next/og';
import { BrandIcon } from '@/lib/brand-icon';

// 512px для maskable PWA; safe zone задан в BrandIcon.
// Путь сохранён: его используют metadata Next и установленные приложения.
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} />, { ...size });
}
