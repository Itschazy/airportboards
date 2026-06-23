import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getAirport, getAllIataCodes } from '@/lib/airports';
import { FlightBoard } from '@/components/FlightBoard';

type Props = { params: Promise<{ locale: string; iata: string }> };

export async function generateStaticParams() {
  return getAllIataCodes().map(iata => ({ iata }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) return {};
  const t = await getTranslations({ locale, namespace: 'meta' });
  const title = t('departures_title', { airport: airport.name, iata: airport.iata });
  const description = t('departures_description', { airport: airport.name, iata: airport.iata });
  return {
    title, description,
    alternates: { canonical: `https://airportboards.live/${locale}/airport/${iata.toUpperCase()}/departures` },
    openGraph: { title, description },
  };
}

export default async function DeparturesPage({ params }: Props) {
  const { locale, iata } = await params;
  const airport = getAirport(iata.toUpperCase());
  if (!airport) notFound();
  return <FlightBoard airport={airport} locale={locale} defaultMode="departures" />;
}
