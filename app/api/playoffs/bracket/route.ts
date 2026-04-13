import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { classifyPostseasonGame } from "@/app/lib/postseason";
import { CURRENT_SEASON, TEAM_META, parseSeason } from "@/app/lib/teams";

export const dynamic = "force-dynamic";

type RoundKey = "first_round" | "conf_semis" | "conf_finals";

const BRACKET_ROUNDS: RoundKey[] = [
  "first_round",
  "conf_semis",
  "conf_finals",
];
const SCHEDULE_URL =
  "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json";

function parseScheduleDate(raw?: string): Date {
  if (!raw) return new Date("1970-01-01T00:00:00Z");
  const normalized = raw.replace(" ET", "").replace("TBD", "").trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? new Date("1970-01-01T00:00:00Z")
    : parsed;
}

function teamNode(team: any) {
  const teamId = Number(team?.teamId ?? 0);
  const meta = TEAM_META[teamId];

  return {
    teamId,
    city: String(team?.teamCity ?? meta?.city ?? ""),
    name: String(team?.teamName ?? meta?.name ?? "TBD"),
    tricode: String(team?.teamTricode ?? meta?.tricode ?? "TBD"),
    seed: team?.seed ?? null,
    score: Number(team?.score ?? 0),
    wins: Number(team?.wins ?? 0),
    losses: Number(team?.losses ?? 0),
  };
}

function detectConference(game: any): "east" | "west" | null {
  const text = [
    game?.gameLabel,
    game?.gameSubLabel,
    game?.seriesText,
    game?.seriesConference,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("east")) return "east";
  if (text.includes("west")) return "west";
  return null;
}

function normalizeBracketGame(game: any) {
  const classification = classifyPostseasonGame(game);
  const homeTeam = teamNode(game.homeTeam);
  const awayTeam = teamNode(game.awayTeam);
  const gameStatus = Number(
    game.gameStatus ?? game.gameStatusID ?? game.gameStatusId ?? 0,
  );
  const homeScore = homeTeam.score;
  const awayScore = awayTeam.score;
  const hasFinalScore = gameStatus === 3 || homeScore > 0 || awayScore > 0;

  return {
    gameId: String(game.gameId ?? ""),
    gameDate: String(game.gameDateTimeUTC ?? game.gameDateEst ?? ""),
    gameEt: String(game.gameDateTimeEst ?? game.gameDateEst ?? ""),
    gameStatus,
    gameStatusText: String(game.gameStatusText ?? ""),
    gameLabel: String(game.gameLabel ?? ""),
    gameSubLabel: String(game.gameSubLabel ?? ""),
    seriesText: String(game.seriesText ?? ""),
    seriesGameNumber:
      game.seriesGameNumber === undefined || game.seriesGameNumber === null
        ? null
        : Number(game.seriesGameNumber),
    phase: classification.phase,
    round: classification.round,
    conference: detectConference(game),
    homeTeam,
    awayTeam,
    winnerTeamId:
      hasFinalScore && homeScore !== awayScore
        ? homeScore > awayScore
          ? homeTeam.teamId
          : awayTeam.teamId
        : null,
  };
}

type BracketGame = ReturnType<typeof normalizeBracketGame>;

function seriesKey(game: BracketGame) {
  const teams = [game.homeTeam.teamId, game.awayTeam.teamId]
    .filter((teamId) => teamId > 0)
    .sort((a, b) => a - b)
    .join("-");

  if (teams) {
    return `${game.round ?? "unknown"}:${game.conference ?? "league"}:${teams}`;
  }

  return [
    game.round ?? "unknown",
    game.conference ?? "league",
    game.gameLabel,
    game.seriesText,
  ].join(":");
}

