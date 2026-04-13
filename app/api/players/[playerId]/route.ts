import { NextRequest, NextResponse } from "next/server";
import { fetchStatsApi } from "@/app/lib/statsApi";
import {
  CURRENT_SEASON,
  TEAM_META,
  parseSeason,
  parseSeasonType,
} from "@/app/lib/teams";
import { parsePlayerId, parsePlayerTab } from "@/app/lib/players";
import { getValueFromRow, num } from "@/app/lib/teamData";
import type { PlayerSection } from "@/app/types/player";

export const dynamic = "force-dynamic";

const PROD_ERROR_MESSAGES = {
  header:
    "Player details are temporarily unavailable. Please try again shortly.",
  overview:
    "Player overview is temporarily unavailable. Please try again shortly.",
  stats:
    "Player season stats are temporarily unavailable. Please try again shortly.",
  gameLog:
    "Player game log is temporarily unavailable. Please try again shortly.",
  aggregate:
    "We could not load this player page right now. Please refresh and try again.",
} as const;

const ALL_SECTIONS: PlayerSection[] = [
  "header",
  "overview",
  "stats",
  "gameLog",
];

const DASHBOARD_COMMON_PARAMS: Record<string, string | number> = {
  DateFrom: "",
  DateTo: "",
  GameSegment: "",
  LastNGames: 0,
  LeagueID: "00",
  Location: "",
  MeasureType: "Base",
  Month: 0,
  OpponentTeamID: 0,
  Outcome: "",
  PORound: 0,
  PaceAdjust: "N",
  PerMode: "PerGame",
  Period: 0,
  PlusMinus: "N",
  Rank: "N",
  Season: CURRENT_SEASON,
  SeasonSegment: "",
  SeasonType: "Regular Season",
  ShotClockRange: "",
  Split: "y",
  VsConference: "",
  VsDivision: "",
};

function buildDashboardParams(
  playerId: number,
  overrides: Record<string, string | number>,
) {
  return {
    ...DASHBOARD_COMMON_PARAMS,
    PlayerID: playerId,
    ...overrides,
  };
}

function normalizeSection(raw: string): PlayerSection | null {
  if (raw === "header") return "header";
  if (raw === "overview") return "overview";
  if (raw === "stats") return "stats";
  if (raw === "gamelog" || raw === "game-log" || raw === "gamelogs") {
    return "gameLog";
  }
  return null;
}

function parseInclude(
  raw: string | null,
  tab: ReturnType<typeof parsePlayerTab>,
): PlayerSection[] {
  if (!raw) return ["header", "overview"];

  const normalized = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (!normalized.length) return ["header", "overview"];
  if (normalized.includes("all")) return ALL_SECTIONS;

  if (normalized.includes("auto")) {
    if (tab === "stats") return ["header", "stats"];
    if (tab === "game-log") return ["header", "gameLog"];
    return ["header", "overview"];
  }

  const requested = normalized
    .map(normalizeSection)
    .filter((value): value is PlayerSection => Boolean(value));

  return requested.length ? [...new Set(requested)] : ["header", "overview"];
}

function pickResultSetByName(
  data: any,
  preferredNames: string[],
): { headers: string[]; rowSet: any[] } {
  const allResultSets = Array.isArray(data?.resultSets)
    ? data.resultSets
    : data?.resultSet
      ? [data.resultSet]
      : [];

  if (!allResultSets.length) {
    return { headers: [], rowSet: [] };
  }

  const target = allResultSets.find((set: any) => {
    const name = String(set?.name ?? set?.Name ?? "").toLowerCase();
    return preferredNames.some((candidate) => candidate.toLowerCase() === name);
  });

  const selected = target ?? allResultSets[0];
  return {
    headers: selected?.headers ?? [],
    rowSet: selected?.rowSet ?? [],
  };
}

