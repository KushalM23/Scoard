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

const DASH_STATS_RETRIES = 1;

const PROD_ERROR_MESSAGES = {
  overview:
    "We are having trouble loading this team overview right now. Please try again shortly.",
  stats:
    "Team and player stats are temporarily unavailable. Please try again in a moment.",
  roster:
    "Roster details are temporarily unavailable. Please try again in a moment.",
  schedule:
    "Upcoming games are temporarily unavailable. Please try again in a moment.",
  results:
    "Recent results are temporarily unavailable. Please try again in a moment.",
  aggregate:
    "We could not load this team page right now. Please refresh and try again.",
} as const;

type TeamSection = "overview" | "stats" | "roster" | "schedule" | "results";

const ALL_SECTIONS: TeamSection[] = [
  "overview",
  "stats",
  "roster",
  "schedule",
  "results",
];

const TRICODE_TO_TEAM_ID = Object.entries(TEAM_META).reduce(
  (acc, [id, meta]) => {
    acc[meta.tricode.toUpperCase()] = Number(id);
    return acc;
  },
  {} as Record<string, number>,
);

function parseInclude(
  raw: string | null,
  tab: ReturnType<typeof parseTab>,
): TeamSection[] {
  if (!raw) {
    return ["overview"];
  }

  const normalized = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!normalized.length) {
    return ["overview"];
  }

  if (normalized.includes("all")) {
    return ALL_SECTIONS;
  }

  if (normalized.includes("auto")) {
    if (tab === "roster") {
      return ["overview", "schedule", "results", "roster"];
    }

    return ["overview", "schedule", "results", "stats"];
  }

  const requested = normalized.filter((value): value is TeamSection =>
    ALL_SECTIONS.includes(value as TeamSection),
  );

  return requested.length ? [...new Set(requested)] : ["overview"];
}

function resolveOpponentTeamId(matchup: string): number {
  const tricode = matchup.trim().split(" ").pop()?.toUpperCase();

  if (!tricode) return 0;
  return TRICODE_TO_TEAM_ID[tricode] ?? 0;
}

function parseScheduleDate(raw?: string): Date {
  if (!raw) return new Date("1970-01-01T00:00:00Z");
  const normalized = raw.replace(" ET", "").replace("TBD", "").trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? new Date("1970-01-01T00:00:00Z")
    : parsed;
}

function roundTo(value: unknown, decimals = 1): number {
  const parsed = num(value, 0);
  const factor = 10 ** decimals;
  return Math.round(parsed * factor) / factor;
}

function formatPct(value: unknown): string {
  return `${(num(value, 0) * 100).toFixed(1)}%`;
}

function formatDateShort(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTimeShort(value: string): { date: string; time: string } {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { date: value, time: "TBD" };
  }

  return {
    date: parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    }),
  };
}

type FieldAuditEntry = {
  field: string;
  sourceEndpoint: string | null;
  sourceKey: string | null;
  available: boolean;
  previousFormat: string;
  formattedAs: string;
  note?: string;
};

function buildFieldAudit(
  inspectedEndpoints: string[],
  fields: FieldAuditEntry[],
) {
  return {
    inspectedEndpoints,
    fields,
    missingRequiredFields: fields
      .filter((field) => !field.available)
      .map((field) => field.field),
  };
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

  const centerAroundTeam = (rows: any[], rankKey: string, windowSize = 5) => {
    const sorted = [...rows].sort(
      (a, b) =>
        num(getValueFromRow(a, headers, rankKey)) -
        num(getValueFromRow(b, headers, rankKey)),
    );
    const targetIndex = sorted.findIndex(
      (row) => num(getValueFromRow(row, headers, "TeamID")) === teamId,
    );
    const half = Math.floor(windowSize / 2);
    const unclampedStart = Math.max(0, targetIndex - half);
    const maxStart = Math.max(0, sorted.length - windowSize);
    const start = Math.min(unclampedStart, maxStart);
    return sorted.slice(start, start + windowSize);
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

  const fieldAudit = buildFieldAudit(
    ["stats.nba.com/leaguestandingsv3", "cdn.nba.com/logos"],
    [
      {
        field: "teamLogo",
        sourceEndpoint: "cdn.nba.com/logos",
        sourceKey: "teamId -> logo URL template",
        available: true,
        previousFormat: "UI constructed URL inline",
        formattedAs: "logoUrl string",
      },
      {
        field: "teamName",
        sourceEndpoint: "stats.nba.com/leaguestandingsv3",
        sourceKey: "TeamCity + TeamName",
        available: true,
        previousFormat: "city and name fields",
        formattedAs: "city, name, tricode strings",
      },
      {
        field: "teamRecord",
        sourceEndpoint: "stats.nba.com/leaguestandingsv3",
        sourceKey: "WINS, LOSSES",
        available: true,
        previousFormat: "wins/losses numbers",
        formattedAs: "wins/losses numbers + winPct decimal",
      },
      {
        field: "streak",
        sourceEndpoint: "stats.nba.com/leaguestandingsv3",
        sourceKey: "strCurrentStreak",
        available: true,
        previousFormat: "string",
        formattedAs: "normalized string",
      },
      {
        field: "conferenceRanking",
        sourceEndpoint: "stats.nba.com/leaguestandingsv3",
        sourceKey: "PlayoffRank",
        available: true,
        previousFormat: "number",
        formattedAs: "number",
      },
      {
        field: "divisionRanking",
        sourceEndpoint: "stats.nba.com/leaguestandingsv3",
        sourceKey: "DivisionRank",
        available: true,
        previousFormat: "number",
        formattedAs: "number",
      },
    ],
  );

  return {
    teamId,
    logoUrl: `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`,
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
        centerAroundTeam(conferenceRows, "PlayoffRank", 8),
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
    fieldAudit,
  };
}

function buildStandardStatsRow(
  row: any[],
  headers: string[],
  options?: { totalsMode?: boolean },
) {
  const totalsMode = Boolean(options?.totalsMode);

  return {
    GP: num(getValueFromRow(row, headers, "GP")),
    PPG: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "PTS" : "PTS")),
      1,
    ),
    RPG: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "REB" : "REB")),
      1,
    ),
    APG: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "AST" : "AST")),
      1,
    ),
    BPG: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "BLK" : "BLK")),
      1,
    ),
    SPG: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "STL" : "STL")),
      1,
    ),
    TOV: roundTo(
      num(getValueFromRow(row, headers, totalsMode ? "TOV" : "TOV")),
      1,
    ),
    ORPG: roundTo(num(getValueFromRow(row, headers, "OREB")), 1),
    DRPG: roundTo(num(getValueFromRow(row, headers, "DREB")), 1),
    FG_PCT: formatPct(getValueFromRow(row, headers, "FG_PCT")),
    FG3_PCT: formatPct(getValueFromRow(row, headers, "FG3_PCT")),
    FT_PCT: formatPct(getValueFromRow(row, headers, "FT_PCT")),
    FG3A: roundTo(num(getValueFromRow(row, headers, "FG3A")), 1),
    FG3M: roundTo(num(getValueFromRow(row, headers, "FG3M")), 1),
    FGA: roundTo(num(getValueFromRow(row, headers, "FGA")), 1),
    FGM: roundTo(num(getValueFromRow(row, headers, "FGM")), 1),
    FTA: roundTo(num(getValueFromRow(row, headers, "FTA")), 1),
    FTM: roundTo(num(getValueFromRow(row, headers, "FTM")), 1),
    PF: roundTo(num(getValueFromRow(row, headers, "PF")), 1),
  };
}

