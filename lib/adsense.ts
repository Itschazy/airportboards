// Single source of truth for the Google AdSense publisher id.
//
// Set NEXT_PUBLIC_ADSENSE_CLIENT to your full publisher id — `ca-pub-XXXXXXXXXXXXXXXX`
// — as a BUILD-TIME env (GitHub Actions build env / .env.local), since deploy runs
// `npm run build`. While it is empty:
//   • <AdSense/> renders no loader script,
//   • the google-adsense-account verification meta tag is omitted,
//   • /ads.txt returns a placeholder comment.
// So the production site is completely unchanged until you set it and redeploy.

// Full id used by the loader URL and the verification meta tag: "ca-pub-1234567890123456".
export const adsenseClient: string = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim();

// Publisher id for ads.txt (drops the "ca-" prefix): "pub-1234567890123456".
export const adsensePubId: string = adsenseClient.replace(/^ca-/, '');
