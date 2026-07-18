import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvent, getEventSlugs, type EventLocale } from '@/lib/event-content';
import { getAirport } from '@/lib/airports';
import { getAirportName } from '@/lib/airport-names';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';
type Props = { params: Promise<{ locale: string; slug: string }> };

// Small closed set of event pages; prerender them all, 404 anything else.
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return getEventSlugs().map(slug => ({ slug }));
}

// Section labels are part of the feature (like the airport-guide labels) — a local
// map keeps the event system self-contained instead of touching messages/*.json.
const SEC: Record<string, { getting: string; leaving: string; tips: string; boards: string }> = {
  en: { getting: 'Getting to the stadium', leaving: 'Flying home after the final', tips: 'Match-weekend tips', boards: 'Nearest airports & live boards' },
  ru: { getting: 'Как добраться до стадиона', leaving: 'Вылет домой после финала', tips: 'Советы на матч-уикенд', boards: 'Ближайшие аэропорты и табло' },
  es: { getting: 'Cómo llegar al estadio', leaving: 'El vuelo de vuelta tras la final', tips: 'Consejos para el fin de semana', boards: 'Aeropuertos cercanos y paneles en vivo' },
  de: { getting: 'Anreise zum Stadion', leaving: 'Heimflug nach dem Finale', tips: 'Tipps fürs Finalwochenende', boards: 'Nächste Flughäfen & Live-Tafeln' },
  fr: { getting: 'Rejoindre le stade', leaving: 'Le vol retour après la finale', tips: 'Conseils pour le week-end', boards: 'Aéroports proches et tableaux en direct' },
  it: { getting: 'Come raggiungere lo stadio', leaving: 'Il volo di ritorno dopo la finale', tips: 'Consigli per il weekend', boards: 'Aeroporti vicini e tabelloni live' },
  tr: { getting: 'Stadyuma ulaşım', leaving: 'Finalden sonra dönüş uçuşu', tips: 'Maç haftası ipuçları', boards: 'En yakın havalimanları ve canlı tablolar' },
  ar: { getting: 'الوصول إلى الملعب', leaving: 'رحلة العودة بعد النهائي', tips: 'نصائح عطلة المباراة', boards: 'أقرب المطارات واللوحات المباشرة' },
  ja: { getting: 'スタジアムへのアクセス', leaving: '決勝後の帰国便', tips: '観戦週末のヒント', boards: '最寄り空港とライブ発着案内' },
  ko: { getting: '경기장 가는 길', leaving: '결승전 후 귀국 항공편', tips: '경기 주말 팁', boards: '가까운 공항과 실시간 운항정보' },
  zh: { getting: '前往球场', leaving: '决赛后返程航班', tips: '比赛周末小贴士', boards: '附近机场与实时航班动态' },
  hi: { getting: 'स्टेडियम कैसे पहुँचें', leaving: 'फ़ाइनल के बाद वापसी की उड़ान', tips: 'मैच वीकेंड सुझाव', boards: 'नज़दीकी एयरपोर्ट और लाइव बोर्ड' },
};

function pick(ev: NonNullable<ReturnType<typeof getEvent>>, locale: string): EventLocale {
  return ev.locales[locale] || ev.locales.en;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const ev = getEvent(slug);
  if (!ev) return {};
  const c = pick(ev, locale);
  const canonical = `${BASE}/${locale}/event/${slug}`;
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = `${BASE}/${loc}/event/${slug}`;
  languages['x-default'] = `${BASE}/en/event/${slug}`;
  return {
    title: c.title,
    description: c.description,
    alternates: { canonical, languages },
    robots: { index: true, follow: true },
  };
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const ev = getEvent(slug);
  if (!ev) notFound();
  const c = pick(ev, locale);
  const sec = SEC[locale] || SEC.en;
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const canonical = `${BASE}/${locale}/event/${slug}`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: ev.meta.name,
      startDate: ev.meta.startDate,
      location: {
        '@type': 'Place',
        name: ev.meta.venue,
        address: { '@type': 'PostalAddress', addressLocality: ev.meta.venueCity, addressCountry: 'US' },
      },
      url: canonical,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: c.h1, item: canonical },
      ],
    },
  ];

  const sub = { fontSize: 15, lineHeight: 1.65, color: '#B4B4B4' } as const;
  const h2s = { margin: '0 0 12px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8A8A8A' } as const;
  const card = { background: '#0B0B0B', border: '1px solid #1A1A1A', borderRadius: 16, padding: '16px 18px' } as const;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 18px 64px' }}>
      {jsonLd.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      <div style={{ fontSize: 13, color: '#8A8A8A', marginBottom: 10 }}>
        <Link href={`/${locale}`} style={{ color: '#6A6A6A', textDecoration: 'none' }}>airportsboard</Link>
      </div>
      <h1 style={{ fontSize: 'clamp(28px, 7vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.08 }}>
        <span aria-hidden="true">🏆</span> {c.h1}
      </h1>
      <p style={{ fontSize: 14, color: '#8A8A8A', margin: '0 0 22px' }}>
        {ev.meta.venue} · {ev.meta.venueCity}
      </p>

      <p style={{ ...sub, margin: '0 0 30px' }}>{c.intro}</p>

      {/* Airports — the money block: live-board links */}
      <section style={{ marginBottom: 34 }}>
        <h2 style={h2s}>{sec.boards}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ev.meta.airports.map(a => {
            const ap = getAirport(a.iata);
            if (!ap) return null;
            const name = getAirportName(a.iata, locale, ap.name);
            return (
              <Link key={a.iata} href={`/${locale}/airport/${a.iata}`} className="frow" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ width: 4, background: '#0A84FF', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '16px', gap: 14, minWidth: 0 }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#0A84FF', width: 64, flexShrink: 0, letterSpacing: '-0.02em' }}>{a.iata}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: '#E4E4E7' }}>{name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>≈{a.km} km · {ev.meta.venue}</span>
                  </span>
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M1 1L7 7L1 13" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={h2s}>{sec.getting}</h2>
        <div style={{ ...card, ...sub }}>{c.getting}</div>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2 style={h2s}>{sec.leaving}</h2>
        <div style={{ ...card, ...sub }}>{c.leaving}</div>
      </section>

      <section>
        <h2 style={h2s}>{sec.tips}</h2>
        <div style={{ ...card, ...sub }}>{c.tips}</div>
      </section>
    </div>
  );
}
