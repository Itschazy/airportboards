import React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { numLocale, rtlLocales, type Locale } from '@/lib/i18n';
import { ldScript } from '@/lib/json-ld';
import {
  getLegalDoc,
  legalContentLocale,
  DATED_KINDS,
  LEGAL_UPDATED_ISO,
  type LegalKind,
} from '@/lib/legal-content';

const BASE = 'https://airportsboard.live';

const link = { color: 'var(--ab-0a84ff)', textDecoration: 'underline', wordBreak: 'break-word' } as const;

// Turn raw URLs and email addresses inside the legal prose into real links (AdSense
// reviewers expect the cookie opt-out URLs to be clickable; the contact email a mailto).
const TOKEN = /(https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
function linkify(text: string): React.ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const href = part.replace(/[.,;:)\]]+$/, '');
      const trail = part.slice(href.length);
      return (
        <React.Fragment key={i}>
          <a href={href} target="_blank" rel="noopener noreferrer" style={link}>{href}</a>
          {trail}
        </React.Fragment>
      );
    }
    if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(part)) {
      return <a key={i} href={`mailto:${part}`} style={link}>{part}</a>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// Render a body array: consecutive "- " lines collapse into one <ul>, everything else
// is a paragraph.
function renderBody(body: string[]): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (!bullets.length) return;
    out.push(
      <ul key={key} style={{ margin: '0 0 12px', paddingInlineStart: 22, display: 'grid', gap: 6 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ color: 'var(--ab-bfbfc4)', fontSize: 15, lineHeight: 1.65 }}>{linkify(b)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  body.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
    } else {
      flush(`ul-${i}`);
      out.push(
        <p key={i} style={{ color: 'var(--ab-bfbfc4)', fontSize: 15.5, lineHeight: 1.72, margin: '0 0 12px' }}>
          {linkify(line)}
        </p>,
      );
    }
  });
  flush('ul-end');
  return out;
}

export async function LegalArticle({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const doc = getLegalDoc(kind, locale);
  // These documents exist in English and Russian only. On the other ten locales the body is
  // the English text inside an <html lang="xx"> page, so mark the prose with the language it
  // is actually written in: a screen reader would otherwise read English with German
  // pronunciation, and a crawler would file it as German content.
  const contentLang = legalContentLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const dated = DATED_KINDS.has(kind);
  const updatedLabel = dated
    ? t('last_updated', { date: new Intl.DateTimeFormat(numLocale(locale), { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED_ISO)) })
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: doc.title, item: `${BASE}/${locale}/${kind}` },
    ],
  };

  // Направление тоже, а не только язык. На /ar страница объявлена dir="rtl", и английский
  // текст внутри неё наследовал RTL: строки прижимались вправо, а точка в конце абзаца
  // уезжала в начало. lang без dir помечает язык, но не чинит раскладку.
  return (
    <div
      lang={contentLang !== locale ? contentLang : undefined}
      dir={contentLang !== locale
        ? (rtlLocales.includes(contentLang as Locale) ? 'rtl' : 'ltr')
        : undefined}
      style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={ldScript(jsonLd)} />
      <div style={{ fontSize: 13, color: 'var(--ab-8a8a8a)', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: 'var(--ab-6a6a6a)', textDecoration: 'none', display: 'inline-block', minHeight: 24 }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ab-ffffff)', margin: '0 0 8px' }}>
        {doc.title}
      </h1>
      {updatedLabel && (
        <p style={{ fontSize: 13, color: 'var(--ab-6a6a6a)', margin: '0 0 26px' }}>{updatedLabel}</p>
      )}
      {!updatedLabel && <div style={{ height: 12 }} />}

      {doc.intro.map((p, i) => (
        <p key={i} style={{ color: 'var(--ab-d0d0d4)', fontSize: 16, lineHeight: 1.72, margin: '0 0 14px' }}>{linkify(p)}</p>
      ))}

      {doc.sections.map((sec, i) => (
        <section key={i} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ab-ffffff)', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
            {sec.heading}
          </h2>
          {renderBody(sec.body)}
        </section>
      ))}
    </div>
  );
}
