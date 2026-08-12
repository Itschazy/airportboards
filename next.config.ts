import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Build somewhere else, then swap — see scripts/swap-build.mjs.
  //
  // On 2026-08-05 the site was down for 11.5 hours because `next build` writes into the very
  // directory the running server reads from. The deploy's SSH session hit appleboy/ssh-action's
  // 10-minute ceiling and was killed mid-build, leaving `.next` half-written under a live
  // process; `pm2 restart` comes after the build in the deploy script, so it never ran, and the
  // app died on the next chunk it could not read. Every route answered 502.
  //
  // With this, a killed or failed build touches only the staging directory. The live `.next` is
  // replaced by a rename that takes milliseconds, and only once the build has actually finished.
  // A slow deploy becomes a slow deploy instead of an outage.
  //
  // `next start` reads this same config with the variable unset, so it serves `.next` — which is
  // exactly what the swap put there.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Drop the `X-Powered-By: Next.js` header — leaks the stack, no benefit.
  poweredByHeader: false,
  // Force blocking (non-streaming) metadata for EVERY user-agent. Next 15 streams
  // <head> metadata into the <body> for non-bot UAs (and even the main Googlebot,
  // which it trusts to hoist via JS). On a cache-miss/dynamic render of our SSR
  // flight pages that pushes canonical + hreflang + title out of <head> — where
  // crawlers that don't run JS (and Google's first indexing wave) simply ignore them.
  // generateMetadata on the high-traffic airport pages only does fs reads, so blocking
  // it is essentially free. `/./` matches any non-empty UA → metadata always in <head>.
  htmlLimitedBots: /./,
  // www is a full duplicate of the site (nginx serves the app on both hosts). Send a
  // single permanent redirect www.* → apex so crawlers don't split signals / waste budget.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.airportsboard.live' }],
        destination: 'https://airportsboard.live/:path*',
        permanent: true,
      },
    ];
  },
  // HSTS — pin HTTPS for a year (http→https already 301s at nginx).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Cheap, no-downside hardening. Deliberately NO Content-Security-Policy: AdSense
          // moderation is pending and an enforced policy is the classic way to break ad
          // script injection right when it matters.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        // The embed widget exists to be framed on other people's sites — the opposite of the
        // sitewide SAMEORIGIN above. Later rules override earlier ones for the same key, and
        // browsers ignore an invalid X-Frame-Options value, so ALLOWALL neutralises it for
        // the rare client that does not implement CSP frame-ancestors; every modern browser
        // obeys the frame-ancestors * the route itself sends.
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
        ],
      },
      {
        // Списочные страницы: локальная главная, каталоги аэропортов, буквенный указатель,
        // города. Next выводит им s-maxage=31536000 (для /:locale и /:locale/az/*) или
        // s-maxage=86400 со stale-while-revalidate почти на год — то есть ГОД заморозки,
        // если перед сайтом когда-нибудь встанет общий кэш. Сегодня его нет и эти числа не
        // значат ничего, но ставить CDN поверх такого заголовка нельзя: страница застрянет
        // в том виде, в каком её однажды забрали.
        //
        // Содержимое здесь меняется, только когда меняется корпус аэропортов, — то есть
        // почти никогда, поэтому пятиминутный браузерный кэш безопасен и снимает три RTT
        // с каждого возврата, а часовой s-maxage оставляет общему кэшу право отдавать
        // страницу мгновенно и обновлять её в фоне.
        //
        // Правило стоит ПЕРЕД правилом для бортов: страницы аэропортов тоже под него
        // попадают, но следующее правило перекрывает им Cache-Control своим, более
        // коротким. Тот же приём, что у /embed выше.
        //
        // ЛОКАЛИ ПЕРЕЧИСЛЕНЫ ЯВНО, и это не занудство. В первой версии здесь стояло
        // `/:locale` и `/:locale/:path*` — а `:locale` матчит ЛЮБОЙ первый сегмент,
        // то есть оба правила были просто `/*`. Проверка по собранному
        // .next/routes-manifest.json показала, что под них попадало всё:
        //
        //   /api/flights/SVO      /api/cron/warm      /api/airlabs-usage
        //   /_next/static/chunks/*.js                 /embed/SVO
        //   /robots.txt           /sitemap.xml        /icon1
        //
        // и это перекрывало заголовки, объявленные в самих маршрутах. Три следствия,
        // каждое измерено на проде:
        //
        //   1. /api/flights/* получил max-age=300, а FlightBoard опрашивает его без
        //      cache-опции и с тем же URL каждые 60 с. Браузер отдавал бы четыре опроса
        //      из пяти из своего кэша: табло тихо переставало быть живым, а подпись
        //      «Обновлено N назад» отставала до пяти минут. Маршрут объявляет только
        //      s-maxage БЕЗ max-age именно затем, чтобы опрос ходил в сеть.
        //   2. /_next/static/* потерял дефолтный `max-age=31536000, immutable`: Next
        //      ставит его под гвардией `if (!res.getHeader('cache-control'))`, а правило
        //      из конфига срабатывает раньше. Имена чанков захэшированы контентом —
        //      годовой immutable для них верен по построению, а вместо него посетитель
        //      получал 8–9 условных запросов на каждый возврат.
        //   3. /api/airlabs-usage объявляет no-store в коде (это диагностика расхода
        //      платной квоты) — и отдавался публично кэшируемым на пять минут.
        //
        // Список исключений для этого и существует; он уже есть рядом, в matcher'е
        // middleware.ts, — сюда его просто не перенесли.
        source: '/:locale(en|ru|zh|ar|de|ko|ja|fr|es|it|hi|tr)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:locale(en|ru|zh|ar|de|ko|ja|fr|es|it|hi|tr)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        // Boards now state how old their data is, so they must not be served from cache for
        // months. `revalidate = 300` makes Next derive stale-while-revalidate=31535700 —
        // just under a YEAR — which means an infrequent AI crawler can be handed HTML whose
        // "Updated 4 minutes ago" and dateModified were true last winter. Cap the stale
        // window at one revalidate period: still absorbs a thundering herd, cannot lie.
        //
        // max-age=60 — это БРАУЗЕРНЫЙ кэш, которого не было вовсе: Next печатает только
        // s-maxage, поэтому «назад» и повторное открытие той же страницы стоили полной
        // дороги до Амстердама (замер: условный запрос с If-None-Match отдаёт 0 байт, а
        // TTFB всё равно 0.65 с из Москвы и ~1.8 с из Токио — 304 не экономит дорогу,
        // только трафик). Минута выбрана как то, на сколько борт имеет право отстать: он и
        // так подписан «Обновлено N назад», а клиентский опрос в FlightBoard обновляет
        // данные поверх HTML. Больше минуты ставить нельзя — на странице живые рейсы.
        source: '/:locale(en|ru|zh|ar|de|ko|ja|fr|es|it|hi|tr)/airport/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
        ],
      },
      {
        // Иконка. Раньше — дефолт create-next-app на 25 931 Б с `max-age=0,
        // must-revalidate`: качалась целиком на КАЖДЫЙ показ страницы и весила больше, чем
        // весь сжатый HTML главной. Файл заменён на 761 Б (scripts/gen-favicon.mjs), но
        // заголовок всё равно заставлял ходить за ней каждый раз.
        //
        // Сутки, а не год: имя файла фиксированное, версии в нём нет, поэтому смена иконки
        // разъезжается по кэшам ровно столько, сколько тут написано. Год — как у /icon*,
        // которым Next даёт immutable, — здесь неверен: те отдаются по хэшированным путям.
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
  // The small prod VDS runs low on disk during build (webpack PackFileCache churn +
  // SSR-embedded flight data → "ENOENT pages-manifest.json"). Disable the webpack
  // filesystem cache: useless here anyway (deploy does `rm -rf node_modules` each
  // build, so the cache is always cold) and it's the main disk hog during build.
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default withNextIntl(nextConfig);
