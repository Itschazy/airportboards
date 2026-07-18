import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    // Disallow the JSON API (/api/*) — crawling it burns budget on non-page data and
    // has no SEO value. /_next/ stays open (Google needs it to render pages).
    //
    // AI crawlers (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Applebot-Extended,
    // Google-Extended, CCBot, Bingbot) are allowed DELIBERATELY, not by omission: this site
    // wants to be cited in AI answers, and a citation sends a reader to a page carrying ads.
    // Blocking them would remove the whole point of the AEO work. Revisit only if crawl
    // volume starts costing real money — the boards themselves are served from a local
    // store, so crawler traffic does not spend airlabs quota.
    rules: { userAgent: '*', allow: '/', disallow: ['/api/'] },
    sitemap: 'https://airportsboard.live/sitemap.xml',
  };
}
