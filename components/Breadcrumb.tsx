import Link from 'next/link';

export type Crumb = { name: string; item: string };

/**
 * The visible counterpart to a BreadcrumbList.
 *
 * The arrivals and departures subpages were emitting a five-level BreadcrumbList — Home →
 * Country → City → Airport → Arrivals — while their HTML contained 45 links, none of which
 * pointed at an airport, a city or a route. Not even at the parent airport page, and not at
 * the sibling board (the mode switch is a <button>). So the structured data described a
 * hierarchy that existed nowhere on the page, and a crawler arriving on one of ~2,200
 * indexable subpages had no way further into the site.
 *
 * Rendering the same trail the schema already computes fixes both halves at once: the claim
 * becomes true, and the links become real.
 *
 * The last crumb is the current page, so it is text rather than a link.
 */
export function Breadcrumb({ trail, extra, label }: { trail: Crumb[]; extra?: { href: string; label: string } | null; label: string }) {
  if (trail.length < 2) return null;
  const path = trail.slice(0, -1);
  const current = trail[trail.length - 1];
  return (
    /* Крошки — стеклянная капсула, как остальные элементы управления. Прежде
       это была строка серого текста прямо на обоях: на пёстром фоне она едва
       читалась, а разделителем служил символ «›», который рисуется шрифтом и
       висит выше базовой линии. Теперь разделитель векторный, а текущая
       страница выделена цветом и весом, а не только оттенком. */
    <nav aria-label={label} className="crumbs-wrap">
      <ol className="crumbs glass">
        {path.map(c => (
          <li key={c.item}>
            <Link href={c.item}>{c.name}</Link>
            <svg data-flip width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9.5 5.5 16 12l-6.5 6.5" />
            </svg>
          </li>
        ))}
        <li aria-current="page" className="crumbs-current">{current.name}</li>
        {/* Соседняя ссылка идёт в строке после текущей крошки. marginInlineStart:auto
            уводил её к дальнему краю, и на телефоне она переносилась на свою
            строку одинокой справа — это читалось как сломанная вёрстка. */}
        {extra && (
          <li>
            <span aria-hidden="true" style={{ opacity: 0.45 }}>·</span>
            <Link href={extra.href}>{extra.label}</Link>
          </li>
        )}
      </ol>
    </nav>
  );
}
