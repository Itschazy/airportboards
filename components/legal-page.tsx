import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalArticle } from '@/components/LegalArticle';
import { getLegalDoc, legalContentLocale, LEGAL_LOCALES, type LegalKind } from '@/lib/legal-content';
import { locales, type Locale } from '@/lib/i18n';

// Factories shared by the four legal/info routes (privacy, terms, about, contact) so
// each route file is a two-line binding. Metadata mirrors the site convention:
// localized title/description, self-canonical, full 12-language hreflang cluster.
const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string }> };

/**
 * Обрезать описание по границе предложения, а не по счётчику символов.
 *
 * Было `.slice(0, 155)`, и описание юридических страниц заканчивалось посреди слова: «…й при
 * использовании вами», «…его использование. Сайт у». В выдаче это первое, что видит человек,
 * и оборванное слово читается как поломка страницы.
 *
 * Сначала ищется конец предложения, и только если его в пределах лимита нет — конец слова.
 * Многоточие ставится лишь во втором случае: предложение, законченное точкой, в нём не
 * нуждается.
 */
function clampToSentence(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const sentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sentence >= limit * 0.5) return head.slice(0, sentence + 1);
  const word = head.lastIndexOf(' ');
  return `${head.slice(0, word > 0 ? word : limit).replace(/[.,;:]$/, '')}…`;
}

export function legalMetadata(kind: LegalKind) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const doc = getLegalDoc(kind, locale as Locale);
    // Only advertise the languages these documents are actually written in. The other ten
    // URLs serve the English text; claiming them as localized alternates is a promise the
    // pages do not keep, and hreflang is exactly where engines check.
    const languages: Record<string, string> = {};
    for (const loc of LEGAL_LOCALES) languages[loc] = `${BASE}/${loc}/${kind}`;
    languages['x-default'] = `${BASE}/en/${kind}`;
    const description = clampToSentence((doc.intro[0] ?? '').replace(/\s+/g, ' ').trim(), 155);
    return {
      title: `${doc.title} — AirportsBoard`,
      description,
      alternates: { canonical: `${BASE}/${locale}/${kind}`, languages },
      // The ten locales these documents are NOT written in serve the English text verbatim.
      // Indexing them publishes ten duplicates of the same document under different language
      // URLs — and each one lacks a self-reference in its own hreflang cluster, because the
      // cluster above only names en and ru. noindex/follow states the truth: real page, real
      // content, not a translation. Reachability is untouched, so an AdSense reviewer (and
      // anyone else) still gets there from the footer in any language.
      robots: { index: (LEGAL_LOCALES as readonly string[]).includes(locale), follow: true },
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
