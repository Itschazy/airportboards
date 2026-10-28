import { DisclosureArrow } from '@/components/DisclosureArrow';
import type { ReactNode } from 'react';

/**
 * Рама подвала: одна подпись, под которой свёрнуто всё остальное.
 *
 * Больше НЕ клиентский компонент. Раньше здесь висел usePathname: подвал был свёрнут
 * только на главной, а на остальных страницах разворачивался целиком, и отличить одно
 * от другого можно было лишь на клиенте. С 28.10.2026 он свёрнут везде, различать
 * нечего — ушли и 'use client', и подписка на маршрут, а с ними и лишний JS.
 *
 * Для поиска ничего не меняется: <details> ничего не удаляет из разметки, все 65 ссылок
 * приходят в серверном HTML и доступны обходчику в закрытом состоянии.
 *
 * Разделительной линии сверху нет: внизу окна обои и так растворяются в цвет фона, и
 * полоса поверх этого растворения читалась как шов.
 */
export function SiteFooterFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    // Отступ один на всех страницах. Прежние 20px сверху на внутренних страницах
    // отрывали подпись от кнопки «Полезная информация», стоящей прямо над ней.
    <footer style={{ marginTop: 'auto', padding: '8px 18px 18px' }}>
      <details className="airport-disclosure home-footer-reference">
        <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, cursor: 'pointer', color: 'var(--ab-8a8a8a)', fontSize: 13 }}>
          {label}<DisclosureArrow />
        </summary>
        <div style={{ padding: '20px 0' }}>{children}</div>
      </details>
      {/* Сверху ничего не добавляем: подпись высотой 44px при тексте в 13 уже
          несёт около 15px пустоты снизу, и вместе с отступом строки получался
          провал. */}
      {/* Флаги локалей рисует свой шрифт на основе Twemoji: в Windows глифов
          флагов нет вовсе, и без него список языков оставался без значков.
          Twemoji под CC BY 4.0, а она требует указать автора ТАМ, ГДЕ работа
          используется, — то есть на странице, а не в комментарии к стилям.
          Строка намеренно без перевода: это имя и код лицензии, они одинаковы
          на всех двенадцати языках, и новых ключей каталога не заводится. */}
      <p className="wall-text" style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center', fontSize: 11, color: 'var(--ab-5a5a5a)', letterSpacing: '0.02em' }}>
        airportsboard.live · © 2026 · <span style={{ whiteSpace: 'nowrap' }}>Twemoji · CC BY 4.0</span>
      </p>
    </footer>
  );
}
