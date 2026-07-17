import privacy from '@/data/legal/privacy.json';
import terms from '@/data/legal/terms.json';
import about from '@/data/legal/about.json';
import contact from '@/data/legal/contact.json';
import type { Locale } from '@/lib/i18n';

// Static legal / info page copy. Authored in English + Russian; every other locale
// falls back to English prose (the UI chrome around it is still fully localized via
// the `legal` messages namespace). Full localization can follow via the translate
// scripts. Kept as data (not in messages/*.json) so it doesn't bloat the client
// bundle passed to NextIntlClientProvider.

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; intro: string[]; sections: LegalSection[] };
export type LegalKind = 'privacy' | 'terms' | 'about' | 'contact';

type DocByLocale = Partial<Record<Locale, LegalDoc>>;

const DOCS: Record<LegalKind, DocByLocale> = {
  privacy: privacy as DocByLocale,
  terms: terms as DocByLocale,
  about: about as DocByLocale,
  contact: contact as DocByLocale,
};

// Legal/info pages that carry a "last updated" date (the info pages don't).
export const DATED_KINDS: ReadonlySet<LegalKind> = new Set<LegalKind>(['privacy', 'terms']);

// ISO date the legal docs were last revised — surfaced as a localized line under the H1.
export const LEGAL_UPDATED_ISO = '2026-07-17';

export function getLegalDoc(kind: LegalKind, locale: Locale): LegalDoc {
  const byLocale = DOCS[kind];
  return (byLocale[locale] ?? byLocale.en) as LegalDoc;
}
