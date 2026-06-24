import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAirportsByLetter } from '@/lib/airports';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
type Props = { params: Promise<{ locale: string; letter: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LETTERS.map(letter => ({ letter }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, letter } = await params;
  const L = letter.toUpperCase();
  if (!LETTERS.includes(letter.toLowerCase())) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/az/${letter.toLowerCase()}`;
  return {
    title: `${t('az_title', { letter: L })} — AirportsBoard`,
    description: t('az_desc', { letter: L }),
    alternates: { canonical: `${BASE}/${locale}/az/${letter.toLowerCase()}`, languages },
  };
}

export default async function LetterPage({ params }: Props) {
  const { locale, letter } = await params;
  if (!LETTERS.includes(letter.toLowerCase())) notFound();
  const L = letter.toUpperCase();
  const t = await getTranslations({ locale, namespace: 'home' });
  const airports = getAirportsByLetter(letter);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '36px 18px 64px' }}>
      <div style={{ fontSize: 13, color: '#5A5A5A', marginBottom: 8 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(30px, 8vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: 0 }}>
        {t('az_title', { letter: L })}
      </h1>

      {/* Letter nav */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 20 }}>
        {LETTERS.map(x => (
          <Link key={x} href={`/${locale}/az/${x}`} style={{
            width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, border: '1px solid #1A1A1A', textDecoration: 'none',
            background: x === letter.toLowerCase() ? '#FFFFFF' : '#0B0B0B',
            color: x === letter.toLowerCase() ? '#000000' : '#8A8A8A', fontSize: 13, fontWeight: 600,
          }}>
            {x.toUpperCase()}
          </Link>
        ))}
      </div>

      <p style={{ fontSize: 14, color: '#6A6A6A', marginTop: 22, marginBottom: 14 }}>{t('airports_count', { count: airports.length })}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {airports.map(a => (
          <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} style={{
            display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
            background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 14, padding: '11px 16px',
          }}>
            <span style={{ width: 50, flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#0A84FF', letterSpacing: '-0.02em' }}>{a.iata}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: '#E4E4E7', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
              <span style={{ fontSize: 12, color: '#5A5A5A', display: 'block' }}>{a.city}, {a.country}</span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