function buildAdvancedStatsRow(
  row: any[],
  headers: string[],
  opponentRow: any[],
  opponentHeaders: string[],
) {
  return {
    ORtg: roundTo(num(getValueFromRow(row, headers, "OFF_RATING")), 1),
    DRtg: roundTo(num(getValueFromRow(row, headers, "DEF_RATING")), 1),
    Pace: roundTo(num(getValueFromRow(row, headers, "PACE")), 1),
    eFG_PCT: formatPct(getValueFromRow(row, headers, "EFG_PCT")),
    Opp_eFG_PCT: formatPct(
      getValueFromRow(opponentRow, opponentHeaders, "EFG_PCT"),
    ),
    DRB_PCT: formatPct(getValueFromRow(row, headers, "DREB_PCT")),
    ORB_PCT: formatPct(getValueFromRow(row, headers, "OREB_PCT")),
    TOV_PCT: formatPct(getValueFromRow(row, headers, "TM_TOV_PCT")),
    Opp_TOV_PCT: formatPct(
      getValueFromRow(opponentRow, opponentHeaders, "TM_TOV_PCT"),
    ),
  };
}

async function buildStats(teamId: number) {
  try {
    return await buildStatsFromPrimary(teamId);
  } catch (primaryError) {
    console.warn(
      `Primary team stats source failed for team ${teamId}, falling back to CDN boxscores.`,
      primaryError,
    );
    return buildStatsFromCdn(teamId);
  }
}

