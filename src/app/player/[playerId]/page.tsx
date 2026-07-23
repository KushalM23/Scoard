import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";
import PlayerPageClient from "@/features/players/PlayerPageClient";
import { fetchStatsApi } from "@/lib/statsApi";
import { CURRENT_SEASON, TEAM_META } from "@/lib/teams";
import { parsePlayerId, parsePlayerTab } from "@/lib/players";
import { getValueFromRow, num, pickResultSet } from "@/lib/teamData";
import type { PlayerHeaderData } from "@/types/player";

interface PlayerPageProps {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getInitialHeader(
  playerId: number,
): Promise<PlayerHeaderData | null> {
  try {
    const [profileRaw, careerRaw] = await Promise.all([
      fetchStatsApi(
        "commonplayerinfo",
        {
          LeagueID: "00",
          PlayerID: playerId,
        },
        3,
        1800,
      ),
      fetchStatsApi(
        "playercareerstats",
        {
          LeagueID: "00",
          PerMode: "PerGame",
          PlayerID: playerId,
        },
        3,
        1800,
      ),
    ]);

    const profileSet = pickResultSet(profileRaw, 0);
    const careerSeasonSet = Array.isArray(careerRaw?.resultSets)
      ? careerRaw.resultSets.find(
          (set: any) =>
            String(set?.name ?? "").toLowerCase() ===
            "seasontotalsregularseason",
        )
      : null;

    const row = profileSet.rowSet[0] ?? [];
    if (!row.length) return null;

    const teamId = num(getValueFromRow(row, profileSet.headers, "TEAM_ID"));
    const teamMeta = TEAM_META[teamId];

    const birthdateRaw = String(
      getValueFromRow(row, profileSet.headers, "BIRTHDATE") ?? "",
    );
    const birthdate = birthdateRaw ? new Date(birthdateRaw) : null;
    const age =
      birthdate && !Number.isNaN(birthdate.getTime())
        ? (() => {
            const today = new Date();
            let years = today.getFullYear() - birthdate.getFullYear();
            const beforeBirthday =
              today.getMonth() < birthdate.getMonth() ||
              (today.getMonth() === birthdate.getMonth() &&
                today.getDate() < birthdate.getDate());
            if (beforeBirthday) years -= 1;
            return years >= 0 ? years : null;
          })()
        : null;

    const seasonRows = careerSeasonSet?.rowSet ?? [];
    const seasonHeaders = careerSeasonSet?.headers ?? [];

    const seasonTeamHistory = seasonRows
      .map((seasonRow: any[]) => {
        const seasonId = String(
          getValueFromRow(seasonRow, seasonHeaders, "SEASON_ID") ?? "",
        );
        const seasonTeamId = num(
          getValueFromRow(seasonRow, seasonHeaders, "TEAM_ID"),
          0,
        );
        const rawTricode = String(
          getValueFromRow(seasonRow, seasonHeaders, "TEAM_ABBREVIATION") ?? "",
        );
        const rawCity = String(
          getValueFromRow(seasonRow, seasonHeaders, "TEAM_CITY") ?? "",
        );
        const rawName = String(
          getValueFromRow(seasonRow, seasonHeaders, "TEAM_NAME") ?? "",
        );
        const meta = TEAM_META[seasonTeamId];
        return {
          seasonId,
          teamId: seasonTeamId,
          teamTricode: rawTricode || meta?.tricode || "N/A",
          teamName: meta
            ? `${meta.city} ${meta.name}`
            : [rawCity, rawName].filter(Boolean).join(" ") ||
              rawTricode ||
              "N/A",
          isTotalRow: rawTricode.toUpperCase() === "TOT",
        };
      })
      .filter((entry: { seasonId: string }) => Boolean(entry.seasonId));

    const teamsPlayedFor = seasonTeamHistory
      .filter(
        (entry: { isTotalRow: boolean; teamId: number }) =>
          !entry.isTotalRow && entry.teamId > 0,
      )
      .reduce(
        (
          acc: Array<{ teamId: number; teamName: string; teamTricode: string }>,
          entry: { teamId: number; teamName: string; teamTricode: string },
        ) => {
          if (!acc.some((team) => team.teamId === entry.teamId)) {
            acc.push({
              teamId: entry.teamId,
              teamName: entry.teamName,
              teamTricode: entry.teamTricode,
            });
          }
          return acc;
        },
        [],
      );

    const firstName = String(
      getValueFromRow(row, profileSet.headers, "FIRST_NAME") ?? "",
    );
    const lastName = String(
      getValueFromRow(row, profileSet.headers, "LAST_NAME") ?? "",
    );

    const draftYear = String(
      getValueFromRow(row, profileSet.headers, "DRAFT_YEAR"),
    );
    const draftRound = String(
      getValueFromRow(row, profileSet.headers, "DRAFT_ROUND"),
    );
    const draftPick = String(
      getValueFromRow(row, profileSet.headers, "DRAFT_NUMBER"),
    );

    return {
      playerId,
      displayName:
        String(
          getValueFromRow(row, profileSet.headers, "DISPLAY_FIRST_LAST") ?? "",
        ).trim() ||
        `${firstName} ${lastName}`.trim() ||
        "Unknown Player",
      firstName,
      lastName,
      teamId,
      teamName: teamMeta
        ? `${teamMeta.city} ${teamMeta.name}`
        : String(getValueFromRow(row, profileSet.headers, "TEAM_NAME") ?? ""),
      teamTricode: String(
        getValueFromRow(row, profileSet.headers, "TEAM_ABBREVIATION") ??
          teamMeta?.tricode ??
          "N/A",
      ),
      jersey: String(getValueFromRow(row, profileSet.headers, "JERSEY") ?? ""),
      position: String(
        getValueFromRow(row, profileSet.headers, "POSITION") ?? "N/A",
      ),
      height: String(getValueFromRow(row, profileSet.headers, "HEIGHT") ?? ""),
      weight: String(getValueFromRow(row, profileSet.headers, "WEIGHT") ?? ""),
      birthdate:
        birthdate && !Number.isNaN(birthdate.getTime())
          ? birthdate.toISOString()
          : null,
      age,
      experience: String(
        getValueFromRow(row, profileSet.headers, "SEASON_EXP") ?? "0",
      ),
      school: String(getValueFromRow(row, profileSet.headers, "SCHOOL") ?? ""),
      country: String(
        getValueFromRow(row, profileSet.headers, "COUNTRY") ?? "",
      ),
      fromYear: String(
        getValueFromRow(row, profileSet.headers, "FROM_YEAR") ?? "",
      ),
      toYear: String(getValueFromRow(row, profileSet.headers, "TO_YEAR") ?? ""),
      draft: {
        year: draftYear,
        round: draftRound,
        pick: draftPick,
        display: `${draftYear} / ${draftRound} / ${draftPick}`,
      },
      teamsPlayedFor,
      seasonTeamHistory,
    };
  } catch (error) {
    console.error("initial player header fetch failed", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PlayerPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const playerId = parsePlayerId(resolvedParams.playerId);

  if (!playerId) {
    return {
      title: "Player Not Found | Scoard",
      description: "The requested player page does not exist.",
    };
  }

  const initialHeader = await getInitialHeader(playerId);
  const playerName = initialHeader?.displayName ?? "Player";

  return {
    title: `${playerName} - Profile, Career, Stats, Game Log | Scoard`,
    description: `${playerName} profile, career summary, season tables, and game log on Scoard.`,
    openGraph: {
      title: `${playerName} | Scoard`,
      description: `${playerName} player page with profile details, stats, and game log.`,
    },
    alternates: {
      canonical: `/player/${playerId}`,
    },
  };
}

export default async function PlayerPage({
  params,
  searchParams,
}: PlayerPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const playerId = parsePlayerId(resolvedParams.playerId);

  if (!playerId) {
    notFound();
  }

  const initialTab = parsePlayerTab(
    typeof resolvedSearchParams.tab === "string"
      ? resolvedSearchParams.tab
      : null,
  );

  const initialHeader = await getInitialHeader(playerId);

  return (
    <Layout>
      <Header />
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-5 lg:py-6">
        <PlayerPageClient
          playerId={playerId}
          initialTab={initialTab}
          initialHeader={initialHeader}
        />
      </div>
    </Layout>
  );
}
