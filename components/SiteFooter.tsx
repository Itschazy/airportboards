import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCountries } from '@/lib/airports';
import { getCountryName } from '@/lib/places';
import type { Locale } from '@/lib/i18n';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Server-rendered global footer. Its real job is SEO: it ships crawlable <a href>
// links to the top hubs (busiest countries + the full A–Z index) on EVERY page across
// all 12 locales, flattening crawl depth and spreading internal link equity so the
// long tail of airports is reachable in few clicks from anywhere on the site.
export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tLegal = await getTranslations({ locale, namespace: 'legal' });
  const topCountries = [...getCountries()].sort((a, b) => b.count - a.count).slice(0, 12);

  const tEvent = await getTranslations({ locale, namespace: 'event' });

  const legalLinks = [
    // Events hub sits here so event guides keep a permanent inbound link once their
    // airport banners expire — otherwise they'd be sitemap-only orphans.
    { href: `/${locale}/events`, label: tEvent('hub_title') },
    { href: `/${locale}/about`, label: tLegal('about') },
    { href: `/${locale}/contact`, label: tLegal('contact') },
    { href: `/${locale}/privacy`, label: tLegal('privacy') },
    { href: `/${locale}/terms`, label: tLegal('terms') },
  ];

  const linkStyle = { color: '#8A8A8A', textDecoration: 'none', fontSize: 13 } as const;
  const headStyle = { color: '#6A6A6A', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' } as const;

  return (
    <footer style={{ borderTop: '1px solid #1A1A1A', marginTop: 'auto', padding: '32px 18px 28px' }}>
      <nav style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28 }} aria-label="Footer">
        <div>
          <p style={headStyle}>{t('sec_countries')}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {topCountries.map(c => (
              <li key={c.slug}>
                <Link href={`/${locale}/airports/${c.slug}`} style={linkStyle}>{getCountryName(c.country, locale)}</Link>
              </li>
            ))}
            <li>
              <Link href={`/${locale}/airports`} style={{ ...linkStyle, color: '#0A84FF' }}>{tNav('all_airports')} →</Link>
            </li>
          </ul>
        </div>
        <div>
          <p style={headStyle}>A–Z</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
            {LETTERS.map(x => (
              <li key={x}>
                <Link href={`/${locale}/az/${x}`} style={{ ...linkStyle, fontWeight: 600 }}>{x.toUpperCase()}</Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <nav aria-label={tLegal('legal')} style={{ maxWidth: 1000, margin: '28px auto 0', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px' }}>
        {legalLinks.map(l => (
          <Link key={l.href} href={l.href} style={{ color: '#8A8A8A', textDecoration: 'none', fontSize: 13 }}>{l.label}</Link>
        ))}
      </nav>
      <p style={{ maxWidth: 1000, margin: '20px auto 0', textAlign: 'center', fontSize: 12, color: '#6A6A6A', lineHeight: 1.5 }}>
        {t('data_note')}
      </p>
      <p style={{ maxWidth: 1000, margin: '10px auto 0', textAlign: 'center', fontSize: 11, color: '#5A5A5A', letterSpacing: '0.02em' }}>
        airportsboard.live · © 2026
      </p>
    </footer>
  );
}
