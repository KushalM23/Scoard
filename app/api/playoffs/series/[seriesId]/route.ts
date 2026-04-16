import { NextRequest, NextResponse } from "next/server";
import { getSeriesById } from "@/app/lib/playoffs";
import { CURRENT_SEASON, parseSeason } from "@/app/lib/teams";

export const dynamic = "force-dynamic";

type TeamApiOverview = {
  teamId: number;
  logoUrl: string;
  city: string;
  name: string;
  tricode: string;
  record: {
    wins: number;
    losses: number;
    winPct: number;
  };
  ranks: {
    conferenceRank: number;
    divisionRank: number;
  };
  streak: string;
  standingsSnapshot: {
    conference: Array<{
      teamId: number;
      tricode: string;
      wins: number;
      losses: number;
      rank: number;
    }>;
    division: Array<{
      teamId: number;
      tricode: string;
      wins: number;
      losses: number;
      rank: number;
    }>;
  };
};

type TeamApiStats = {
  teamMetrics: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
    netRating?: number;
    offRating?: number;
    defRating?: number;
    pace?: number;
  };
  homeAwaySplits: {
    home: { wins: number; losses: number };
    away: { wins: number; losses: number };
  };
  playerStats: Array<Record<string, unknown>>;
  tables: Record<string, unknown>;
};

const TEAM_SECTION_TIMEOUT_MS = 20000;

