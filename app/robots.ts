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
    //
    // AdsBot is shut out BY NAME — Google's crawlers of this class ignore the `*` group, which
    // is why nothing ever restrained it. Search Console crawl stats, 90 days to 16.10.2026:
    // 183K requests, AdsBot 78%, the indexing smartphone Googlebot 2% (~40 a day). Its only
    // job is checking Google Ads landing pages, and this site runs no Google Ads campaign
    // (owner, 16.10.2026), so every one of those requests was load on a single VDS whose
    // responsiveness sets how much Googlebot is willing to crawl.
    //
    // Mediapartners-Google is the AdSense crawler, a different agent with a different job:
    // it is listed explicitly as allowed so that no future edit of the AdsBot group can be
    // read as touching it. If a Google Ads campaign is ever started, delete the AdsBot group
    // first — ads to a landing page AdsBot cannot fetch get disapproved.
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      { userAgent: ['AdsBot-Google', 'AdsBot-Google-Mobile'], disallow: '/' },
      { userAgent: 'Mediapartners-Google', allow: '/' },
    ],
    sitemap: 'https://airportsboard.live/sitemap.xml',
  };
}