function buildSeries(
  key: string,
  games: BracketGame[],
) {
  const sortedGames = [...games].sort(
    (a, b) =>
      parseScheduleDate(a.gameDate).getTime() -
      parseScheduleDate(b.gameDate).getTime(),
  );
  const firstGame = sortedGames[0];
  const wins = new Map<number, number>();

  for (const game of sortedGames) {
    if (!game.winnerTeamId) continue;
    wins.set(game.winnerTeamId, (wins.get(game.winnerTeamId) ?? 0) + 1);
  }

  const leaderEntry = [...wins.entries()].sort((a, b) => b[1] - a[1])[0];
  const teamIds = [
    firstGame.homeTeam.teamId,
    firstGame.awayTeam.teamId,
  ].filter((teamId) => teamId > 0);
  const maxWins = leaderEntry?.[1] ?? 0;
  const finished =
    firstGame.round === "play_in"
      ? sortedGames.some((game) => game.winnerTeamId !== null)
      : maxWins >= 4;
  const inProgress = sortedGames.some((game) => game.gameStatus === 2);

  return {
    id: key,
    phase: firstGame.phase,
    round: firstGame.round,
    conference: firstGame.conference,
    seriesText: firstGame.seriesText,
    matchup: teamIds.map((teamId) => TEAM_META[teamId]?.tricode ?? teamId),
    status: finished ? "completed" : inProgress ? "in_progress" : "scheduled",
    bestOf: firstGame.round === "play_in" ? 1 : 7,
    wins: Object.fromEntries(wins),
    leaderTeamId: leaderEntry?.[0] ?? null,
    games: sortedGames,
  };
}

function groupSeries(games: BracketGame[]) {
  const grouped = new Map<string, BracketGame[]>();

  for (const game of games) {
    const key = seriesKey(game);
    const existing = grouped.get(key) ?? [];
    existing.push(game);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .map(([key, seriesGames]) => buildSeries(key, seriesGames))
    .sort((a, b) => {
      if (a.conference !== b.conference) {
        return String(a.conference ?? "").localeCompare(
          String(b.conference ?? ""),
        );
      }

      return a.id.localeCompare(b.id);
    });
}

const getCachedBracketPayload = unstable_cache(
  async () => {
    const scheduleResponse = await fetch(SCHEDULE_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!scheduleResponse.ok) {
      throw new Error("Failed to fetch NBA schedule");
    }

    const scheduleData = await scheduleResponse.json();
    const allGames: any[] = (
      scheduleData?.leagueSchedule?.gameDates ?? []
    ).flatMap((dateNode: any) => dateNode.games ?? []);
    const postseasonGames: BracketGame[] = allGames
      .map(normalizeBracketGame)
      .filter((game) => game.phase !== "regular");

    const playInGames = postseasonGames
      .filter((game) => game.phase === "play_in")
      .sort(
        (a, b) =>
          parseScheduleDate(a.gameDate).getTime() -
          parseScheduleDate(b.gameDate).getTime(),
      );
    const playoffGames = postseasonGames.filter(
      (game) => game.phase === "playoffs",
    );

    const rounds: Record<RoundKey, ReturnType<typeof groupSeries>> = {
      first_round: [],
      conf_semis: [],
      conf_finals: [],
    };

    for (const round of BRACKET_ROUNDS) {
      rounds[round] = groupSeries(
        playoffGames.filter((game) => game.round === round),
      );
    }

    const finals = groupSeries(
      playoffGames.filter((game) => game.round === "finals"),
    );
    const unassigned = groupSeries(
      playoffGames.filter((game) => game.round === null),
    );

    return {
      sourceSeason: CURRENT_SEASON,
      generatedAt: new Date().toISOString(),
      source: SCHEDULE_URL,
      counts: {
        playInGames: playInGames.length,
        playoffGames: playoffGames.length,
        unassignedSeries: unassigned.length,
      },
      playIn: {
        games: playInGames,
      },
      rounds,
      finals,
      unassigned,
    };
  },
  ["playoffs-bracket-payload-v1"],
  { revalidate: 900 },
);

export async function GET(request: NextRequest) {
  try {
    const requestedSeason = parseSeason(
      request.nextUrl.searchParams.get("season"),
    );
    const bracketPayload = await getCachedBracketPayload();

    return NextResponse.json(
      {
        season: requestedSeason,
        ...bracketPayload,
        note:
          requestedSeason === CURRENT_SEASON
            ? null
            : "The NBA CDN schedule feed used here is the current-season feed, so historical bracket data may be empty or unavailable.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error("playoff bracket route failed", error);
    return NextResponse.json(
      {
        code: "PLAYOFF_BRACKET_FAILED",
        message:
          "Playoff bracket details are temporarily unavailable. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