async function buildStatsFromPrimary(teamId: number) {
  const requests: Promise<any>[] = [
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
        LastNGames: 0,
        Month: 0,
        OpponentTeamID: 0,
        DateFrom: "",
        DateTo: "",
      },
      DASH_STATS_RETRIES,
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
        LastNGames: 0,
        Month: 0,
        OpponentTeamID: 0,
        DateFrom: "",
        DateTo: "",
      },
      DASH_STATS_RETRIES,
      900,
    ),
  ];

  requests.push(
    fetchStatsApi(
      "leaguedashteamstats",
      {
        TeamID: teamId,
        Season: CURRENT_SEASON,
        SeasonType: "Regular Season",
        MeasureType: "Base",
        PerMode: "Totals",
        PlusMinus: "N",
        PaceAdjust: "N",
        Rank: "N",
        LastNGames: 0,
        Month: 0,
        OpponentTeamID: 0,
        DateFrom: "",
        DateTo: "",
      },
      DASH_STATS_RETRIES,
      900,
    ),
    fetchStatsApi(
      "leaguedashteamstats",
      {
        TeamID: teamId,
        Season: CURRENT_SEASON,
        SeasonType: "Regular Season",
        MeasureType: "Opponent",
        PerMode: "PerGame",
        PlusMinus: "N",
        PaceAdjust: "N",
        Rank: "N",
        LastNGames: 0,
        Month: 0,
        OpponentTeamID: 0,
        DateFrom: "",
        DateTo: "",
      },
      DASH_STATS_RETRIES,
      900,
    ),
    fetchStatsApi(
      "leaguedashteamstats",
      {
        TeamID: teamId,
        Season: CURRENT_SEASON,
        SeasonType: "Regular Season",
        MeasureType: "Advanced",
        PerMode: "PerGame",
        PlusMinus: "N",
        PaceAdjust: "N",
        Rank: "N",
        LastNGames: 0,
        Month: 0,
        OpponentTeamID: 0,
        DateFrom: "",
        DateTo: "",
      },
      DASH_STATS_RETRIES,
      900,
    ),
  );

  const [
    teamStatsRaw,
    playerStatsRaw,
    teamTotalsRaw,
    opponentPerGameRaw,
    advancedRaw,
  ] = await Promise.all(requests);

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

  const totalsSet = pickResultSet(teamTotalsRaw, 0);
  const opponentSet = pickResultSet(opponentPerGameRaw, 0);
  const advancedSet = pickResultSet(advancedRaw, 0);

  const totalsRow = totalsSet.rowSet[0] ?? [];
  const opponentRow = opponentSet.rowSet[0] ?? [];
  const advancedRow = advancedSet.rowSet[0] ?? [];

  const fieldAudit = buildFieldAudit(
    [
      "stats.nba.com/leaguedashteamstats?MeasureType=Base&PerMode=PerGame",
      "stats.nba.com/leaguedashteamstats?MeasureType=Base&PerMode=Totals",
      "stats.nba.com/leaguedashteamstats?MeasureType=Opponent&PerMode=PerGame",
      "stats.nba.com/leaguedashteamstats?MeasureType=Advanced&PerMode=PerGame",
    ],
    [
      {
        field: "teamPerGameTable",
        sourceEndpoint:
          "stats.nba.com/leaguedashteamstats?MeasureType=Base&PerMode=PerGame",
        sourceKey: "GP, PTS, REB, AST, BLK, STL, TOV, OREB, DREB, FG_*",
        available: teamSet.rowSet.length > 0,
        previousFormat: "summary cards only",
        formattedAs: "normalized 19-column row",
      },
      {
        field: "teamTotalsTable",
        sourceEndpoint:
          "stats.nba.com/leaguedashteamstats?MeasureType=Base&PerMode=Totals",
        sourceKey: "same base columns as per-game",
        available: totalsSet.rowSet.length > 0,
        previousFormat: "not present",
        formattedAs: "normalized 19-column row",
      },
      {
        field: "opponentPerGameTable",
        sourceEndpoint:
          "stats.nba.com/leaguedashteamstats?MeasureType=Opponent&PerMode=PerGame",
        sourceKey: "opponent base columns",
        available: opponentSet.rowSet.length > 0,
        previousFormat: "not present",
        formattedAs: "normalized 19-column row",
      },
      {
        field: "advancedStatsTable",
        sourceEndpoint:
          "stats.nba.com/leaguedashteamstats?MeasureType=Advanced&PerMode=PerGame",
        sourceKey:
          "OFF_RATING, DEF_RATING, PACE, EFG_PCT, OREB_PCT, DREB_PCT, TM_TOV_PCT",
        available: advancedSet.rowSet.length > 0,
        previousFormat: "off/def/net/pace summary only",
        formattedAs: "normalized 9-column row",
        note: "Opp eFG% and Opp TOV% are sourced from opponent per-game advanced-compatible fields",
      },
    ],
  );

  const tables = {
    teamPerGame: buildStandardStatsRow(teamRow, teamSet.headers),
    teamTotals: buildStandardStatsRow(totalsRow, totalsSet.headers, {
      totalsMode: true,
    }),
    opponentPerGame: buildStandardStatsRow(opponentRow, opponentSet.headers),
    advanced: buildAdvancedStatsRow(
      advancedRow,
      advancedSet.headers,
      opponentRow,
      opponentSet.headers,
    ),
    fieldAudit,
  };

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
    tables,
  };
}

function parseMinutesToDecimal(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

  const value = String(raw ?? "0:00").trim();

  if (value.startsWith("PT")) {
    const match = value.match(
      /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
    );
    if (match) {
      const hours = num(match[1], 0);
      const minutes = num(match[2], 0);
      const seconds = num(match[3], 0);
      return hours * 60 + minutes + seconds / 60;
    }
  }

  if (!value.includes(":")) return num(value, 0);

  const [minutesPart, secondsPart] = value.split(":");
  const minutes = num(minutesPart, 0);
  const seconds = num(secondsPart, 0);
  return minutes + seconds / 60;
}

function toPercent(value: unknown): number {
  const parsed = num(value, 0);
  if (parsed <= 0) return 0;
  return parsed > 1 ? parsed / 100 : parsed;
}

