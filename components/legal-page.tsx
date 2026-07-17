import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalArticle } from '@/components/LegalArticle';
import { getLegalDoc, type LegalKind } from '@/lib/legal-content';
import { locales, type Locale } from '@/lib/i18n';

// Factories shared by the four legal/info routes (privacy, terms, about, contact) so
// each route file is a two-line binding. Metadata mirrors the site convention:
// localized title/description, self-canonical, full 12-language hreflang cluster.
const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string }> };

export function legalMetadata(kind: LegalKind) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const doc = getLegalDoc(kind, locale as Locale);
    const languages: Record<string, string> = {};
    for (const loc of locales) languages[loc] = `${BASE}/${loc}/${kind}`;
    languages['x-default'] = `${BASE}/en/${kind}`;
    const description = (doc.intro[0] ?? '').replace(/\s+/g, ' ').trim().slice(0, 155);
    return {
      title: `${doc.title} — AirportsBoard`,
      description,
      alternates: { canonical: `${BASE}/${locale}/${kind}`, languages },
      robots: { index: true, follow: true },
    };
  };
}

export function legalPage(kind: LegalKind) {
  return async function Page({ params }: Props) {
    const { locale } = await params;
    setRequestLocale(locale);
    return <LegalArticle kind={kind} locale={locale as Locale} />;
  };
}
