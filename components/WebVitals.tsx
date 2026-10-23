'use client';
import { useEffect } from 'react';
import { startRum } from '@/lib/rum-client';

/** Невидимый сборщик без состояния React и переводов. Буферные performance entries
 * позволяют начать после гидратации: отдельный синхронный скрипт/ресурс не задерживает
 * первый экран. Повтор эффекта в StrictMode не создаёт второй observer или отправку.
 */
export function WebVitals() {
  useEffect(() => { void startRum(); }, []);
  return null;
}
