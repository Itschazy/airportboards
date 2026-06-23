import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAirport, getStaticIataCodes } from '@/lib/airports';
import { FlightBoard } from '@/components/FlightBoard';
import { locales } from '@/lib/i18n';

const BASE = 'https://airportsboard.live';

export const dynamicParams = true;
export const revalidate = 300;

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getStaticIataCodes().map(iata => ({ iata }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });

  const title = t('departures_title', { airport: airport.name, iata: airport.iata, city: airport.city });
  const description = t('departures_description', { airport: airport.name, iata: airport.iata, city: airport.city });
  const canonical = `${BASE}/${locale}/airport/${airport.iata}/departures`;

  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${BASE}/${loc}/airport/${airport.iata}/departures`;
  }

  return {
    title,
    description,
    keywords: [
      `${airport.name} departures`, `${airport.iata} departures today`,
      `${airport.city} airport departures`, `${airport.iata} departure board`,
      `flights from ${airport.city}`, `${airport.name} flight schedule`,
    ].join(', '),
    alternates: { canonical, languages },
    openGraph: { title, description, type: 'website', url: canonical, siteName: 'AirportsBoard.live' },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function DeparturesPage({ params }: Props) {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();

  const canonical = `${BASE}/${locale}/airport/${airport.iata}/departures`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/${locale}` },
        { '@type': 'ListItem', position: 2, name: `${airport.name} (${airport.iata})`, item: `${BASE}/${locale}/airport/${airport.iata}` },
        { '@type': 'ListItem', position: 3, name: 'Departures', item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${airport.name} Departures — Live Board`,
      description: `Live departure board for ${airport.name} (${airport.iata}), ${airport.city}`,
      url: canonical,
      inLanguage: locale,
    },
  ];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}
      <FlightBoard airport={airport} locale={locale} defaultMode="departures" />
    </>
  );
}