async function buildStatsFromCdn(teamId: number) {
  const scheduleResponse = await fetch(
    "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
    { cache: "no-store" },
  );

  if (!scheduleResponse.ok) {
    throw new Error("CDN schedule unavailable");
  }

  const scheduleData = await scheduleResponse.json();
  const allGames = (scheduleData?.leagueSchedule?.gameDates ?? []).flatMap(
    (dateNode: any) => dateNode.games ?? [],
  );

  const completedRegularSeasonGames = allGames
    .filter((game: any) => {
      const isTeamGame =
        Number(game.homeTeam?.teamId) === teamId ||
        Number(game.awayTeam?.teamId) === teamId;
      if (!isTeamGame) return false;
      if (isPlayoffGame(game)) return false;

      const status = Number(
        game.gameStatus ?? game.gameStatusID ?? game.gameStatusId ?? 0,
      );
      const statusText = String(game.gameStatusText ?? "").toLowerCase();
      return status === 3 || statusText.includes("final");
    })
    .sort(
      (a: any, b: any) =>
        parseScheduleDate(b.gameDateTimeUTC).getTime() -
        parseScheduleDate(a.gameDateTimeUTC).getTime(),
    );

  if (!completedRegularSeasonGames.length) {
    throw new Error("No completed games available for fallback stats");
  }

  const boxscoreResults = await Promise.allSettled(
    completedRegularSeasonGames.map(async (game: any) => {
      const gameId = String(game.gameId ?? "");
      if (!gameId) throw new Error("Missing game id");

      const boxscoreResponse = await fetch(
        `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`,
        {
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(8000),
        },
      );

      if (!boxscoreResponse.ok) {
        throw new Error(`Failed boxscore fetch for ${gameId}`);
      }

      const payload = await boxscoreResponse.json();
      return payload?.game;
    }),
  );

  const validGames = boxscoreResults
    .filter((result): result is PromiseFulfilledResult<any> => {
      return result.status === "fulfilled" && Boolean(result.value);
    })
    .map((result) => result.value);

  if (!validGames.length) {
    throw new Error("CDN fallback boxscores unavailable");
  }

  const playerAccumulator = new Map<
    number,
    {
      playerId: number;
      playerName: string;
      gamesPlayed: number;
      minutes: number;
      points: number;
      rebounds: number;
      assists: number;
      steals: number;
      blocks: number;
      turnovers: number;
      fgMade: number;
      fgAttempted: number;
      threeMade: number;
      threeAttempted: number;
      ftMade: number;
      ftAttempted: number;
      fgPctSum: number;
      threePctSum: number;
      ftPctSum: number;
    }
  >();

  let gamesPlayed = 0;
  let wins = 0;
  let losses = 0;
  let pointsTotal = 0;
  let reboundsTotal = 0;
  let assistsTotal = 0;
  let blocksTotal = 0;
  let stealsTotal = 0;
  let turnoversTotal = 0;
  let offensiveReboundsTotal = 0;
  let defensiveReboundsTotal = 0;
  let fieldGoalsAttemptedTotal = 0;
  let fieldGoalsMadeTotal = 0;
  let freeThrowsAttemptedTotal = 0;
  let freeThrowsMadeTotal = 0;
  let threePointersAttemptedTotal = 0;
  let threePointersMadeTotal = 0;
  let personalFoulsTotal = 0;

  let opponentPointsTotal = 0;
  let opponentReboundsTotal = 0;
  let opponentAssistsTotal = 0;
  let opponentBlocksTotal = 0;
  let opponentStealsTotal = 0;
  let opponentTurnoversTotal = 0;
  let opponentOffensiveReboundsTotal = 0;
  let opponentDefensiveReboundsTotal = 0;
  let opponentFieldGoalsAttemptedTotal = 0;
  let opponentFieldGoalsMadeTotal = 0;
  let opponentFreeThrowsAttemptedTotal = 0;
  let opponentFreeThrowsMadeTotal = 0;
  let opponentThreePointersAttemptedTotal = 0;
  let opponentThreePointersMadeTotal = 0;
  let opponentPersonalFoulsTotal = 0;

  let possessionsTotal = 0;
  let teamMinutesTotal = 0;
  let homeWins = 0;
  let homeLosses = 0;
  let awayWins = 0;
  let awayLosses = 0;

  validGames.forEach((game: any) => {
    const isHome = Number(game.homeTeam?.teamId) === teamId;
    const teamNode = isHome ? game.homeTeam : game.awayTeam;
    const opponentNode = isHome ? game.awayTeam : game.homeTeam;

    if (!teamNode || !opponentNode) return;

    const teamScore = num(teamNode.score, 0);
    const opponentScore = num(opponentNode.score, 0);
    const won = teamScore > opponentScore;

    gamesPlayed += 1;
    wins += won ? 1 : 0;
    losses += won ? 0 : 1;

    if (isHome) {
      homeWins += won ? 1 : 0;
      homeLosses += won ? 0 : 1;
    } else {
      awayWins += won ? 1 : 0;
      awayLosses += won ? 0 : 1;
    }

    const teamStats = teamNode.statistics ?? {};
    const opponentStats = opponentNode.statistics ?? {};

    pointsTotal += num(teamStats.points, teamScore);
    reboundsTotal += num(teamStats.reboundsTotal, num(teamStats.rebounds, 0));
    assistsTotal += num(teamStats.assists, 0);
    blocksTotal += num(teamStats.blocks, 0);
    stealsTotal += num(teamStats.steals, 0);
    turnoversTotal += num(
      teamStats.turnoversTotal,
      num(teamStats.turnovers, 0),
    );
    offensiveReboundsTotal += num(teamStats.reboundsOffensive, 0);
    defensiveReboundsTotal += num(teamStats.reboundsDefensive, 0);
    fieldGoalsAttemptedTotal += num(teamStats.fieldGoalsAttempted, 0);
    fieldGoalsMadeTotal += num(teamStats.fieldGoalsMade, 0);
    freeThrowsAttemptedTotal += num(teamStats.freeThrowsAttempted, 0);
    freeThrowsMadeTotal += num(teamStats.freeThrowsMade, 0);
    threePointersAttemptedTotal += num(teamStats.threePointersAttempted, 0);
    threePointersMadeTotal += num(teamStats.threePointersMade, 0);
    personalFoulsTotal += num(teamStats.foulsPersonal, 0);

    opponentPointsTotal += num(opponentStats.points, opponentScore);
    opponentReboundsTotal += num(
      opponentStats.reboundsTotal,
      num(opponentStats.rebounds, 0),
    );
    opponentAssistsTotal += num(opponentStats.assists, 0);
    opponentBlocksTotal += num(opponentStats.blocks, 0);
    opponentStealsTotal += num(opponentStats.steals, 0);
    opponentTurnoversTotal += num(
      opponentStats.turnoversTotal,
      num(opponentStats.turnovers, 0),
    );
    opponentOffensiveReboundsTotal += num(opponentStats.reboundsOffensive, 0);
    opponentDefensiveReboundsTotal += num(opponentStats.reboundsDefensive, 0);
    opponentFieldGoalsAttemptedTotal += num(
      opponentStats.fieldGoalsAttempted,
      0,
    );
    opponentFieldGoalsMadeTotal += num(opponentStats.fieldGoalsMade, 0);
    opponentFreeThrowsAttemptedTotal += num(
      opponentStats.freeThrowsAttempted,
      0,
    );
    opponentFreeThrowsMadeTotal += num(opponentStats.freeThrowsMade, 0);
    opponentThreePointersAttemptedTotal += num(
      opponentStats.threePointersAttempted,
      0,
    );
    opponentThreePointersMadeTotal += num(opponentStats.threePointersMade, 0);
    opponentPersonalFoulsTotal += num(opponentStats.foulsPersonal, 0);

    const teamPossessions =
      num(teamStats.fieldGoalsAttempted, 0) +
      0.44 * num(teamStats.freeThrowsAttempted, 0) -
      num(teamStats.reboundsOffensive, 0) +
      num(teamStats.turnoversTotal, num(teamStats.turnovers, 0));
    const opponentPossessions =
      num(opponentStats.fieldGoalsAttempted, 0) +
      0.44 * num(opponentStats.freeThrowsAttempted, 0) -
      num(opponentStats.reboundsOffensive, 0) +
      num(opponentStats.turnoversTotal, num(opponentStats.turnovers, 0));

    possessionsTotal += (teamPossessions + opponentPossessions) / 2;
    teamMinutesTotal += parseMinutesToDecimal(teamStats.minutes);

    const players = Array.isArray(teamNode.players) ? teamNode.players : [];
    players.forEach((player: any) => {
      const playerId = num(player.personId ?? player.playerId, 0);
      if (!playerId) return;

      const playerStats = player.statistics ?? {};
      const playerName =
        String(player.name ?? player.nameI ?? "").trim() ||
        `${String(player.firstName ?? "").trim()} ${String(
          player.familyName ?? "",
        ).trim()}`.trim() ||
        "Unknown";

      const existing = playerAccumulator.get(playerId) ?? {
        playerId,
        playerName,
        gamesPlayed: 0,
        minutes: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fgMade: 0,
        fgAttempted: 0,
        threeMade: 0,
        threeAttempted: 0,
        ftMade: 0,
        ftAttempted: 0,
        fgPctSum: 0,
        threePctSum: 0,
        ftPctSum: 0,
      };

      existing.gamesPlayed += 1;
      existing.minutes += parseMinutesToDecimal(playerStats.minutes);
      existing.points += num(playerStats.points, 0);
      existing.rebounds += num(
        playerStats.reboundsTotal,
        num(playerStats.rebounds, 0),
      );
      existing.assists += num(playerStats.assists, 0);
      existing.steals += num(playerStats.steals, 0);
      existing.blocks += num(playerStats.blocks, 0);
      existing.turnovers += num(playerStats.turnovers, 0);

      existing.fgMade += num(playerStats.fieldGoalsMade, 0);
      existing.fgAttempted += num(playerStats.fieldGoalsAttempted, 0);
      existing.threeMade += num(playerStats.threePointersMade, 0);
      existing.threeAttempted += num(playerStats.threePointersAttempted, 0);
      existing.ftMade += num(playerStats.freeThrowsMade, 0);
      existing.ftAttempted += num(playerStats.freeThrowsAttempted, 0);

      existing.fgPctSum += toPercent(playerStats.fieldGoalsPercentage);
      existing.threePctSum += toPercent(playerStats.threePointersPercentage);
      existing.ftPctSum += toPercent(playerStats.freeThrowsPercentage);

      playerAccumulator.set(playerId, existing);
    });
  });

  if (!gamesPlayed) {
    throw new Error("Unable to build fallback stats");
  }

  const playerStats = [...playerAccumulator.values()]
    .map((player) => {
      const gp = Math.max(player.gamesPlayed, 1);
      const fgPct =
        player.fgAttempted > 0
          ? player.fgMade / player.fgAttempted
          : player.fgPctSum / gp;
      const threePtPct =
        player.threeAttempted > 0
          ? player.threeMade / player.threeAttempted
          : player.threePctSum / gp;
      const ftPct =
        player.ftAttempted > 0
          ? player.ftMade / player.ftAttempted
          : player.ftPctSum / gp;

      return {
        playerId: player.playerId,
        playerName: player.playerName,
        gamesPlayed: player.gamesPlayed,
        minutes: player.minutes / gp,
        points: player.points / gp,
        rebounds: player.rebounds / gp,
        assists: player.assists / gp,
        steals: player.steals / gp,
        blocks: player.blocks / gp,
        turnovers: player.turnovers / gp,
        fgPct,
        threePtPct,
        ftPct,
      };
    })
    .sort((a, b) => b.points - a.points);

  const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);
  const perGame = (value: number) => value / gamesPlayed;

  const fgPct = safeDiv(fieldGoalsMadeTotal, fieldGoalsAttemptedTotal);
  const fg3Pct = safeDiv(threePointersMadeTotal, threePointersAttemptedTotal);
  const ftPct = safeDiv(freeThrowsMadeTotal, freeThrowsAttemptedTotal);

  const oppFgPct = safeDiv(
    opponentFieldGoalsMadeTotal,
    opponentFieldGoalsAttemptedTotal,
  );
  const oppFg3Pct = safeDiv(
    opponentThreePointersMadeTotal,
    opponentThreePointersAttemptedTotal,
  );
  const oppFtPct = safeDiv(
    opponentFreeThrowsMadeTotal,
    opponentFreeThrowsAttemptedTotal,
  );

  const teamEFGPct = safeDiv(
    fieldGoalsMadeTotal + 0.5 * threePointersMadeTotal,
    fieldGoalsAttemptedTotal,
  );
  const oppEFGPct = safeDiv(
    opponentFieldGoalsMadeTotal + 0.5 * opponentThreePointersMadeTotal,
    opponentFieldGoalsAttemptedTotal,
  );

  const teamTovDen =
    fieldGoalsAttemptedTotal + 0.44 * freeThrowsAttemptedTotal + turnoversTotal;
  const oppTovDen =
    opponentFieldGoalsAttemptedTotal +
    0.44 * opponentFreeThrowsAttemptedTotal +
    opponentTurnoversTotal;

  const teamTovPct = safeDiv(turnoversTotal, teamTovDen);
  const oppTovPct = safeDiv(opponentTurnoversTotal, oppTovDen);

  const orbPct = safeDiv(
    offensiveReboundsTotal,
    offensiveReboundsTotal + opponentDefensiveReboundsTotal,
  );
  const drbPct = safeDiv(
    defensiveReboundsTotal,
    defensiveReboundsTotal + opponentOffensiveReboundsTotal,
  );

  const offensiveRating = safeDiv(pointsTotal * 100, possessionsTotal);
  const defensiveRating = safeDiv(opponentPointsTotal * 100, possessionsTotal);
  const pace = safeDiv(possessionsTotal * 48, teamMinutesTotal / 5);

  const fallbackTables = {
    teamPerGame: {
      GP: gamesPlayed,
      PPG: roundTo(pointsTotal / gamesPlayed, 1),
      RPG: roundTo(reboundsTotal / gamesPlayed, 1),
      APG: roundTo(assistsTotal / gamesPlayed, 1),
      BPG: roundTo(perGame(blocksTotal), 1),
      SPG: roundTo(perGame(stealsTotal), 1),
      TOV: roundTo(perGame(turnoversTotal), 1),
      ORPG: roundTo(perGame(offensiveReboundsTotal), 1),
      DRPG: roundTo(perGame(defensiveReboundsTotal), 1),
      FG_PCT: formatPct(fgPct),
      FG3_PCT: formatPct(fg3Pct),
      FT_PCT: formatPct(ftPct),
      FG3A: roundTo(perGame(threePointersAttemptedTotal), 1),
      FG3M: roundTo(perGame(threePointersMadeTotal), 1),
      FGA: roundTo(perGame(fieldGoalsAttemptedTotal), 1),
      FGM: roundTo(perGame(fieldGoalsMadeTotal), 1),
      FTA: roundTo(perGame(freeThrowsAttemptedTotal), 1),
      FTM: roundTo(perGame(freeThrowsMadeTotal), 1),
      PF: roundTo(perGame(personalFoulsTotal), 1),
    },
    teamTotals: {
      GP: gamesPlayed,
      PPG: roundTo(pointsTotal, 0),
      RPG: roundTo(reboundsTotal, 0),
      APG: roundTo(assistsTotal, 0),
      BPG: roundTo(blocksTotal, 0),
      SPG: roundTo(stealsTotal, 0),
      TOV: roundTo(turnoversTotal, 0),
      ORPG: roundTo(offensiveReboundsTotal, 0),
      DRPG: roundTo(defensiveReboundsTotal, 0),
      FG_PCT: formatPct(fgPct),
      FG3_PCT: formatPct(fg3Pct),
      FT_PCT: formatPct(ftPct),
      FG3A: roundTo(threePointersAttemptedTotal, 0),
      FG3M: roundTo(threePointersMadeTotal, 0),
      FGA: roundTo(fieldGoalsAttemptedTotal, 0),
      FGM: roundTo(fieldGoalsMadeTotal, 0),
      FTA: roundTo(freeThrowsAttemptedTotal, 0),
      FTM: roundTo(freeThrowsMadeTotal, 0),
      PF: roundTo(personalFoulsTotal, 0),
    },
    opponentPerGame: {
      GP: gamesPlayed,
      PPG: roundTo(opponentPointsTotal / gamesPlayed, 1),
      RPG: roundTo(opponentReboundsTotal / gamesPlayed, 1),
      APG: roundTo(opponentAssistsTotal / gamesPlayed, 1),
      BPG: roundTo(perGame(opponentBlocksTotal), 1),
      SPG: roundTo(perGame(opponentStealsTotal), 1),
      TOV: roundTo(perGame(opponentTurnoversTotal), 1),
      ORPG: roundTo(perGame(opponentOffensiveReboundsTotal), 1),
      DRPG: roundTo(perGame(opponentDefensiveReboundsTotal), 1),
      FG_PCT: formatPct(oppFgPct),
      FG3_PCT: formatPct(oppFg3Pct),
      FT_PCT: formatPct(oppFtPct),
      FG3A: roundTo(perGame(opponentThreePointersAttemptedTotal), 1),
      FG3M: roundTo(perGame(opponentThreePointersMadeTotal), 1),
      FGA: roundTo(perGame(opponentFieldGoalsAttemptedTotal), 1),
      FGM: roundTo(perGame(opponentFieldGoalsMadeTotal), 1),
      FTA: roundTo(perGame(opponentFreeThrowsAttemptedTotal), 1),
      FTM: roundTo(perGame(opponentFreeThrowsMadeTotal), 1),
      PF: roundTo(perGame(opponentPersonalFoulsTotal), 1),
    },
    advanced: {
      ORtg: roundTo(offensiveRating, 1),
      DRtg: roundTo(defensiveRating, 1),
      Pace: roundTo(pace, 1),
      eFG_PCT: formatPct(teamEFGPct),
      Opp_eFG_PCT: formatPct(oppEFGPct),
      DRB_PCT: formatPct(drbPct),
      ORB_PCT: formatPct(orbPct),
      TOV_PCT: formatPct(teamTovPct),
      Opp_TOV_PCT: formatPct(oppTovPct),
    },
    fieldAudit: buildFieldAudit(
      [
        "cdn.nba.com/staticData/scheduleLeagueV2_1.json",
        "cdn.nba.com/liveData/boxscore/boxscore_{gameId}.json",
      ],
      [
        {
          field: "teamPerGameTable",
          sourceEndpoint: null,
          sourceKey: null,
          available: true,
          previousFormat: "summary cards only",
          formattedAs: "derived row fallback from CDN boxscores",
          note: "Some columns are unavailable in fallback and default to 0/0.0%.",
        },
        {
          field: "teamTotalsTable",
          sourceEndpoint: null,
          sourceKey: null,
          available: true,
          previousFormat: "not present",
          formattedAs: "derived row fallback from CDN boxscores",
          note: "Some columns are unavailable in fallback and default to 0/0.0%.",
        },
        {
          field: "opponentPerGameTable",
          sourceEndpoint: null,
          sourceKey: null,
          available: true,
          previousFormat: "not present",
          formattedAs: "derived row fallback from CDN boxscores",
          note: "Some columns are unavailable in fallback and default to 0/0.0%.",
        },
        {
          field: "advancedStatsTable",
          sourceEndpoint: null,
          sourceKey: null,
          available: true,
          previousFormat: "off/def/net/pace summary only",
          formattedAs: "derived row fallback from CDN boxscores",
          note: "Derived via possession-based estimates from team/opponent boxscore totals.",
        },
      ],
    ),
  };

  return {
    teamMetrics: {
      gamesPlayed,
      wins,
      losses,
      pointsPerGame: pointsTotal / gamesPlayed,
      reboundsPerGame: reboundsTotal / gamesPlayed,
      assistsPerGame: assistsTotal / gamesPlayed,
    },
    homeAwaySplits: {
      home: {
        wins: homeWins,
        losses: homeLosses,
      },
      away: {
        wins: awayWins,
        losses: awayLosses,
      },
    },
    playerStats,
    tables: fallbackTables,
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
    { cache: "no-store" },
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
      const homeTeamId = Number(game.homeTeam?.teamId ?? 0);
      const awayTeamId = Number(game.awayTeam?.teamId ?? 0);
      const homeMeta = TEAM_META[homeTeamId];
      const awayMeta = TEAM_META[awayTeamId];
      const isoDate = String(game.gameDateTimeUTC ?? game.gameDateEst ?? "");
      const formattedDateTime = formatDateTimeShort(isoDate);

      return {
        gameId: String(game.gameId),
        gameDate: isoDate,
        gameDateDisplay: formattedDateTime.date,
        gameTime: String(game.gameStatusText ?? ""),
        gameTimeDisplay: formattedDateTime.time,
        homeTeamId,
        awayTeamId,
        homeTeamName: homeMeta
          ? `${homeMeta.city} ${homeMeta.name}`
          : String(game.homeTeam?.teamName ?? "TBD"),
        awayTeamName: awayMeta
          ? `${awayMeta.city} ${awayMeta.name}`
          : String(game.awayTeam?.teamName ?? "TBD"),
        homeTeamTricode: String(
          game.homeTeam?.teamTricode ?? homeMeta?.tricode ?? "TBD",
        ),
        awayTeamTricode: String(
          game.awayTeam?.teamTricode ?? awayMeta?.tricode ?? "TBD",
        ),
        opponentTeamId: opponentId,
        opponentTricode: String(
          opponent?.teamTricode ?? meta?.tricode ?? "TBD",
        ),
        opponentName: meta ? `${meta.city} ${meta.name}` : "TBD",
        homeAway: isHome ? "Home" : "Away",
        status: String(game.gameStatusText ?? "Scheduled"),
      };
    });

  const fieldAudit = buildFieldAudit(
    ["cdn.nba.com/staticData/scheduleLeagueV2_1.json"],
    [
      {
        field: "homeTeam",
        sourceEndpoint: "cdn.nba.com/staticData/scheduleLeagueV2_1.json",
        sourceKey: "homeTeam.teamId/teamTricode/teamName",
        available: games.every((game: any) => Boolean(game.homeTeamName)),
        previousFormat: "team-perspective matchup string",
        formattedAs: "homeTeamName/homeTeamTricode explicit fields",
      },
      {
        field: "awayTeam",
        sourceEndpoint: "cdn.nba.com/staticData/scheduleLeagueV2_1.json",
        sourceKey: "awayTeam.teamId/teamTricode/teamName",
        available: games.every((game: any) => Boolean(game.awayTeamName)),
        previousFormat: "team-perspective matchup string",
        formattedAs: "awayTeamName/awayTeamTricode explicit fields",
      },
      {
        field: "date",
        sourceEndpoint: "cdn.nba.com/staticData/scheduleLeagueV2_1.json",
        sourceKey: "gameDateTimeUTC",
        available: games.every((game: any) => Boolean(game.gameDateDisplay)),
        previousFormat: "raw ISO string",
        formattedAs: "gameDateDisplay (MMM D, YYYY)",
      },
      {
        field: "time",
        sourceEndpoint: "cdn.nba.com/staticData/scheduleLeagueV2_1.json",
        sourceKey: "gameDateTimeUTC",
        available: games.every((game: any) => Boolean(game.gameTimeDisplay)),
        previousFormat: "gameStatusText",
        formattedAs: "gameTimeDisplay (h:mm AM/PM TZ)",
      },
    ],
  );

  return { teamId, games, fieldAudit };
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
    const opponentTeamId = resolveOpponentTeamId(matchup);
    const opponentMeta = TEAM_META[opponentTeamId];
    const teamMeta = TEAM_META[teamId];
    const isHome = inferHomeAway(matchup) === "Home";
    const formattedDate = formatDateShort(
      String(getValueFromRow(row, gameLogSet.headers, "GAME_DATE") ?? ""),
    );

    const homeTeamName = isHome
      ? `${teamMeta.city} ${teamMeta.name}`
      : opponentMeta
        ? `${opponentMeta.city} ${opponentMeta.name}`
        : opponentTricode;
    const awayTeamName = isHome
      ? opponentMeta
        ? `${opponentMeta.city} ${opponentMeta.name}`
        : opponentTricode
      : `${teamMeta.city} ${teamMeta.name}`;

    const homeTeamScore = isHome ? teamPts : oppPts;
    const awayTeamScore = isHome ? oppPts : teamPts;

    return {
      gameId: String(getValueFromRow(row, gameLogSet.headers, "Game_ID") ?? ""),
      gameDate: String(
        getValueFromRow(row, gameLogSet.headers, "GAME_DATE") ?? "",
      ),
      gameDateDisplay: formattedDate,
      homeTeamId: isHome ? teamId : opponentTeamId,
      awayTeamId: isHome ? opponentTeamId : teamId,
      homeTeamName,
      awayTeamName,
      homeTeamTricode: isHome ? teamMeta.tricode : opponentTricode,
      awayTeamTricode: isHome ? opponentTricode : teamMeta.tricode,
      homeTeamScore,
      awayTeamScore,
      opponentTeamId,
      opponentTricode,
      opponentName: opponentMeta
        ? `${opponentMeta.city} ${opponentMeta.name}`
        : opponentTricode,
      homeAway: inferHomeAway(matchup),
      status: "Final",
      finalScore: `${homeTeamScore}-${awayTeamScore}`,
      result: result === "W" ? "W" : "L",
    };
  });

  const fieldAudit = buildFieldAudit(
    ["stats.nba.com/teamgamelog"],
    [
      {
        field: "homeTeam",
        sourceEndpoint: "stats.nba.com/teamgamelog",
        sourceKey: "MATCHUP + TeamID",
        available: games.every((game: any) => Boolean(game.homeTeamName)),
        previousFormat: "team-perspective matchup string",
        formattedAs: "homeTeamName/homeTeamTricode explicit fields",
      },
      {
        field: "awayTeam",
        sourceEndpoint: "stats.nba.com/teamgamelog",
        sourceKey: "MATCHUP + TeamID",
        available: games.every((game: any) => Boolean(game.awayTeamName)),
        previousFormat: "team-perspective matchup string",
        formattedAs: "awayTeamName/awayTeamTricode explicit fields",
      },
      {
        field: "finalScore",
        sourceEndpoint: "stats.nba.com/teamgamelog",
        sourceKey: "PTS + PTS_OPP + MATCHUP",
        available: games.every((game: any) => Boolean(game.finalScore)),
        previousFormat: "teamPts-oppPts from team perspective",
        formattedAs: "home-away scoreboard order",
      },
      {
        field: "date",
        sourceEndpoint: "stats.nba.com/teamgamelog",
        sourceKey: "GAME_DATE",
        available: games.every((game: any) => Boolean(game.gameDateDisplay)),
        previousFormat: "raw GAME_DATE",
        formattedAs: "gameDateDisplay (MMM D, YYYY)",
      },
    ],
  );

  return { teamId, games, fieldAudit };
}

