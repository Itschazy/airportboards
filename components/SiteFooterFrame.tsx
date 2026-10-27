'use client';

import { usePathname } from 'next/navigation';
import { DisclosureArrow } from '@/components/DisclosureArrow';
import type { ReactNode } from 'react';

/** Только главная использует компактный подвал по просьбе владельца.
 * Контент остаётся серверным children: каталоги и переводы не попадают в JS,
 * все ссылки есть уже в HTML закрытого details. usePathname нужен также при
 * клиентском переходе с главной на табло: там сохраняется прежний полный подвал.
 */
export function SiteFooterFrame({ locale, label, children }: { locale: string; label: string; children: ReactNode }) {
  const pathname = usePathname();
  const home = pathname === `/${locale}` || pathname === `/${locale}/`;
  // Разделительной линии нет: внизу окна обои и так растворяются в цвет фона,
  // и полоса поверх этого растворения читалась как шов.
  return (
    <footer style={{ marginTop: 'auto', padding: home ? '8px 18px 18px' : '32px 18px 28px' }}>
      {home ? (
        <details className="airport-disclosure home-footer-reference">
          <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, cursor: 'pointer', color: 'var(--ab-8a8a8a)', fontSize: 13 }}>
            {label}<DisclosureArrow />
          </summary>
          <div style={{ padding: '20px 0' }}>{children}</div>
        </details>
      ) : children}
      {/* На главной сверху ничего не добавляем: подпись «О нас» высотой 44px
          при тексте в 13 уже несёт около 15px пустоты снизу, и вместе с
          отступом строки получался провал. На остальных страницах над ней
          идёт содержимое подвала, там отступ нужен. */}
      {/* Флаги локалей рисует свой шрифт на основе Twemoji: в Windows глифов
          флагов нет вовсе, и без него список языков оставался без значков.
          Twemoji под CC BY 4.0, а она требует указать автора ТАМ, ГДЕ работа
          используется, — то есть на странице, а не в комментарии к стилям.
          Строка намеренно без перевода: это имя и код лицензии, они одинаковы
          на всех двенадцати языках, и новых ключей каталога не заводится. */}
      <p style={{ maxWidth: 1000, margin: home ? '0 auto' : '10px auto 0', textAlign: 'center', fontSize: 11, color: 'var(--ab-5a5a5a)', letterSpacing: '0.02em' }}>
        airportsboard.live · © 2026 · <span style={{ whiteSpace: 'nowrap' }}>Twemoji · CC BY 4.0</span>
      </p>
    </footer>
  );
}
