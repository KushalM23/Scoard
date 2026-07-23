import type { Metadata } from "next";
import SeriesPageClient from "@/features/playoffs/SeriesPageClient";

interface SeriesPageProps {
  params: Promise<{ seriesId: string }>;
}

export async function generateMetadata({
  params,
}: SeriesPageProps): Promise<Metadata> {
  const resolved = await params;

  return {
    title: `Playoff Series ${resolved.seriesId} | Scoard`,
    description:
      "Detailed playoff series page with games and contextual team/player stats.",
    alternates: {
      canonical: `/playoffs/series/${resolved.seriesId}`,
    },
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const resolved = await params;
  return <SeriesPageClient seriesId={resolved.seriesId} />;
}
