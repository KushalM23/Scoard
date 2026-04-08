import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import TeamPageClient from "./TeamPageClient";
import { fetchStatsApi } from "@/app/lib/statsApi";
import {
  TEAM_META,
  parseSeason,
  parseTab,
  parseTeamId,
} from "@/app/lib/teams";
import { getValueFromRow, num, pickResultSet } from "@/app/lib/teamData";
import type { TeamOverviewData } from "@/app/types/team";

interface TeamPageProps {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function resolveStandingsTricode(
  row: any[],
  headers: string[],
  teamId: number,
): string {
  const candidates = [
    "TeamAbbreviation",
    "TEAM_ABBREVIATION",
    "TeamTricode",
    "TEAM_TRICODE",
  ];

  for (const key of candidates) {
    const value = getValueFromRow(row, headers, key);
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return TEAM_META[teamId].tricode;
}

async function getInitialOverview(
  teamId: number,
  season: string,
): Promise<TeamOverviewData | null> {
  try {
    const standingsData = await fetchStatsApi(
      "leaguestandingsv3",
      {
        LeagueID: "00",
        Season: season,
        SeasonType: "Regular Season",
      },
      3,
      900,
    );

    const { headers, rowSet } = pickResultSet(standingsData, 0);
    const teamRow = rowSet.find(
      (row: any[]) => num(getValueFromRow(row, headers, "TeamID")) === teamId,
    );

    if (!teamRow) return null;

    return {
      teamId,
      city: String(
        getValueFromRow(teamRow, headers, "TeamCity") ?? TEAM_META[teamId].city,
      ),
      name: String(
        getValueFromRow(teamRow, headers, "TeamName") ?? TEAM_META[teamId].name,
      ),
      tricode: resolveStandingsTricode(teamRow, headers, teamId),
      record: {
        wins: num(getValueFromRow(teamRow, headers, "WINS")),
        losses: num(getValueFromRow(teamRow, headers, "LOSSES")),
        winPct: num(getValueFromRow(teamRow, headers, "WinPCT")),
      },
      ranks: {
        conferenceRank: num(getValueFromRow(teamRow, headers, "PlayoffRank")),
        divisionRank: num(getValueFromRow(teamRow, headers, "DivisionRank")),
      },
      streak: String(
        getValueFromRow(teamRow, headers, "strCurrentStreak") ?? "N/A",
      ),
      standingsSnapshot: {
        conference: [],
        division: [],
      },
    };
  } catch (error) {
    console.error("initial team overview fetch failed", error);
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: TeamPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const parsedTeamId = parseTeamId(resolvedParams.teamId);

  if (!parsedTeamId) {
    return {
      title: "Team Not Found | Scoard",
      description: "The requested team page does not exist.",
    };
  }

  const teamName = `${TEAM_META[parsedTeamId].city} ${TEAM_META[parsedTeamId].name}`;

  return {
    title: `${teamName} - Team Stats, Roster, Schedule, Results | Scoard`,
    description: `${teamName} overview, team stats, player stats, roster, schedule, and results on Scoard.`,
    openGraph: {
      title: `${teamName} | Scoard`,
      description: `${teamName} team page with stats, roster, schedule, and results.`,
    },
    alternates: {
      canonical: `/team/${parsedTeamId}`,
    },
  };
}

export default async function TeamPage({
  params,
  searchParams,
}: TeamPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const parsedTeamId = parseTeamId(resolvedParams.teamId);

  if (!parsedTeamId) {
    notFound();
  }

  const initialTab = parseTab(
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : null,
  );
  const initialSeason = parseSeason(
    typeof resolvedSearchParams.season === "string"
      ? resolvedSearchParams.season
      : null,
  );

  const initialOverview = await getInitialOverview(parsedTeamId, initialSeason);

  return (
    <Layout>
      <Header />
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
        <TeamPageClient
          teamId={parsedTeamId}
          initialTab={initialTab}
          initialSeason={initialSeason}
          initialOverview={initialOverview}
        />
      </div>
    </Layout>
  );
}