function getFirstPresentValue(
  row: any[],
  headers: string[],
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = getValueFromRow(row, headers, key);
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

function parseMinutes(raw: unknown): number {
  const value = String(raw ?? "0:00").trim();
  if (!value.includes(":")) {
    return num(value, 0);
  }

  const [minutesPart, secondsPart] = value.split(":");
  return num(minutesPart, 0) + num(secondsPart, 0) / 60;
}

function parseBirthdate(raw: unknown): Date | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function calculateAge(birthdate: Date | null): number | null {
  if (!birthdate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  const beforeBirthday =
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate());

  if (beforeBirthday) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function parseSeasonStart(seasonId: string): number {
  const [start] = seasonId.split("-");
  return Number(start) || 0;
}

function percentageString(value: unknown): string {
  return `${(num(value, 0) * 100).toFixed(1)}%`;
}

function buildFieldAudit(
  inspectedEndpoints: string[],
  fields: Array<{
    field: string;
    sourceEndpoint: string | null;
    sourceKey: string | null;
    available: boolean;
    previousFormat: string;
    formattedAs: string;
    note?: string;
  }>,
) {
  return {
    inspectedEndpoints,
    fields,
    missingRequiredFields: fields
      .filter((field) => !field.available)
      .map((field) => field.field),
  };
}

function resolveTeamDisplay(
  teamId: number,
  teamTricodeRaw: string,
  teamCityRaw: string,
  teamNameRaw: string,
) {
  const meta = TEAM_META[teamId];
  const tricode = teamTricodeRaw || meta?.tricode || "N/A";
  const teamName = meta
    ? `${meta.city} ${meta.name}`
    : [teamCityRaw, teamNameRaw].filter(Boolean).join(" ") || tricode;

  return {
    teamId,
    teamTricode: tricode,
    teamName,
  };
}

function buildTeamHistory(careerRaw: any) {
  const seasonTotals = pickResultSetByName(careerRaw, [
    "SeasonTotalsRegularSeason",
    "SeasonTotalsRegularSeasonCombined",
  ]);

  const rows = seasonTotals.rowSet;
  const headers = seasonTotals.headers;

  if (!rows.length) {
    return {
      teamsPlayedFor: [] as Array<{
        teamId: number;
        teamName: string;
        teamTricode: string;
      }>,
      seasonTeamHistory: [] as Array<{
        seasonId: string;
        teamId: number;
        teamName: string;
        teamTricode: string;
        isTotalRow: boolean;
      }>,
    };
  }

  const seasonMap = new Map<
    string,
    Array<{
      seasonId: string;
      teamId: number;
      teamName: string;
      teamTricode: string;
      isTotalRow: boolean;
    }>
  >();

  for (const row of rows) {
    const seasonId = String(getValueFromRow(row, headers, "SEASON_ID") ?? "");
    if (!seasonId) continue;

    const teamId = num(getValueFromRow(row, headers, "TEAM_ID"), 0);
    const teamTricodeRaw = String(
      getFirstPresentValue(row, headers, [
        "TEAM_ABBREVIATION",
        "TEAM_ABBREV",
      ]) ?? "",
    );
    const teamCityRaw = String(
      getValueFromRow(row, headers, "TEAM_CITY") ?? "",
    );
    const teamNameRaw = String(
      getValueFromRow(row, headers, "TEAM_NAME") ?? "",
    );

    const isTotalRow = teamTricodeRaw.toUpperCase() === "TOT";
    const teamDisplay = resolveTeamDisplay(
      teamId,
      teamTricodeRaw,
      teamCityRaw,
      teamNameRaw,
    );

    const seasonRows = seasonMap.get(seasonId) ?? [];
    seasonRows.push({
      seasonId,
      teamId: teamDisplay.teamId,
      teamName: teamDisplay.teamName,
      teamTricode: teamDisplay.teamTricode,
      isTotalRow,
    });
    seasonMap.set(seasonId, seasonRows);
  }

  const sortedSeasons = [...seasonMap.keys()].sort(
    (a, b) => parseSeasonStart(a) - parseSeasonStart(b),
  );

  const seasonTeamHistory: Array<{
    seasonId: string;
    teamId: number;
    teamName: string;
    teamTricode: string;
    isTotalRow: boolean;
  }> = [];

  for (const seasonId of sortedSeasons) {
    const entries = seasonMap.get(seasonId) ?? [];
    const teamSpecific = entries
      .filter((entry) => !entry.isTotalRow)
      .sort((a, b) => a.teamTricode.localeCompare(b.teamTricode));

    // If the player was traded in-season, career rows usually include a TOT row
    // plus team rows. We deterministically drop TOT whenever team rows exist to
    // avoid duplicate/confusing history entries for the same season.
    const resolvedSeasonEntries =
      teamSpecific.length > 0 ? teamSpecific : entries.slice(0, 1);

    seasonTeamHistory.push(...resolvedSeasonEntries);
  }

  const seenTeams = new Set<number>();
  const teamsPlayedFor: Array<{
    teamId: number;
    teamName: string;
    teamTricode: string;
  }> = [];

  for (const entry of seasonTeamHistory) {
    if (entry.teamId <= 0 || seenTeams.has(entry.teamId)) continue;
    seenTeams.add(entry.teamId);
    teamsPlayedFor.push({
      teamId: entry.teamId,
      teamName: entry.teamName,
      teamTricode: entry.teamTricode,
    });
  }

  return {
    teamsPlayedFor,
    seasonTeamHistory,
  };
}

function buildCurrentSeasonBasic(gameLogRaw: any) {
  const gameLog = pickResultSetByName(gameLogRaw, ["PlayerGameLog"]);
  const rows = gameLog.rowSet;

  const gamesPlayed = rows.length;
  const wins = rows.filter(
    (row: any[]) =>
      String(getValueFromRow(row, gameLog.headers, "WL") ?? "") === "W",
  ).length;
  const losses = Math.max(gamesPlayed - wins, 0);

  const sum = (key: string) =>
    rows.reduce(
      (total: number, row: any[]) =>
        total + num(getValueFromRow(row, gameLog.headers, key), 0),
      0,
    );

  const avg = (value: number) => (gamesPlayed > 0 ? value / gamesPlayed : 0);

  const minuteTotal = rows.reduce(
    (total: number, row: any[]) =>
      total + parseMinutes(getValueFromRow(row, gameLog.headers, "MIN")),
    0,
  );

  return {
    gamesPlayed,
    wins,
    losses,
    minutes: avg(minuteTotal),
    points: avg(sum("PTS")),
    rebounds: avg(sum("REB")),
    assists: avg(sum("AST")),
    steals: avg(sum("STL")),
    blocks: avg(sum("BLK")),
    turnovers: avg(sum("TOV")),
    fgm: avg(sum("FGM")),
    fga: avg(sum("FGA")),
    threePtMade: avg(sum("FG3M")),
    threePtAttempted: avg(sum("FG3A")),
    ftm: avg(sum("FTM")),
    fta: avg(sum("FTA")),
    fgPct: avg(sum("FG_PCT")),
    threePtPct: avg(sum("FG3_PCT")),
    ftPct: avg(sum("FT_PCT")),
  };
}

function buildCareerBasic(careerRaw: any) {
  const totals = pickResultSetByName(careerRaw, ["CareerTotalsRegularSeason"]);
  const row = totals.rowSet[0] ?? null;

  if (!row) {
    return null;
  }

  const gp = num(getValueFromRow(row, totals.headers, "GP"), 0);

  return {
    gamesPlayed: gp,
    minutes: num(getValueFromRow(row, totals.headers, "MIN"), 0),
    points: num(getValueFromRow(row, totals.headers, "PTS"), 0),
    rebounds: num(getValueFromRow(row, totals.headers, "REB"), 0),
    assists: num(getValueFromRow(row, totals.headers, "AST"), 0),
    steals: num(getValueFromRow(row, totals.headers, "STL"), 0),
    blocks: num(getValueFromRow(row, totals.headers, "BLK"), 0),
    turnovers: num(getValueFromRow(row, totals.headers, "TOV"), 0),
    fgm: num(getValueFromRow(row, totals.headers, "FGM"), 0),
    fga: num(getValueFromRow(row, totals.headers, "FGA"), 0),
    threePtMade: num(getValueFromRow(row, totals.headers, "FG3M"), 0),
    threePtAttempted: num(getValueFromRow(row, totals.headers, "FG3A"), 0),
    ftm: num(getValueFromRow(row, totals.headers, "FTM"), 0),
    fta: num(getValueFromRow(row, totals.headers, "FTA"), 0),
    fgPct: num(getValueFromRow(row, totals.headers, "FG_PCT"), 0),
    threePtPct: num(getValueFromRow(row, totals.headers, "FG3_PCT"), 0),
    ftPct: num(getValueFromRow(row, totals.headers, "FT_PCT"), 0),
  };
}

function buildCareerHighs(careerRaw: any) {
  const highs = pickResultSetByName(careerRaw, ["CareerHighs"]);
  if (!highs.rowSet.length) return [];

  const maxByStat = new Map<
    string,
    {
      value: number;
      gameDate: string | null;
      opponentTricode: string | null;
    }
  >();

  for (const row of highs.rowSet) {
    const stat = String(getValueFromRow(row, highs.headers, "STAT") ?? "")
      .trim()
      .toUpperCase();
    if (!stat) continue;

    const statValue = num(getValueFromRow(row, highs.headers, "STAT_VALUE"), 0);
    const gameDate =
      String(getValueFromRow(row, highs.headers, "GAME_DATE") ?? "").trim() ||
      null;
    const opponentTricode =
      String(
        getValueFromRow(row, highs.headers, "VS_TEAM_ABBREVIATION") ?? "",
      ).trim() || null;
    const existing = maxByStat.get(stat);

    if (!existing || statValue > existing.value) {
      maxByStat.set(stat, {
        value: statValue,
        gameDate,
        opponentTricode,
      });
    }
  }

  const metrics = [
    { label: "PTS", key: "PTS" },
    { label: "REB", key: "REB" },
    { label: "AST", key: "AST" },
    { label: "STL", key: "STL" },
    { label: "BLK", key: "BLK" },
    { label: "FGM", key: "FGM" },
    { label: "FGA", key: "FGA" },
    { label: "3PM", key: "FG3M" },
    { label: "3PA", key: "FG3A" },
    { label: "FTM", key: "FTM" },
    { label: "FTA", key: "FTA" },
  ];

  return metrics.map((metric) => {
    const found = maxByStat.get(metric.key);
    return {
      label: metric.label,
      value: found?.value ?? 0,
      gameDate: found?.gameDate ?? null,
      opponentTricode: found?.opponentTricode ?? null,
    };
  });
}

function buildAwards(awardsRaw: any) {
  const awards = pickResultSetByName(awardsRaw, ["PlayerAwards"]);
  const groupedAwards = new Map<
    string,
    {
      count: number;
      years: Set<string>;
    }
  >();

  for (const row of awards.rowSet) {
    const rawLabel = String(
      getFirstPresentValue(row, awards.headers, ["DESCRIPTION", "AWARD"]) ?? "",
    )
      .replace(/\s+/g, " ")
      .trim();
    const season = String(
      getFirstPresentValue(row, awards.headers, ["SEASON", "YEAR"]) ?? "",
    ).trim();

    if (!rawLabel) continue;

    const existing = groupedAwards.get(rawLabel) ?? {
      count: 0,
      years: new Set<string>(),
    };
    existing.count += 1;
    if (season) {
      existing.years.add(season);
    }
    groupedAwards.set(rawLabel, existing);
  }

  const grouped = [...groupedAwards.entries()]
    .map(([label, value]) => ({
      label,
      count: value.count,
      years: [...value.years].sort(
        (a, b) => parseSeasonStart(b) - parseSeasonStart(a),
      ),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

  return {
    total: awards.rowSet.length,
    grouped,
  };
}

function buildSeasonRows(
  dashboardRaw: any,
  columns: Array<{ key: string; label: string; isPct?: boolean }>,
) {
  const byYear = pickResultSetByName(dashboardRaw, [
    "ByYearPlayerDashboard",
    "ByYear",
  ]);

  if (!byYear.rowSet.length) {
    return {
      columns: columns.map((column) => column.label),
      rows: [] as Array<Record<string, string | number | null>>,
    };
  }

  const rows = byYear.rowSet
    .map((row: any[]) => {
      const record: Record<string, string | number | null> = {};
      const seasonValue = getFirstPresentValue(row, byYear.headers, [
        "GROUP_VALUE",
        "SEASON",
      ]);
      record.Season = seasonValue ? String(seasonValue) : "--";

      for (const column of columns) {
        const rawValue = getValueFromRow(row, byYear.headers, column.key);

        if (rawValue === null || rawValue === undefined || rawValue === "") {
          record[column.label] = null;
          continue;
        }

        if (column.isPct) {
          record[column.label] = percentageString(rawValue);
          continue;
        }

        const asNumber = Number(rawValue);
        if (Number.isFinite(asNumber)) {
          record[column.label] = Number(asNumber.toFixed(1));
        } else {
          record[column.label] = String(rawValue);
        }
      }

      return record;
    })
    .sort(
      (a, b) =>
        parseSeasonStart(String(b.Season)) - parseSeasonStart(String(a.Season)),
    );

  return {
    columns: ["Season", ...columns.map((column) => column.label)],
    rows,
  };
}

function sectionError(section: PlayerSection) {
  return {
    code: "PLAYER_SECTION_FAILED",
    message: PROD_ERROR_MESSAGES[section] ?? PROD_ERROR_MESSAGES.aggregate,
    section,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const resolvedParams = await params;
  const playerId = parsePlayerId(resolvedParams.playerId);

  if (!playerId) {
    return NextResponse.json(
      {
        code: "INVALID_PLAYER",
        message: "Invalid player id",
        section: "aggregate",
      },
      { status: 404 },
    );
  }

  const tab = parsePlayerTab(request.nextUrl.searchParams.get("tab"));
  const season = parseSeason(request.nextUrl.searchParams.get("season"));
  const seasonType = parseSeasonType(
    request.nextUrl.searchParams.get("seasonType"),
  );
  const include = parseInclude(
    request.nextUrl.searchParams.get("include"),
    tab,
  );

  try {
    let profilePromise: Promise<{ headers: string[]; row: any[] }> | null =
      null;
    const getProfile = async () => {
      if (!profilePromise) {
        profilePromise = fetchStatsApi(
          "commonplayerinfo",
          {
            LeagueID: "00",
            PlayerID: playerId,
          },
          3,
          1800,
        ).then((raw) => {
          const profile = pickResultSetByName(raw, ["CommonPlayerInfo"]);
          const row = profile.rowSet[0] ?? [];

          if (!row.length) {
            throw new Error("PLAYER_NOT_FOUND");
          }

          return {
            headers: profile.headers,
            row,
          };
        });
      }

      return profilePromise;
    };

    let gameLogPromise: Promise<any> | null = null;
    const getGameLog = () => {
      if (!gameLogPromise) {
        gameLogPromise = fetchStatsApi(
          "playergamelog",
          {
            PlayerID: playerId,
            Season: season,
            SeasonType: seasonType,
          },
          3,
          600,
        );
      }
      return gameLogPromise;
    };

    let careerPromise: Promise<any> | null = null;
    const getCareer = () => {
      if (!careerPromise) {
        careerPromise = fetchStatsApi(
          "playercareerstats",
          {
            LeagueID: "00",
            PerMode: "PerGame",
            PlayerID: playerId,
          },
          3,
          1800,
        );
      }
      return careerPromise;
    };

    let awardsPromise: Promise<any> | null = null;
    const getAwards = () => {
      if (!awardsPromise) {
        awardsPromise = fetchStatsApi(
          "playerawards",
          {
            PlayerID: playerId,
          },
          3,
          1800,
        );
      }
      return awardsPromise;
    };

    let basicDashboardPromise: Promise<any> | null = null;
    const getBasicDashboard = () => {
      if (!basicDashboardPromise) {
        basicDashboardPromise = fetchStatsApi(
          "playerdashboardbyyearoveryear",
          buildDashboardParams(playerId, {
            MeasureType: "Base",
            PerMode: "PerGame",
            Season: season,
            SeasonType: seasonType,
          }),
          2,
          1200,
        );
      }
      return basicDashboardPromise;
    };

    let advancedDashboardPromise: Promise<any> | null = null;
    const getAdvancedDashboard = () => {
      if (!advancedDashboardPromise) {
        advancedDashboardPromise = fetchStatsApi(
          "playerdashboardbyyearoveryear",
          buildDashboardParams(playerId, {
            MeasureType: "Advanced",
            PerMode: "PerGame",
            Season: season,
            SeasonType: seasonType,
          }),
          2,
          1200,
        );
      }
      return advancedDashboardPromise;
    };

    let per36DashboardPromise: Promise<any> | null = null;
    const getPer36Dashboard = () => {
      if (!per36DashboardPromise) {
        per36DashboardPromise = fetchStatsApi(
          "playerdashboardbyyearoveryear",
          buildDashboardParams(playerId, {
            MeasureType: "Base",
            PerMode: "Per36",
            Season: season,
            SeasonType: seasonType,
          }),
          2,
          1200,
        );
      }
      return per36DashboardPromise;
    };

    try {
      await getProfile();
    } catch (error) {
      if ((error as Error).message === "PLAYER_NOT_FOUND") {
        return NextResponse.json(
          {
            code: "PLAYER_NOT_FOUND",
            message: "Player not found",
            section: "aggregate",
          },
          { status: 404 },
        );
      }
      throw error;
    }

    const sectionBuilders: Record<PlayerSection, () => Promise<any>> = {
      header: async () => {
        const profile = await getProfile();
        const careerRaw = await getCareer();
        const history = buildTeamHistory(careerRaw);

        const birthdateRaw = String(
          getValueFromRow(profile.row, profile.headers, "BIRTHDATE") ?? "",
        );
        const birthdateDate = parseBirthdate(birthdateRaw);

        const teamId = num(
          getValueFromRow(profile.row, profile.headers, "TEAM_ID"),
          0,
        );
        const teamMeta = TEAM_META[teamId];
        const firstName = String(
          getValueFromRow(profile.row, profile.headers, "FIRST_NAME") ?? "",
        );
        const lastName = String(
          getValueFromRow(profile.row, profile.headers, "LAST_NAME") ?? "",
        );

        const displayName =
          String(
            getValueFromRow(
              profile.row,
              profile.headers,
              "DISPLAY_FIRST_LAST",
            ) ?? "",
          ).trim() ||
          `${firstName} ${lastName}`.trim() ||
          "Unknown Player";

        let draftYear = String(
          getValueFromRow(profile.row, profile.headers, "DRAFT_YEAR"),
        );
        let draftRound = String(
          getValueFromRow(profile.row, profile.headers, "DRAFT_ROUND"),
        );
        let draftPick = String(
          getValueFromRow(profile.row, profile.headers, "DRAFT_NUMBER"),
        );

        if (draftYear === "Undrafted") draftYear = "Undrafted";
        if (draftRound === "Undrafted") draftRound = "-";
        if (draftPick === "Undrafted") draftPick = "-";

        return {
          playerId,
          displayName,
          firstName,
          lastName,
          teamId,
          teamName: teamMeta
            ? `${teamMeta.city} ${teamMeta.name}`
            : String(
                getValueFromRow(profile.row, profile.headers, "TEAM_NAME") ??
                  "",
              ),
          teamTricode: String(
            getValueFromRow(
              profile.row,
              profile.headers,
              "TEAM_ABBREVIATION",
            ) ??
              teamMeta?.tricode ??
              "N/A",
          ),
          jersey: String(
            getValueFromRow(profile.row, profile.headers, "JERSEY") ?? "",
          ),
          position: String(
            getValueFromRow(profile.row, profile.headers, "POSITION") ?? "N/A",
          ),
          height: String(
            getValueFromRow(profile.row, profile.headers, "HEIGHT") ?? "",
          ),
          weight: String(
            getValueFromRow(profile.row, profile.headers, "WEIGHT") ?? "",
          ),
          birthdate: birthdateDate ? birthdateDate.toISOString() : null,
          age: calculateAge(birthdateDate),
          experience: String(
            getValueFromRow(profile.row, profile.headers, "SEASON_EXP") ?? "0",
          ),
          school: String(
            getValueFromRow(profile.row, profile.headers, "SCHOOL") ?? "",
          ),
          country: String(
            getValueFromRow(profile.row, profile.headers, "COUNTRY") ?? "",
          ),
          fromYear: String(
            getValueFromRow(profile.row, profile.headers, "FROM_YEAR") ?? "",
          ),
          toYear: String(
            getValueFromRow(profile.row, profile.headers, "TO_YEAR") ?? "",
          ),
          draft: {
            year: draftYear,
            round: draftRound,
            pick: draftPick,
            display: `${draftYear} / ${draftRound} / ${draftPick}`,
          },
          teamsPlayedFor: history.teamsPlayedFor,
          seasonTeamHistory: history.seasonTeamHistory,
          fieldAudit: buildFieldAudit(
            [
              "stats.nba.com/commonplayerinfo",
              "stats.nba.com/playercareerstats",
              "cdn.nba.com/headshots",
            ],
            [
              {
                field: "profile",
                sourceEndpoint: "stats.nba.com/commonplayerinfo",
                sourceKey:
                  "DISPLAY_FIRST_LAST, TEAM_ID, POSITION, HEIGHT, WEIGHT, BIRTHDATE",
                available: true,
                previousFormat: "partial profile",
                formattedAs: "normalized player header",
              },
              {
                field: "teamHistory",
                sourceEndpoint: "stats.nba.com/playercareerstats",
                sourceKey:
                  "SeasonTotalsRegularSeason -> SEASON_ID, TEAM_ID, TEAM_ABBREVIATION",
                available: true,
                previousFormat: "not present",
                formattedAs: "seasonTeamHistory + teamsPlayedFor",
                note: "TOT rows are suppressed when specific team rows exist for that season.",
              },
            ],
          ),
        };
      },
      overview: async () => {
        const [gameLogRaw, careerRaw, awardsRaw] = await Promise.all([
          getGameLog(),
          getCareer(),
          getAwards(),
        ]);

        return {
          playerId,
          currentSeasonBasic: buildCurrentSeasonBasic(gameLogRaw),
          careerBasic: buildCareerBasic(careerRaw),
          careerHighs: buildCareerHighs(careerRaw),
          awards: buildAwards(awardsRaw),
        };
      },
      stats: async () => {
        const [basicRaw, advancedRaw, per36Raw] = await Promise.all([
          getBasicDashboard(),
          getAdvancedDashboard(),
          getPer36Dashboard(),
        ]);

        const basicColumns = [
          { key: "GP", label: "GP" },
          { key: "MIN", label: "MIN" },
          { key: "PTS", label: "PTS" },
          { key: "REB", label: "REB" },
          { key: "AST", label: "AST" },
          { key: "STL", label: "STL" },
          { key: "BLK", label: "BLK" },
          { key: "TOV", label: "TOV" },
          { key: "FGM", label: "FGM" },
          { key: "FGA", label: "FGA" },
          { key: "FG3M", label: "3PM" },
          { key: "FG3A", label: "3PA" },
          { key: "FTM", label: "FTM" },
          { key: "FTA", label: "FTA" },
          { key: "FG_PCT", label: "FG%", isPct: true },
          { key: "FG3_PCT", label: "3P%", isPct: true },
          { key: "FT_PCT", label: "FT%", isPct: true },
        ];

        const advancedColumns = [
          { key: "GP", label: "GP" },
          { key: "MIN", label: "MIN" },
          { key: "OFF_RATING", label: "ORtg" },
          { key: "DEF_RATING", label: "DRtg" },
          { key: "NET_RATING", label: "NetRtg" },
          { key: "USG_PCT", label: "USG%", isPct: true },
          { key: "TS_PCT", label: "TS%", isPct: true },
          { key: "EFG_PCT", label: "eFG%", isPct: true },
          { key: "AST_PCT", label: "AST%", isPct: true },
          { key: "REB_PCT", label: "REB%", isPct: true },
          { key: "PIE", label: "PIE" },
        ];

        return {
          playerId,
          basic: buildSeasonRows(basicRaw, basicColumns),
          advanced: buildSeasonRows(advancedRaw, advancedColumns),
          per36: buildSeasonRows(per36Raw, basicColumns),
        };
      },
      gameLog: async () => {
        const gameLogRaw = await getGameLog();
        const gameLog = pickResultSetByName(gameLogRaw, ["PlayerGameLog"]);

        const games = gameLog.rowSet.map((row: any[]) => ({
          gameId: String(
            getValueFromRow(row, gameLog.headers, "Game_ID") ?? "",
          ),
          gameDate: String(
            getValueFromRow(row, gameLog.headers, "GAME_DATE") ?? "",
          ),
          matchup: String(
            getValueFromRow(row, gameLog.headers, "MATCHUP") ?? "",
          ),
          result: String(getValueFromRow(row, gameLog.headers, "WL") ?? "") as
            | "W"
            | "L"
            | "",
          minutes: parseMinutes(getValueFromRow(row, gameLog.headers, "MIN")),
          points: num(getValueFromRow(row, gameLog.headers, "PTS"), 0),
          rebounds: num(getValueFromRow(row, gameLog.headers, "REB"), 0),
          assists: num(getValueFromRow(row, gameLog.headers, "AST"), 0),
          steals: num(getValueFromRow(row, gameLog.headers, "STL"), 0),
          blocks: num(getValueFromRow(row, gameLog.headers, "BLK"), 0),
          turnovers: num(getValueFromRow(row, gameLog.headers, "TOV"), 0),
          fgm: num(getValueFromRow(row, gameLog.headers, "FGM"), 0),
          fga: num(getValueFromRow(row, gameLog.headers, "FGA"), 0),
          threePtMade: num(getValueFromRow(row, gameLog.headers, "FG3M"), 0),
          threePtAttempted: num(
            getValueFromRow(row, gameLog.headers, "FG3A"),
            0,
          ),
          ftm: num(getValueFromRow(row, gameLog.headers, "FTM"), 0),
          fta: num(getValueFromRow(row, gameLog.headers, "FTA"), 0),
          fgPct: num(getValueFromRow(row, gameLog.headers, "FG_PCT"), 0),
          threePtPct: num(getValueFromRow(row, gameLog.headers, "FG3_PCT"), 0),
          ftPct: num(getValueFromRow(row, gameLog.headers, "FT_PCT"), 0),
        }));

        return {
          playerId,
          games,
        };
      },
    };

    const sectionResults = await Promise.allSettled(
      include.map((section) => sectionBuilders[section]()),
    );

    const payload: Record<string, unknown> = {
      playerId,
      tab,
      season,
      seasonType,
      include,
    };

    include.forEach((section, index) => {
      const result = sectionResults[index];
      payload[section] =
        result.status === "fulfilled" ? result.value : sectionError(section);
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("player aggregate route failed", error);
    return NextResponse.json(
      {
        code: "PLAYER_AGGREGATE_FAILED",
        message: PROD_ERROR_MESSAGES.aggregate,
        section: "aggregate",
      },
      { status: 500 },
    );
  }
}
