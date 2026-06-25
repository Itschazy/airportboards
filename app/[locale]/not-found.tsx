import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { AirportSearch } from '@/components/AirportSearch';
import { POPULAR_AIRPORTS, getAirport } from '@/lib/airports';

// Localized 404 — replaces Next's English default. Renders inside the [locale] layout
// (header/footer), so it just supplies helpful body content: a search box, popular
// airports, and a home link, in the visitor's language.
export default async function NotFound() {
  let locale = 'en';
  try { locale = await getLocale(); } catch { /* fall back to en */ }
  const t = await getTranslations({ locale, namespace: 'notfound' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const popular = POPULAR_AIRPORTS.slice(0, 8).map(i => getAirport(i)).filter(Boolean) as NonNullable<ReturnType<typeof getAirport>>[];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '56px 24px 80px' }}>
      <div style={{ fontSize: 'clamp(64px, 18vw, 104px)', fontWeight: 800, letterSpacing: '-0.05em', color: '#1A1A1A', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 'clamp(24px, 6vw, 32px)', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', margin: '12px 0 0' }}>{t('title')}</h1>
      <p style={{ fontSize: 15, color: '#8A8A8A', marginTop: 10, lineHeight: 1.5 }}>{t('text')}</p>

      <div style={{ marginTop: 24 }}>
        <AirportSearch locale={locale} placeholder={tNav('search_placeholder')} nearestLabel={tHome('nearest')} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A', margin: '32px 0 12px' }}>{tNav('popular')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {popular.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{ background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 12, padding: '9px 14px', fontSize: 14, color: '#E4E4E7', textDecoration: 'none', display: 'flex', gap: 8 }}>
            <span style={{ fontWeight: 700, color: '#0A84FF' }}>{a.iata}</span>
            <span>{a.city}</span>
          </Link>
        ))}
      </div>

      <Link href={`/${locale}`} style={{ display: 'inline-block', marginTop: 32, color: '#0A84FF', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}>← {t('home')}</Link>
    </div>
  );
}
