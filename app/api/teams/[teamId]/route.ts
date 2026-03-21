import { NextRequest, NextResponse } from "next/server";
import { fetchStatsApi } from "@/app/lib/statsApi";
import {
  CURRENT_SEASON,
  TEAM_META,
  parseTeamId,
  parseTab,
} from "@/app/lib/teams";
import {
  getValueFromRow,
  inferHomeAway,
  num,
  pickResultSet,
  toRecentForm,
} from "@/app/lib/teamData";

export const dynamic = "force-dynamic";

function parseScheduleDate(raw?: string): Date {
  if (!raw) return new Date("1970-01-01T00:00:00Z");
  const normalized = raw.replace(" ET", "").replace("TBD", "").trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? new Date("1970-01-01T00:00:00Z")
    : parsed;
}

function isPlayoffGame(game: any): boolean {
  const stage = Number(
    game.seasonStageId ?? game.seasonStageID ?? game.seasonStage,
  );
  const label =
    `${game.gameLabel ?? ""} ${game.seriesText ?? ""}`.toLowerCase();
  return stage === 4 || label.includes("playoff");
}

async function buildOverview(teamId: number) {
  const standingsData = await fetchStatsApi(
    "leaguestandingsv3",
    {
      LeagueID: "00",
      Season: CURRENT_SEASON,
      SeasonType: "Regular Season",
    },
    3,
    900,
  );

  const { headers, rowSet } = pickResultSet(standingsData, 0);
  const teamRow = rowSet.find(
    (row: any[]) => num(getValueFromRow(row, headers, "TeamID")) === teamId,
  );

  if (!teamRow) {
    throw new Error("Team not found for selected season");
  }

  const conference = String(
    getValueFromRow(teamRow, headers, "Conference") ?? "",
  );
  const division = String(getValueFromRow(teamRow, headers, "Division") ?? "");

  const centerAroundTeam = (rows: any[], rankKey: string) => {
    const sorted = [...rows].sort(
      (a, b) =>
        num(getValueFromRow(a, headers, rankKey)) -
        num(getValueFromRow(b, headers, rankKey)),
    );
    const targetIndex = sorted.findIndex(
      (row) => num(getValueFromRow(row, headers, "TeamID")) === teamId,
    );
    const start = Math.max(0, targetIndex - 2);
    return sorted.slice(start, start + 5);
  };

  const mapSnapshot = (rows: any[], rankKey: string) =>
    rows.map((row: any[]) => {
      const rowTeamId = num(getValueFromRow(row, headers, "TeamID"));
      const meta = TEAM_META[rowTeamId];
      return {
        teamId: rowTeamId,
        tricode: String(
          getValueFromRow(row, headers, "TeamAbbreviation") ??
            meta?.tricode ??
            rowTeamId,
        ),
        wins: num(getValueFromRow(row, headers, "WINS")),
        losses: num(getValueFromRow(row, headers, "LOSSES")),
        rank: num(getValueFromRow(row, headers, rankKey)),
      };
    });

  const conferenceRows = rowSet.filter(
    (row: any[]) => getValueFromRow(row, headers, "Conference") === conference,
  );
  const divisionRows = rowSet.filter(
    (row: any[]) => getValueFromRow(row, headers, "Division") === division,
  );

  return {
    teamId,
    city: String(
      getValueFromRow(teamRow, headers, "TeamCity") ?? TEAM_META[teamId].city,
    ),
    name: String(
      getValueFromRow(teamRow, headers, "TeamName") ?? TEAM_META[teamId].name,
    ),
    tricode: String(
      getValueFromRow(teamRow, headers, "TeamAbbreviation") ??
        TEAM_META[teamId].tricode,
    ),
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
    recentForm: toRecentForm(
      String(getValueFromRow(teamRow, headers, "L10") ?? "0-0"),
    ),
    standingsSnapshot: {
      conference: mapSnapshot(
        centerAroundTeam(conferenceRows, "PlayoffRank"),
        "PlayoffRank",
      ),
      division: mapSnapshot(
        centerAroundTeam(divisionRows, "DivisionRank"),
        "DivisionRank",
      ),
    },
    injuries: {
      list: [],
      reason: "No reported injuries",
    },
  };
}

