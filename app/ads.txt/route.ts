import { adsensePubId } from '@/lib/adsense';

// Serves /ads.txt. The i18n middleware ignores paths containing a dot, so this route
// is reached directly (no locale prefix). Derived from the same env as the AdSense
// loader — set NEXT_PUBLIC_ADSENSE_CLIENT and the DIRECT line appears automatically.
// f08c47fec0942fa0 is Google's fixed certification-authority id for AdSense.
export const dynamic = 'force-static';

export function GET() {
  const body = adsensePubId
    ? `google.com, ${adsensePubId}, DIRECT, f08c47fec0942fa0\n`
    : '# ads.txt — set NEXT_PUBLIC_ADSENSE_CLIENT (ca-pub-XXXXXXXXXXXXXXXX) and redeploy to activate the AdSense line.\n';
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