const sectionError = (
  section: string,
  fallbackMessage: string,
  error?: any,
) => ({
  code: "TEAM_SECTION_FAILED",
  message:
    PROD_ERROR_MESSAGES[section as keyof typeof PROD_ERROR_MESSAGES] ??
    fallbackMessage,
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
  const include = parseInclude(
    request.nextUrl.searchParams.get("include"),
    tab,
  );

  try {
    const sectionBuilders: Record<TeamSection, () => Promise<any>> = {
      overview: () => buildOverview(teamId),
      stats: () => buildStats(teamId),
      roster: () => buildRoster(teamId),
      schedule: () => buildSchedule(teamId),
      results: () => buildResults(teamId),
    };

    const sectionResults = await Promise.allSettled(
      include.map((section) => sectionBuilders[section]()),
    );

    const payload: Record<string, unknown> = {
      teamId,
      tab,
      seasonType: "Regular Season",
      include,
    };

    include.forEach((section, index) => {
      const result = sectionResults[index];
      payload[section] =
        result.status === "fulfilled"
          ? result.value
          : sectionError(
              section,
              `Failed to fetch team ${section}`,
              result.reason,
            );
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("aggregate route failed", error);
    return NextResponse.json(
      {
        code: "TEAM_AGGREGATE_FAILED",
        message: PROD_ERROR_MESSAGES.aggregate,
        section: "aggregate",
      },
      { status: 500 },
    );
  }
}
