import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // Disallow the JSON API (/api/*) — crawling it burns budget on non-page data and
    // has no SEO value. /_next/ stays open (Google needs it to render pages).
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: 'https://airportsboard.live/sitemap.xml',
  };
}
