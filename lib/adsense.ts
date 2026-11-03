// Single source of truth for the Google AdSense publisher id.
//
// Set NEXT_PUBLIC_ADSENSE_CLIENT to your full publisher id — `ca-pub-XXXXXXXXXXXXXXXX`
// — as a BUILD-TIME env (GitHub Actions build env / .env.local), since deploy runs
// `npm run build`. While it is empty:
//   • <AdSense/> renders no loader script,
//   • verification uses its separate optional id, without advertising requests,
//   • /ads.txt returns a placeholder comment.
// 03.11.2026: повторная заявка требует подтвердить сайт, но не включать рекламу.
// Отдельный публичный id даёт только meta-тег; loader, preconnect и ads.txt
// по-прежнему зависят исключительно от NEXT_PUBLIC_ADSENSE_CLIENT.
// Проверено check-adsense по SSR: нужный тег в head, рекламных запросов нет.

// Full id used by the loader URL and, when enabled, verification: "ca-pub-1234567890123456".
export const adsenseClient: string = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim();

// Publisher id for ads.txt (drops the "ca-" prefix): "pub-1234567890123456".
export const adsensePubId: string = adsenseClient.replace(/^ca-/, '');

// Активная реклама всегда имеет приоритет: не подтверждаем другого издателя.
export const adsenseVerificationClient: string = adsenseClient || (process.env.NEXT_PUBLIC_ADSENSE_VERIFICATION_CLIENT ?? '').trim();
