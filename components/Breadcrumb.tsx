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
export function Breadcrumb({ trail, extra }: { trail: Crumb[]; extra?: { href: string; label: string } | null }) {
  if (trail.length < 2) return null;
  const path = trail.slice(0, -1);
  const current = trail[trail.length - 1];
  return (
    <nav aria-label="Breadcrumb" style={{ maxWidth: 960, margin: '0 auto', padding: '10px 16px 0' }}>
      <ol style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
        listStyle: 'none', margin: 0, padding: 0, fontSize: 12, color: '#8A8A8A',
      }}>
        {path.map(c => (
          <li key={c.item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href={c.item} style={{ color: '#8A8A8A', textDecoration: 'none' }}>{c.name}</Link>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li aria-current="page" style={{ color: '#C7C7C7' }}>{current.name}</li>
        {extra && (
          <li style={{ marginInlineStart: 'auto' }}>
            <Link href={extra.href} style={{ color: '#8A8A8A' }}>{extra.label}</Link>
          </li>
        )}
      </ol>
    </nav>
  );
}
