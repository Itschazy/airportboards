import { getSitemapCount } from '@/lib/airports';

const BASE = 'https://airportsboard.live';

// Next.js `generateSitemaps` serves children at /sitemap/[id].xml but does
// NOT emit a sitemap index. This route is that index — the single URL we
// submit to Google, which then discovers every child sitemap.
export const dynamic = 'force-static';

export function GET() {
  const count = getSitemapCount();
  const children = Array.from({ length: count }, (_, id) =>
    `  <sitemap><loc>${BASE}/sitemap/${id}.xml</loc></sitemap>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children}
</sitemapindex>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
