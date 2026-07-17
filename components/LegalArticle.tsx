import React from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n';
import {
  getLegalDoc,
  DATED_KINDS,
  LEGAL_UPDATED_ISO,
  type LegalKind,
} from '@/lib/legal-content';

const BASE = 'https://airportsboard.live';

const link = { color: '#0A84FF', textDecoration: 'underline', wordBreak: 'break-word' } as const;

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
          <li key={i} style={{ color: '#BFBFC4', fontSize: 15, lineHeight: 1.65 }}>{linkify(b)}</li>
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
        <p key={i} style={{ color: '#BFBFC4', fontSize: 15.5, lineHeight: 1.72, margin: '0 0 12px' }}>
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
  const t = await getTranslations({ locale, namespace: 'legal' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const dated = DATED_KINDS.has(kind);
  const updatedLabel = dated
    ? t('last_updated', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(LEGAL_UPDATED_ISO)) })
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
      { '@type': 'ListItem', position: 2, name: doc.title, item: `${BASE}/${locale}/${kind}` },
    ],
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(26px, 6vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 8px' }}>
        {doc.title}
      </h1>
      {updatedLabel && (
        <p style={{ fontSize: 13, color: '#6A6A6A', margin: '0 0 26px' }}>{updatedLabel}</p>
      )}
      {!updatedLabel && <div style={{ height: 12 }} />}

      {doc.intro.map((p, i) => (
        <p key={i} style={{ color: '#D0D0D4', fontSize: 16, lineHeight: 1.72, margin: '0 0 14px' }}>{linkify(p)}</p>
      ))}

      {doc.sections.map((sec, i) => (
        <section key={i} style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.01em', margin: '0 0 10px' }}>
            {sec.heading}
          </h2>
          {renderBody(sec.body)}
        </section>
      ))}
    </div>
  );
}
