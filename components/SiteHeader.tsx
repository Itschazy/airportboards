'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

/**
 * Шапка сайта: только название.
 *
 * Здесь стояли ещё две пилюли — тема и выбор языка. С 28.10.2026 и то и другое живёт на
 * своей странице /settings, куда ведёт нижняя панель навигации. Причина не в красоте:
 * на 320px три пилюли в ряд требовали всей ширины экрана до последнего пикселя, и каждая
 * правка шапки упиралась в этот расчёт. Остался один элемент, и расчёта больше нет.
 *
 * Для поиска это НИЧЕГО не меняет, и это проверено сверкой НАБОРА адресов, а не их числа.
 * На главной вторая ссылка на тот же адрес ничего не добавляла: двенадцать корней локалей
 * и так лежат в подвале. А вот на ВНУТРЕННЕЙ странице меню было единственным местом, где
 * стояли ссылки на её же версии в других языках (/de/airport/KZN с /ru/airport/KZN), и
 * замер поймал пропажу ровно двенадцати адресов. Их вернул components/LocaleLinks.tsx —
 * ряд в самой странице, над подвалом. После этого набор уникальных href совпал до единого
 * на /ru, /en и странице аэропорта.
 *
 * На главной шапки нет вовсе. Прежде там стояла пустышка, державшая сетку из трёх ячеек;
 * ячеек больше нет, а название в шапке на главной не нужно — прямо под ней стоит крупная
 * подпись с тем же словом, и ссылка вела бы на страницу, где мы уже находимся.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  if (pathname === `/${locale}` || pathname === `/${locale}/`) return null;

  return (
    <header className="site-header">
      <div className="hdr-row">
        {/* Кегли и поля заданы в CSS через clamp: размер следует за шириной экрана. */}
        <Link href={`/${locale}`} className="hdr-pill" style={{
          fontWeight: 700, color: 'var(--ab-ffffff)', letterSpacing: '-0.01em',
          gap: 'clamp(5px, 2vw, 8px)', minWidth: 0,
        }}>
          <span className="hdr-plane" aria-hidden="true">✈</span>
          <span className="hdr-wordmark">airportsboard</span>
        </Link>
      </div>
    </header>
  );
}
