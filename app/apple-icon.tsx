import { ImageResponse } from 'next/og';
import { BrandIcon } from '@/lib/brand-icon';

// 180px для закладок и экрана Домой iOS, без прежнего градиента.
// Путь сохранён: его используют metadata Next и установленные приложения.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(<BrandIcon size={size.width} />, { ...size });
}