async function buildStats(teamId: number) {
  const [teamStatsRaw, playerStatsRaw] = await Promise.all([
    fetchStatsApi(
      "leaguedashteamstats",
      {
        TeamID: teamId,
        Season: CURRENT_SEASON,
        SeasonType: "Regular Season",
        MeasureType: "Base",
        PerMode: "PerGame",
        PlusMinus: "N",
        PaceAdjust: "N",
        Rank: "N",
      },
      3,
      900,
    ),
    fetchStatsApi(
      "leaguedashplayerstats",
      {
        TeamID: teamId,
        Season: CURRENT_SEASON,
        SeasonType: "Regular Season",
        PerMode: "PerGame",
        MeasureType: "Base",
        PlusMinus: "N",
        PaceAdjust: "N",
        Rank: "N",
      },
      3,
      900,
    ),
  ]);

  const teamSet = pickResultSet(teamStatsRaw, 0);
  const playerSet = pickResultSet(playerStatsRaw, 0);
  const teamRow = teamSet.rowSet[0] ?? [];

  const players = playerSet.rowSet
    .map((row: any[]) => ({
      playerId: num(getValueFromRow(row, playerSet.headers, "PLAYER_ID")),
      playerName: String(
        getValueFromRow(row, playerSet.headers, "PLAYER_NAME") ?? "Unknown",
      ),
      gamesPlayed: num(getValueFromRow(row, playerSet.headers, "GP")),
      minutes: num(getValueFromRow(row, playerSet.headers, "MIN")),
      points: num(getValueFromRow(row, playerSet.headers, "PTS")),
      rebounds: num(getValueFromRow(row, playerSet.headers, "REB")),
      assists: num(getValueFromRow(row, playerSet.headers, "AST")),
      steals: num(getValueFromRow(row, playerSet.headers, "STL")),
      blocks: num(getValueFromRow(row, playerSet.headers, "BLK")),
      turnovers: num(getValueFromRow(row, playerSet.headers, "TOV")),
      fgPct: num(getValueFromRow(row, playerSet.headers, "FG_PCT")),
      threePtPct: num(getValueFromRow(row, playerSet.headers, "FG3_PCT")),
      ftPct: num(getValueFromRow(row, playerSet.headers, "FT_PCT")),
    }))
    .sort((a: any, b: any) => b.points - a.points);

  return {
    teamMetrics: {
      gamesPlayed: num(getValueFromRow(teamRow, teamSet.headers, "GP")),
      wins: num(getValueFromRow(teamRow, teamSet.headers, "W")),
      losses: num(getValueFromRow(teamRow, teamSet.headers, "L")),
      pointsPerGame: num(getValueFromRow(teamRow, teamSet.headers, "PTS")),
      reboundsPerGame: num(getValueFromRow(teamRow, teamSet.headers, "REB")),
      assistsPerGame: num(getValueFromRow(teamRow, teamSet.headers, "AST")),
      netRating: num(getValueFromRow(teamRow, teamSet.headers, "NET_RATING")),
      offRating: num(getValueFromRow(teamRow, teamSet.headers, "OFF_RATING")),
      defRating: num(getValueFromRow(teamRow, teamSet.headers, "DEF_RATING")),
      pace: num(getValueFromRow(teamRow, teamSet.headers, "PACE")),
    },
    homeAwaySplits: {
      home: {
        wins: num(getValueFromRow(teamRow, teamSet.headers, "W_HOME")),
        losses: num(getValueFromRow(teamRow, teamSet.headers, "L_HOME")),
      },
      away: {
        wins: num(getValueFromRow(teamRow, teamSet.headers, "W_ROAD")),
        losses: num(getValueFromRow(teamRow, teamSet.headers, "L_ROAD")),
      },
    },
    playerStats: players,
  };
}

async function buildRoster(teamId: number) {
  const rosterRaw = await fetchStatsApi(
    "commonteamroster",
    {
      TeamID: teamId,
      Season: CURRENT_SEASON,
    },
    3,
    3600,
  );

  const rosterSet = pickResultSet(rosterRaw, 0);
  const players = rosterSet.rowSet.map((row: any[]) => ({
    playerId: num(getValueFromRow(row, rosterSet.headers, "PLAYER_ID")),
    playerName: String(
      getValueFromRow(row, rosterSet.headers, "PLAYER") ?? "Unknown",
    ),
    jersey: String(getValueFromRow(row, rosterSet.headers, "NUM") ?? ""),
    position: String(getValueFromRow(row, rosterSet.headers, "POSITION") ?? ""),
    status: String(
      getValueFromRow(row, rosterSet.headers, "STATUS") ?? "Unknown",
    ),
    height: String(getValueFromRow(row, rosterSet.headers, "HEIGHT") ?? ""),
    weight: String(getValueFromRow(row, rosterSet.headers, "WEIGHT") ?? ""),
    experience: String(getValueFromRow(row, rosterSet.headers, "EXP") ?? ""),
  }));

  return { teamId, players };
}