function jsonResponse(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

async function fetchTeamSection<T>(
  request: NextRequest,
  teamId: number,
  options: {
    season: string;
    seasonType: "Regular Season" | "Playoffs";
    include: "overview" | "stats";
  },
): Promise<T | null> {
  const origin = request.nextUrl.origin;
  const url = new URL(`/api/teams/${teamId}`, origin);
  url.searchParams.set("season", options.season);
  url.searchParams.set("seasonType", options.seasonType);
  url.searchParams.set("include", options.include);

  try {
    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(TEAM_SECTION_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.warn(
        `[playoff-series] Team API request failed for ${teamId} (${options.include}) with ${response.status}`,
      );
      return null;
    }

    const payload = await response.json().catch(() => null);
    const section = payload?.[options.include];

    if (!section || section?.code === "TEAM_SECTION_FAILED") {
      console.warn(
        `[playoff-series] Team API section unavailable for ${teamId} (${options.include})`,
      );
      return null;
    }

    return section as T;
  } catch (error) {
    console.warn(
      `[playoff-series] Team API request threw for ${teamId} (${options.include})`,
      error,
    );
    return null;
  }
}

function buildFallbackOverview(team: {
  teamId: number;
  tricode: string;
  displayName: string;
  logoUrl: string | null;
}): TeamApiOverview {
  return {
    teamId: team.teamId,
    logoUrl: team.logoUrl ?? "",
    city: "",
    name: team.displayName,
    tricode: team.tricode,
    record: {
      wins: 0,
      losses: 0,
      winPct: 0,
    },
    ranks: {
      conferenceRank: 0,
      divisionRank: 0,
    },
    streak: "N/A",
    standingsSnapshot: {
      conference: [],
      division: [],
    },
  };
}

function buildFallbackStats(
  record: TeamApiOverview["record"],
): TeamApiStats {
  return {
    teamMetrics: {
      gamesPlayed: record.wins + record.losses,
      wins: record.wins,
      losses: record.losses,
      pointsPerGame: 0,
      reboundsPerGame: 0,
      assistsPerGame: 0,
      netRating: 0,
      offRating: 0,
      defRating: 0,
      pace: 0,
    },
    homeAwaySplits: {
      home: { wins: 0, losses: 0 },
      away: { wins: 0, losses: 0 },
    },
    playerStats: [],
    tables: {},
  };
}

function buildGamesTab(
  actualSeries: NonNullable<
    Awaited<ReturnType<typeof getSeriesById>>["actualSeries"]
  >,
) {
  const items = actualSeries.games.map((game) => ({
    gameId: game.gameId,
    gameNumber: game.seriesGameNumber,
    scheduledAt: game.gameDate,
    status:
      game.gameStatus === 3
        ? "completed"
        : game.gameStatus === 2
          ? "in_progress"
          : "scheduled",
    statusText: game.gameStatusText,
    winnerTeamId: game.winnerTeamId,
    homeTeam: {
      teamId: game.homeTeam.teamId,
      tricode: game.homeTeam.tricode,
      displayName: game.homeTeam.displayName,
      score: game.homeTeam.score,
    },
    awayTeam: {
      teamId: game.awayTeam.teamId,
      tricode: game.awayTeam.tricode,
      displayName: game.awayTeam.displayName,
      score: game.awayTeam.score,
    },
  }));

  return {
    totalGames: items.length,
    completedGames: items.filter((game) => game.status === "completed").length,
    items,
  };
}

async function buildSeriesPayload(
  request: NextRequest,
  seriesId: string,
  seasonInput: string | null,
) {
  const season = parseSeason(seasonInput);
  const lookup = await getSeriesById(seriesId);
  const series = lookup.series;
  const actualSeries = lookup.actualSeries;

  if (!series || series.phase === "play_in") {
    return NextResponse.json(
      {
        code: "PLAYOFF_SERIES_NOT_FOUND",
        message: "Playoff series not found.",
      },
      { status: 404 },
    );
  }

  const topTeamId = series.teams.top.teamId;
  const bottomTeamId = series.teams.bottom.teamId;

  if (!topTeamId || !bottomTeamId) {
    return NextResponse.json(
      {
        code: "PLAYOFF_SERIES_NOT_READY",
        message:
          "This series page is not available yet because both teams are not locked in.",
      },
      { status: 409 },
    );
  }

  const statsMode = series.hasStarted
    ? "playoff_context"
    : "regular_season_preview";
  const statsSeasonType: "Regular Season" | "Playoffs" =
    statsMode === "playoff_context" ? "Playoffs" : "Regular Season";

  const [
    topOverviewResult,
    bottomOverviewResult,
    topStatsResult,
    bottomStatsResult,
  ] =
    await Promise.all([
      fetchTeamSection<TeamApiOverview>(request, topTeamId, {
        season,
        seasonType: "Regular Season",
        include: "overview",
      }),
      fetchTeamSection<TeamApiOverview>(request, bottomTeamId, {
        season,
        seasonType: "Regular Season",
        include: "overview",
      }),
      fetchTeamSection<TeamApiStats>(request, topTeamId, {
        season,
        seasonType: statsSeasonType,
        include: "stats",
      }),
      fetchTeamSection<TeamApiStats>(request, bottomTeamId, {
        season,
        seasonType: statsSeasonType,
        include: "stats",
      }),
    ]);

  const topOverview =
    topOverviewResult ??
    buildFallbackOverview({
      teamId: topTeamId,
      tricode: series.teams.top.tricode,
      displayName: series.teams.top.displayName,
      logoUrl: series.teams.top.logoUrl,
    });
  const bottomOverview =
    bottomOverviewResult ??
    buildFallbackOverview({
      teamId: bottomTeamId,
      tricode: series.teams.bottom.tricode,
      displayName: series.teams.bottom.displayName,
      logoUrl: series.teams.bottom.logoUrl,
    });
  const topStats = topStatsResult ?? buildFallbackStats(topOverview.record);
  const bottomStats =
    bottomStatsResult ?? buildFallbackStats(bottomOverview.record);

  const detailedTeams = [
    {
      slot: "top",
      ...series.teams.top,
      regularSeasonRecord: topOverview.record,
      conferenceRank: topOverview.ranks.conferenceRank,
      divisionRank: topOverview.ranks.divisionRank,
      streak: topOverview.streak,
      standingsSnapshot: topOverview.standingsSnapshot,
      contextRecord: {
        wins: topStats.teamMetrics.wins,
        losses: topStats.teamMetrics.losses,
      },
      stats: {
        teamMetrics: topStats.teamMetrics,
        homeAwaySplits: topStats.homeAwaySplits,
        tables: topStats.tables,
        playerStats: topStats.playerStats,
      },
    },
    {
      slot: "bottom",
      ...series.teams.bottom,
      regularSeasonRecord: bottomOverview.record,
      conferenceRank: bottomOverview.ranks.conferenceRank,
      divisionRank: bottomOverview.ranks.divisionRank,
      streak: bottomOverview.streak,
      standingsSnapshot: bottomOverview.standingsSnapshot,
      contextRecord: {
        wins: bottomStats.teamMetrics.wins,
        losses: bottomStats.teamMetrics.losses,
      },
      stats: {
        teamMetrics: bottomStats.teamMetrics,
        homeAwaySplits: bottomStats.homeAwaySplits,
        tables: bottomStats.tables,
        playerStats: bottomStats.playerStats,
      },
    },
  ];

  return jsonResponse({
    season,
    sourceSeason: lookup.sourceSeason,
    generatedAt: lookup.generatedAt,
    source: lookup.source,
    note:
      season === CURRENT_SEASON
        ? null
        : "The NBA CDN schedule feed used here is the current-season feed, so historical series data may be empty or unavailable.",
    series: {
      id: series.id,
      href: series.href,
      title: `${series.teams.top.displayName} vs ${series.teams.bottom.displayName}`,
      round: series.round,
      roundLabel: series.roundLabel,
      conference: series.conference,
      status: series.status,
      bestOf: series.bestOf,
      winsNeeded: series.winsNeeded,
      hasStarted: series.hasStarted,
      isCompleted: series.isCompleted,
      leaderTeamId: series.leaderTeamId,
      winnerTeamId: series.winnerTeamId,
      navigation: series.navigation,
      teams: series.teams,
      summary: series.summary,
    },
    statsContext: {
      mode: statsMode,
      seasonType: statsSeasonType,
    },
    overview: {
      teams: detailedTeams.map((team) => ({
        slot: team.slot,
        teamId: team.teamId,
        seed: team.seed,
        tricode: team.tricode,
        displayName: team.displayName,
        logoUrl: team.logoUrl,
        seriesWins: team.seriesWins,
        regularSeasonRecord: team.regularSeasonRecord,
        conferenceRank: team.conferenceRank,
        divisionRank: team.divisionRank,
        streak: team.streak,
        contextRecord: team.contextRecord,
      })),
    },
    tabs: {
      games: actualSeries
        ? buildGamesTab(actualSeries)
        : { totalGames: 0, completedGames: 0, items: [] },
      stats: {
        mode: statsMode,
        seasonType: statsSeasonType,
        teams: detailedTeams,
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  try {
    const { seriesId } = await params;
    return await buildSeriesPayload(
      request,
      seriesId,
      request.nextUrl.searchParams.get("season"),
    );
  } catch (error) {
    console.error("playoff series route failed", error);
    return NextResponse.json(
      {
        code: "PLAYOFF_SERIES_FAILED",
        message:
          "Playoff series details are temporarily unavailable. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  try {
    const { seriesId } = await params;
    const body = await request.json().catch(() => ({}));
    return await buildSeriesPayload(
      request,
      seriesId,
      typeof body?.season === "string" ? body.season : null,
    );
  } catch (error) {
    console.error("playoff series route failed", error);
    return NextResponse.json(
      {
        code: "PLAYOFF_SERIES_FAILED",
        message:
          "Playoff series details are temporarily unavailable. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