async function buildSchedule(teamId: number) {
  const scheduleResponse = await fetch(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    { next: { revalidate: 3600 } },
  );

  if (!scheduleResponse.ok) {
    throw new Error("Failed to fetch league schedule");
  }

  const scheduleData = await scheduleResponse.json();
  const now = new Date();
  const flattenedGames = (
    scheduleData?.leagueSchedule?.gameDates ?? []
  ).flatMap((day: any) => day.games ?? []);

  const games = flattenedGames
    .filter((game: any) => {
      const isTeamGame =
        Number(game.homeTeam?.teamId) === teamId ||
        Number(game.awayTeam?.teamId) === teamId;
      if (!isTeamGame) return false;

      const playoff = isPlayoffGame(game);
      if (playoff) return false;

      return parseScheduleDate(game.gameDateTimeUTC) >= now;
    })
    .sort(
      (a: any, b: any) =>
        parseScheduleDate(a.gameDateTimeUTC).getTime() -
        parseScheduleDate(b.gameDateTimeUTC).getTime(),
    )
    .map((game: any) => {
      const isHome = Number(game.homeTeam?.teamId) === teamId;
      const opponent = isHome ? game.awayTeam : game.homeTeam;
      const opponentId = Number(opponent?.teamId ?? 0);
      const meta = TEAM_META[opponentId];

      return {
        gameId: String(game.gameId),
        gameDate: String(game.gameDateTimeUTC ?? game.gameDateEst ?? ""),
        gameTime: String(game.gameStatusText ?? ""),
        opponentTeamId: opponentId,
        opponentTricode: String(
          opponent?.teamTricode ?? meta?.tricode ?? "TBD",
        ),
        opponentName: meta ? `${meta.city} ${meta.name}` : "TBD",
        homeAway: isHome ? "Home" : "Away",
        status: String(game.gameStatusText ?? "Scheduled"),
      };
    });

  return { teamId, games };
}

async function buildResults(teamId: number) {
  const logData = await fetchStatsApi(
    "teamgamelog",
    {
      TeamID: teamId,
      Season: CURRENT_SEASON,
      SeasonType: "Regular Season",
    },
    3,
    900,
  );

  const gameLogSet = pickResultSet(logData, 0);

  const games = gameLogSet.rowSet.map((row: any[]) => {
    const matchup = String(
      getValueFromRow(row, gameLogSet.headers, "MATCHUP") ?? "",
    );
    const opponentTricode = matchup.split(" ").pop() ?? "TBD";
    const teamPts = num(getValueFromRow(row, gameLogSet.headers, "PTS"));
    const oppPts = num(getValueFromRow(row, gameLogSet.headers, "PTS_OPP"));
    const result = String(getValueFromRow(row, gameLogSet.headers, "WL") ?? "");

    return {
      gameId: String(getValueFromRow(row, gameLogSet.headers, "Game_ID") ?? ""),
      gameDate: String(
        getValueFromRow(row, gameLogSet.headers, "GAME_DATE") ?? "",
      ),
      opponentTeamId: 0,
      opponentTricode,
      opponentName: opponentTricode,
      homeAway: inferHomeAway(matchup),
      status: "Final",
      finalScore: `${teamPts}-${oppPts}`,
      result: result === "W" ? "W" : "L",
    };
  });

  return { teamId, games };
}

const sectionError = (
  section: string,
  fallbackMessage: string,
  error?: any,
) => ({
  code: "TEAM_SECTION_FAILED",
  message: error?.message ?? fallbackMessage,
  section,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const resolvedParams = await params;
  const teamId = parseTeamId(resolvedParams.teamId);

  if (!teamId) {
    return NextResponse.json(
      {
        code: "INVALID_TEAM",
        message: "Invalid team id",
        section: "aggregate",
      },
      { status: 404 },
    );
  }

  const tab = parseTab(request.nextUrl.searchParams.get("tab"));

  try {
    const [
      overviewResult,
      statsResult,
      rosterResult,
      scheduleResult,
      resultsResult,
    ] = await Promise.allSettled([
      buildOverview(teamId),
      buildStats(teamId),
      buildRoster(teamId),
      buildSchedule(teamId),
      buildResults(teamId),
    ]);

    const overview =
      overviewResult.status === "fulfilled"
        ? overviewResult.value
        : sectionError(
            "overview",
            "Failed to fetch team overview",
            overviewResult.reason,
          );
    const stats =
      statsResult.status === "fulfilled"
        ? statsResult.value
        : sectionError(
            "stats",
            "Failed to fetch team stats",
            statsResult.reason,
          );
    const roster =
      rosterResult.status === "fulfilled"
        ? rosterResult.value
        : sectionError(
            "roster",
            "Failed to fetch team roster",
            rosterResult.reason,
          );
    const schedule =
      scheduleResult.status === "fulfilled"
        ? scheduleResult.value
        : sectionError(
            "schedule",
            "Failed to fetch team schedule",
            scheduleResult.reason,
          );
    const results =
      resultsResult.status === "fulfilled"
        ? resultsResult.value
        : sectionError(
            "results",
            "Failed to fetch team results",
            resultsResult.reason,
          );

    return NextResponse.json(
      {
        teamId,
        tab,
        seasonType: "Regular Season",
        overview,
        stats,
        roster,
        schedule,
        results,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("aggregate route failed", error);
    return NextResponse.json(
      {
        code: "TEAM_AGGREGATE_FAILED",
        message: "Failed to fetch team sections",
        section: "aggregate",
      },
      { status: 500 },
    );
  }
}
