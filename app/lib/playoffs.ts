import { unstable_cache } from "next/cache";
import {
  classifyPostseasonGame,
  type PostseasonPhase,
  type PostseasonRound,
} from "@/app/lib/postseason";
import { CURRENT_SEASON, TEAM_META } from "@/app/lib/teams";

export type ConferenceKey = "east" | "west";
export type BracketStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed";
type PlayInSlot = "7v8" | "9v10" | "8-seed";
type FirstRoundSlot = "1v8" | "4v5" | "3v6" | "2v7";
type SemisSlot = "top" | "bottom";
type ConfFinalsSlot = "conference-finals";
type FinalsSlot = "nba-finals";
type CanonicalSlot =
  | PlayInSlot
  | FirstRoundSlot
  | SemisSlot
  | ConfFinalsSlot
  | FinalsSlot;

const SCHEDULE_URL =
  "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json";

const PLAY_IN_ORDER: PlayInSlot[] = ["7v8", "9v10", "8-seed"];
const FIRST_ROUND_ORDER: FirstRoundSlot[] = ["1v8", "4v5", "3v6", "2v7"];
const SEMIS_ORDER: SemisSlot[] = ["top", "bottom"];

const ROUND_LABELS: Record<Exclude<PostseasonRound, null>, string> = {
  play_in: "Play-In Tournament",
  first_round: "First Round",
  conf_semis: "Conference Semifinals",
  conf_finals: "Conference Finals",
  finals: "NBA Finals",
};

const PLAY_IN_GROUP_A = new Set([1, 4, 5, 8]);
const PLAY_IN_GROUP_B = new Set([2, 3, 6, 7]);

export interface NormalizedBracketTeam {
  teamId: number | null;
  city: string;
  name: string;
  displayName: string;
  tricode: string;
  logoUrl: string | null;
  seed: number | null;
  score: number | null;
  record: {
    wins: number | null;
    losses: number | null;
  };
}

export interface NormalizedBracketGame {
  gameId: string;
  gameDate: string;
  gameEt: string;
  gameStatus: number;
  gameStatusText: string;
  phase: PostseasonPhase;
  round: PostseasonRound;
  conference: ConferenceKey | null;
  seriesText: string;
  seriesGameNumber: number | null;
  labelText: string;
  homeTeam: NormalizedBracketTeam;
  awayTeam: NormalizedBracketTeam;
  winnerTeamId: number | null;
}

export interface BracketGameSummary {
  gameId: string;
  gameNumber: number | null;
  scheduledAt: string;
  status: BracketStatus;
  statusText: string;
  winnerTeamId: number | null;
  homeTeam: {
    teamId: number | null;
    tricode: string;
    score: number | null;
  };
  awayTeam: {
    teamId: number | null;
    tricode: string;
    score: number | null;
  };
}

export interface BracketSeriesTeam {
  teamId: number | null;
  seed: number | null;
  tricode: string;
  name: string;
  displayName: string;
  logoUrl: string | null;
  seriesWins: number;
  state: "tbd" | "active" | "advanced" | "eliminated";
  isTbd: boolean;
}

export interface BracketSeriesCard {
  id: string;
  href: string | null;
  pageAvailable: boolean;
  phase: Extract<PostseasonPhase, "play_in" | "playoffs">;
  conference: ConferenceKey | null;
  round: Exclude<PostseasonRound, null>;
  roundLabel: string;
  slot: CanonicalSlot;
  bracketOrder: number;
  title: string;
  status: BracketStatus;
  bestOf: 1 | 7;
  winsNeeded: 1 | 4;
  hasStarted: boolean;
  isCompleted: boolean;
  leaderTeamId: number | null;
  winnerTeamId: number | null;
  teams: {
    top: BracketSeriesTeam;
    bottom: BracketSeriesTeam;
  };
  summary: {
    totalGames: number;
    completedGames: number;
    nextGame: BracketGameSummary | null;
    lastCompletedGame: BracketGameSummary | null;
  };
  navigation: {
    winnerToSeriesId: string | null;
    loserToSeriesId: string | null;
  };
}

interface ActualSeriesRecord extends BracketSeriesCard {
  games: NormalizedBracketGame[];
}

export interface BracketConnection {
  fromSeriesId: string;
  outcome: "winner" | "loser";
  toSeriesId: string;
}

export interface PlayoffBracketPayload {
  season: string;
  sourceSeason: string;
  generatedAt: string;
  source: string;
  note: string | null;
  playIn: {
    east: BracketSeriesCard[];
    west: BracketSeriesCard[];
    connections: BracketConnection[];
  };
  playoffs: {
    west: {
      firstRound: BracketSeriesCard[];
      conferenceSemifinals: BracketSeriesCard[];
      conferenceFinals: BracketSeriesCard[];
    };
    east: {
      firstRound: BracketSeriesCard[];
      conferenceSemifinals: BracketSeriesCard[];
      conferenceFinals: BracketSeriesCard[];
    };
    finals: BracketSeriesCard;
    connections: BracketConnection[];
  };
  meta: {
    playInSeriesCount: number;
    playoffSeriesCount: number;
    availableSeriesPages: number;
    unresolvedSeriesCount: number;
  };
}

function parseScheduleDate(raw?: string): Date {
  if (!raw) return new Date("1970-01-01T00:00:00Z");
  const normalized = raw.replace(" ET", "").replace("TBD", "").trim();
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime())
    ? new Date("1970-01-01T00:00:00Z")
    : parsed;
}

function buildLabelText(game: any): string {
  return [
    game?.gameLabel,
    game?.gameSubLabel,
    game?.seriesText,
    game?.seriesConference,
    game?.seriesRound,
    game?.round,
  ]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value))
    .join(" ")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toLogoUrl(teamId: number | null) {
  return teamId
    ? `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
    : null;
}

function normalizeSeed(raw: unknown): number | null {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeScore(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecordPart(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTeamNode(team: any): NormalizedBracketTeam {
  const teamIdRaw = Number(team?.teamId ?? 0);
  const teamId = Number.isFinite(teamIdRaw) && teamIdRaw > 0 ? teamIdRaw : null;
  const meta = teamId ? TEAM_META[teamId] : undefined;
  const city = String(team?.teamCity ?? meta?.city ?? "");
  const name = String(team?.teamName ?? meta?.name ?? (teamId ? "" : "TBD"));

  return {
    teamId,
    city,
    name,
    displayName:
      city && name && city !== "TBD" ? `${city} ${name}` : name || "TBD",
    tricode: String(team?.teamTricode ?? meta?.tricode ?? "TBD"),
    logoUrl: toLogoUrl(teamId),
    seed: normalizeSeed(team?.seed),
    score: normalizeScore(team?.score),
    record: {
      wins: normalizeRecordPart(team?.wins),
      losses: normalizeRecordPart(team?.losses),
    },
  };
}

function detectConference(game: any): ConferenceKey | null {
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

function normalizeBracketGame(game: any): NormalizedBracketGame {
  const classification = classifyPostseasonGame(game);
  const homeTeam = normalizeTeamNode(game.homeTeam);
  const awayTeam = normalizeTeamNode(game.awayTeam);
  const gameStatus = Number(
    game.gameStatus ?? game.gameStatusID ?? game.gameStatusId ?? 0,
  );
  const homeScore = homeTeam.score ?? 0;
  const awayScore = awayTeam.score ?? 0;
  const hasFinalScore = gameStatus === 3 || homeScore > 0 || awayScore > 0;

  return {
    gameId: String(game.gameId ?? ""),
    gameDate: String(game.gameDateTimeUTC ?? game.gameDateEst ?? ""),
    gameEt: String(game.gameDateTimeEst ?? game.gameDateEst ?? ""),
    gameStatus,
    gameStatusText: String(game.gameStatusText ?? ""),
    phase: classification.phase,
    round: classification.round,
    conference: detectConference(game),
    seriesText: String(game.seriesText ?? ""),
    seriesGameNumber:
      game.seriesGameNumber === undefined || game.seriesGameNumber === null
        ? null
        : Number(game.seriesGameNumber),
    labelText: buildLabelText(game),
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

function pairSeriesKey(game: NormalizedBracketGame) {
  const teams = [game.homeTeam.teamId, game.awayTeam.teamId]
    .filter(
      (teamId): teamId is number =>
        typeof teamId === "number" && Number.isInteger(teamId) && teamId > 0,
    )
    .sort((a, b) => a - b)
    .join("-");

  if (teams) {
    return `${game.round ?? "unknown"}:${game.conference ?? "league"}:${teams}`;
  }

  const seedKey = [game.homeTeam.seed, game.awayTeam.seed]
    .filter((seed): seed is number => Number.isInteger(seed))
    .sort((a, b) => a - b)
    .join("-");

  return [
    game.round ?? "unknown",
    game.conference ?? "league",
    seedKey || "tbd",
    game.seriesText || game.labelText || game.gameId,
  ].join(":");
}

function statusFromGameStatus(gameStatus: number): BracketStatus {
  if (gameStatus === 3) return "completed";
  if (gameStatus === 2) return "in_progress";
  return "scheduled";
}

function summarizeGame(game: NormalizedBracketGame): BracketGameSummary {
  return {
    gameId: game.gameId,
    gameNumber: game.seriesGameNumber,
    scheduledAt: game.gameDate,
    status: statusFromGameStatus(game.gameStatus),
    statusText: game.gameStatusText,
    winnerTeamId: game.winnerTeamId,
    homeTeam: {
      teamId: game.homeTeam.teamId,
      tricode: game.homeTeam.tricode,
      score: game.homeTeam.score,
    },
    awayTeam: {
      teamId: game.awayTeam.teamId,
      tricode: game.awayTeam.tricode,
      score: game.awayTeam.score,
    },
  };
}

function buildSeriesId(
  season: string,
  conference: ConferenceKey | null,
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
) {
  if (round === "finals") {
    return `${season}-nba-finals`;
  }

  const roundSlug = round.replace(/_/g, "-");
  return `${season}-${conference}-${roundSlug}-${slot}`;
}

function getExpectedSeeds(
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
): [number | null, number | null] {
  if (round === "play_in") {
    if (slot === "7v8") return [7, 8];
    if (slot === "9v10") return [9, 10];
    return [8, null];
  }

  if (round === "first_round") {
    if (slot === "1v8") return [1, 8];
    if (slot === "4v5") return [4, 5];
    if (slot === "3v6") return [3, 6];
    if (slot === "2v7") return [2, 7];
  }

  return [null, null];
}

function slotTitle(
  conference: ConferenceKey | null,
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
) {
  const conferenceLabel = conference ? `${conference[0].toUpperCase()}${conference.slice(1)} ` : "";

  if (round === "play_in") {
    if (slot === "7v8") return `${conferenceLabel}7 vs 8`;
    if (slot === "9v10") return `${conferenceLabel}9 vs 10`;
    return `${conferenceLabel}8 Seed Game`;
  }

  if (round === "first_round") {
    return `${conferenceLabel}${slot.replace("v", " vs ")}`;
  }

  if (round === "conf_semis") {
    return `${conferenceLabel}Semifinal`;
  }

  if (round === "conf_finals") {
    return `${conferenceLabel}Conference Final`;
  }

  return "NBA Finals";
}

function roundOrder(
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
) {
  if (round === "play_in") return PLAY_IN_ORDER.indexOf(slot as PlayInSlot) + 1;
  if (round === "first_round") {
    return FIRST_ROUND_ORDER.indexOf(slot as FirstRoundSlot) + 1;
  }
  if (round === "conf_semis") return SEMIS_ORDER.indexOf(slot as SemisSlot) + 1;
  return 1;
}

function sortTeamsBySeed(
  teams: [NormalizedBracketTeam, NormalizedBracketTeam],
): [NormalizedBracketTeam, NormalizedBracketTeam] {
  return [...teams].sort((a, b) => {
    if (a.seed !== null && b.seed !== null && a.seed !== b.seed) {
      return a.seed - b.seed;
    }

    if (a.seed !== null) return -1;
    if (b.seed !== null) return 1;
    if (a.teamId && b.teamId && a.teamId !== b.teamId) {
      return a.teamId - b.teamId;
    }
    if (a.teamId) return -1;
    if (b.teamId) return 1;
    return a.displayName.localeCompare(b.displayName);
  }) as [NormalizedBracketTeam, NormalizedBracketTeam];
}

function teamState(
  team: NormalizedBracketTeam,
  winnerTeamId: number | null,
  isCompleted: boolean,
): BracketSeriesTeam["state"] {
  if (!team.teamId) return "tbd";
  if (!isCompleted || !winnerTeamId) return "active";
  return winnerTeamId === team.teamId ? "advanced" : "eliminated";
}

function buildSeriesTeam(
  team: NormalizedBracketTeam,
  seriesWins: number,
  winnerTeamId: number | null,
  isCompleted: boolean,
): BracketSeriesTeam {
  return {
    teamId: team.teamId,
    seed: team.seed,
    tricode: team.tricode,
    name: team.name || "TBD",
    displayName: team.displayName || "TBD",
    logoUrl: team.logoUrl,
    seriesWins,
    state: teamState(team, winnerTeamId, isCompleted),
    isTbd: !team.teamId,
  };
}

function inferPlayInSlot(series: {
  teams: [NormalizedBracketTeam, NormalizedBracketTeam];
  labelText: string;
}): PlayInSlot {
  const seeds = series.teams
    .map((team) => team.seed)
    .filter((seed): seed is number => seed !== null)
    .sort((a, b) => a - b);
  const pair = seeds.join("-");

  if (pair === "7-8") return "7v8";
  if (pair === "9-10") return "9v10";
  if (seeds.includes(8)) return "8-seed";
  if (series.labelText.includes("7") && series.labelText.includes("8")) return "7v8";
  if (series.labelText.includes("9") && series.labelText.includes("10")) return "9v10";
  return "8-seed";
}

function inferFirstRoundSlot(
  teams: [NormalizedBracketTeam, NormalizedBracketTeam],
): FirstRoundSlot | null {
  const seeds = teams
    .map((team) => team.seed)
    .filter((seed): seed is number => seed !== null)
    .sort((a, b) => a - b);
  const pair = seeds.join("-");

  if (pair === "1-8") return "1v8";
  if (pair === "4-5") return "4v5";
  if (pair === "3-6") return "3v6";
  if (pair === "2-7") return "2v7";
  return null;
}

function inferSemisSlot(
  teams: [NormalizedBracketTeam, NormalizedBracketTeam],
): SemisSlot {
  const seeds = teams
    .map((team) => team.seed)
    .filter((seed): seed is number => seed !== null);

  const inTopCluster = seeds.every((seed) => PLAY_IN_GROUP_A.has(seed));
  if (inTopCluster) return "top";

  const inBottomCluster = seeds.every((seed) => PLAY_IN_GROUP_B.has(seed));
  if (inBottomCluster) return "bottom";

  return Math.min(...(seeds.length ? seeds : [99])) <= 4 ? "top" : "bottom";
}

function inferCanonicalSlot(series: {
  round: Exclude<PostseasonRound, null>;
  teams: [NormalizedBracketTeam, NormalizedBracketTeam];
  labelText: string;
}): CanonicalSlot {
  if (series.round === "play_in") return inferPlayInSlot(series);
  if (series.round === "first_round") {
    return inferFirstRoundSlot(series.teams) ?? "1v8";
  }
  if (series.round === "conf_semis") return inferSemisSlot(series.teams);
  if (series.round === "conf_finals") return "conference-finals";
  return "nba-finals";
}

function winnerToSeriesId(
  season: string,
  conference: ConferenceKey | null,
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
) {
  if (round === "play_in") {
    if (slot === "7v8") {
      return buildSeriesId(season, conference, "first_round", "2v7");
    }
    if (slot === "9v10") {
      return buildSeriesId(season, conference, "play_in", "8-seed");
    }
    return buildSeriesId(season, conference, "first_round", "1v8");
  }

  if (round === "first_round") {
    if (slot === "1v8" || slot === "4v5") {
      return buildSeriesId(season, conference, "conf_semis", "top");
    }
    return buildSeriesId(season, conference, "conf_semis", "bottom");
  }

  if (round === "conf_semis") {
    return buildSeriesId(season, conference, "conf_finals", "conference-finals");
  }

  if (round === "conf_finals") {
    return buildSeriesId(season, null, "finals", "nba-finals");
  }

  return null;
}

function loserToSeriesId(
  season: string,
  conference: ConferenceKey | null,
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
) {
  if (round === "play_in" && slot === "7v8") {
    return buildSeriesId(season, conference, "play_in", "8-seed");
  }

  return null;
}

function buildPlaceholderTeam(seed: number | null): BracketSeriesTeam {
  return {
    teamId: null,
    seed,
    tricode: "TBD",
    name: "TBD",
    displayName: "TBD",
    logoUrl: null,
    seriesWins: 0,
    state: "tbd",
    isTbd: true,
  };
}

function buildPlaceholderSeries(
  season: string,
  conference: ConferenceKey | null,
  round: Exclude<PostseasonRound, null>,
  slot: CanonicalSlot,
): BracketSeriesCard {
  const [topSeed, bottomSeed] = getExpectedSeeds(round, slot);
  const id = buildSeriesId(season, conference, round, slot);

  return {
    id,
    href:
      round === "play_in" ? null : `/playoffs/series/${id}`,
    pageAvailable: false,
    phase: round === "play_in" ? "play_in" : "playoffs",
    conference,
    round,
    roundLabel: ROUND_LABELS[round],
    slot,
    bracketOrder: roundOrder(round, slot),
    title: slotTitle(conference, round, slot),
    status: "pending",
    bestOf: round === "play_in" ? 1 : 7,
    winsNeeded: round === "play_in" ? 1 : 4,
    hasStarted: false,
    isCompleted: false,
    leaderTeamId: null,
    winnerTeamId: null,
    teams: {
      top: buildPlaceholderTeam(topSeed),
      bottom: buildPlaceholderTeam(bottomSeed),
    },
    summary: {
      totalGames: 0,
      completedGames: 0,
      nextGame: null,
      lastCompletedGame: null,
    },
    navigation: {
      winnerToSeriesId: winnerToSeriesId(season, conference, round, slot),
      loserToSeriesId: loserToSeriesId(season, conference, round, slot),
    },
  };
}

function buildActualSeries(
  season: string,
  games: NormalizedBracketGame[],
): ActualSeriesRecord | null {
  const sortedGames = [...games].sort(
    (a, b) =>
      parseScheduleDate(a.gameDate).getTime() - parseScheduleDate(b.gameDate).getTime(),
  );
  const firstGame = sortedGames[0];

  if (!firstGame || firstGame.round === null) {
    return null;
  }

  const orderedTeams = sortTeamsBySeed([firstGame.homeTeam, firstGame.awayTeam]);
  const slot = inferCanonicalSlot({
    round: firstGame.round,
    teams: orderedTeams,
    labelText: firstGame.labelText,
  });
  const id = buildSeriesId(season, firstGame.conference, firstGame.round, slot);
  const wins = new Map<number, number>();

  for (const game of sortedGames) {
    if (!game.winnerTeamId) continue;
    wins.set(game.winnerTeamId, (wins.get(game.winnerTeamId) ?? 0) + 1);
  }

  const topTeam = orderedTeams[0];
  const bottomTeam = orderedTeams[1];
  const bestOf = firstGame.round === "play_in" ? 1 : 7;
  const winsNeeded = firstGame.round === "play_in" ? 1 : 4;
  const topTeamWins = topTeam.teamId ? wins.get(topTeam.teamId) ?? 0 : 0;
  const bottomTeamWins = bottomTeam.teamId ? wins.get(bottomTeam.teamId) ?? 0 : 0;
  const leaderTeamId =
    topTeamWins === bottomTeamWins
      ? null
      : topTeamWins > bottomTeamWins
        ? topTeam.teamId
        : bottomTeam.teamId;
  const winnerTeamId =
    topTeamWins >= winsNeeded
      ? topTeam.teamId
      : bottomTeamWins >= winsNeeded
        ? bottomTeam.teamId
        : null;
  const completedGames = sortedGames.filter((game) => game.gameStatus === 3).length;
  const hasStarted = sortedGames.some((game) => game.gameStatus >= 2) || completedGames > 0;
  const inProgress = sortedGames.some((game) => game.gameStatus === 2);
  const status: BracketStatus = winnerTeamId
    ? "completed"
    : inProgress
      ? "in_progress"
      : hasStarted || sortedGames.length > 0
        ? "scheduled"
        : "pending";

  const nextGame = sortedGames.find((game) => game.gameStatus !== 3) ?? null;
  const lastCompletedGame =
    [...sortedGames].reverse().find((game) => game.gameStatus === 3) ?? null;

  return {
    id,
    href:
      firstGame.round === "play_in" ? null : `/playoffs/series/${id}`,
    pageAvailable:
      firstGame.round !== "play_in" &&
      Boolean(topTeam.teamId) &&
      Boolean(bottomTeam.teamId),
    phase: firstGame.round === "play_in" ? "play_in" : "playoffs",
    conference: firstGame.conference,
    round: firstGame.round,
    roundLabel: ROUND_LABELS[firstGame.round],
    slot,
    bracketOrder: roundOrder(firstGame.round, slot),
    title: slotTitle(firstGame.conference, firstGame.round, slot),
    status,
    bestOf,
    winsNeeded,
    hasStarted,
    isCompleted: Boolean(winnerTeamId),
    leaderTeamId,
    winnerTeamId,
    teams: {
      top: buildSeriesTeam(topTeam, topTeamWins, winnerTeamId, Boolean(winnerTeamId)),
      bottom: buildSeriesTeam(
        bottomTeam,
        bottomTeamWins,
        winnerTeamId,
        Boolean(winnerTeamId),
      ),
    },
    summary: {
      totalGames: sortedGames.length,
      completedGames,
      nextGame: nextGame ? summarizeGame(nextGame) : null,
      lastCompletedGame: lastCompletedGame ? summarizeGame(lastCompletedGame) : null,
    },
    navigation: {
      winnerToSeriesId: winnerToSeriesId(
        season,
        firstGame.conference,
        firstGame.round,
        slot,
      ),
      loserToSeriesId: loserToSeriesId(
        season,
        firstGame.conference,
        firstGame.round,
        slot,
      ),
    },
    games: sortedGames,
  };
}

function overlaySeries(
  placeholder: BracketSeriesCard,
  actual?: ActualSeriesRecord,
): BracketSeriesCard {
  if (!actual) return placeholder;

  return {
    ...placeholder,
    ...actual,
    navigation: actual.navigation,
  };
}

function buildConferenceSeries(
  season: string,
  conference: ConferenceKey,
  round: Exclude<PostseasonRound, null>,
  slots: CanonicalSlot[],
  actualById: Map<string, ActualSeriesRecord>,
) {
  return slots
    .map((slot) =>
      overlaySeries(
        buildPlaceholderSeries(season, conference, round, slot),
        actualById.get(buildSeriesId(season, conference, round, slot)),
      ),
    )
    .sort((a, b) => a.bracketOrder - b.bracketOrder);
}

function buildConnections(season: string): {
  playIn: BracketConnection[];
  playoffs: BracketConnection[];
} {
  const playIn: BracketConnection[] = [];
  const playoffs: BracketConnection[] = [];

  (["east", "west"] as ConferenceKey[]).forEach((conference) => {
    playIn.push(
      {
        fromSeriesId: buildSeriesId(season, conference, "play_in", "7v8"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "first_round", "2v7"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "play_in", "7v8"),
        outcome: "loser",
        toSeriesId: buildSeriesId(season, conference, "play_in", "8-seed"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "play_in", "9v10"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "play_in", "8-seed"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "play_in", "8-seed"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "first_round", "1v8"),
      },
    );

    playoffs.push(
      {
        fromSeriesId: buildSeriesId(season, conference, "first_round", "1v8"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_semis", "top"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "first_round", "4v5"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_semis", "top"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "first_round", "3v6"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_semis", "bottom"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "first_round", "2v7"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_semis", "bottom"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "conf_semis", "top"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_finals", "conference-finals"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "conf_semis", "bottom"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, conference, "conf_finals", "conference-finals"),
      },
      {
        fromSeriesId: buildSeriesId(season, conference, "conf_finals", "conference-finals"),
        outcome: "winner",
        toSeriesId: buildSeriesId(season, null, "finals", "nba-finals"),
      },
    );
  });

  return { playIn, playoffs };
}

async function buildBracketDataset() {
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
  const postseasonGames = allGames
    .map(normalizeBracketGame)
    .filter((game) => game.phase !== "regular");
  const actualSeries = new Map<string, ActualSeriesRecord>();

  const grouped = new Map<string, NormalizedBracketGame[]>();
  for (const game of postseasonGames) {
    const key = pairSeriesKey(game);
    const existing = grouped.get(key) ?? [];
    existing.push(game);
    grouped.set(key, existing);
  }

  grouped.forEach((games) => {
    const series = buildActualSeries(CURRENT_SEASON, games);
    if (!series) return;
    actualSeries.set(series.id, series);
  });

  const playInEast = buildConferenceSeries(
    CURRENT_SEASON,
    "east",
    "play_in",
    PLAY_IN_ORDER,
    actualSeries,
  );
  const playInWest = buildConferenceSeries(
    CURRENT_SEASON,
    "west",
    "play_in",
    PLAY_IN_ORDER,
    actualSeries,
  );
  const westFirstRound = buildConferenceSeries(
    CURRENT_SEASON,
    "west",
    "first_round",
    FIRST_ROUND_ORDER,
    actualSeries,
  );
  const eastFirstRound = buildConferenceSeries(
    CURRENT_SEASON,
    "east",
    "first_round",
    FIRST_ROUND_ORDER,
    actualSeries,
  );
  const westSemis = buildConferenceSeries(
    CURRENT_SEASON,
    "west",
    "conf_semis",
    SEMIS_ORDER,
    actualSeries,
  );
  const eastSemis = buildConferenceSeries(
    CURRENT_SEASON,
    "east",
    "conf_semis",
    SEMIS_ORDER,
    actualSeries,
  );
  const westFinals = buildConferenceSeries(
    CURRENT_SEASON,
    "west",
    "conf_finals",
    ["conference-finals"],
    actualSeries,
  );
  const eastFinals = buildConferenceSeries(
    CURRENT_SEASON,
    "east",
    "conf_finals",
    ["conference-finals"],
    actualSeries,
  );
  const finals =
    overlaySeries(
      buildPlaceholderSeries(CURRENT_SEASON, null, "finals", "nba-finals"),
      actualSeries.get(buildSeriesId(CURRENT_SEASON, null, "finals", "nba-finals")),
    );

  const allSeries = [
    ...playInEast,
    ...playInWest,
    ...westFirstRound,
    ...eastFirstRound,
    ...westSemis,
    ...eastSemis,
    ...westFinals,
    ...eastFinals,
    finals,
  ];
  const unresolvedSeriesCount = allSeries.filter(
    (series) => !series.pageAvailable && series.status !== "pending",
  ).length;
  const availableSeriesPages = allSeries.filter((series) => series.pageAvailable).length;
  const connections = buildConnections(CURRENT_SEASON);

  return {
    sourceSeason: CURRENT_SEASON,
    generatedAt: new Date().toISOString(),
    source: SCHEDULE_URL,
    seriesById: new Map(allSeries.map((series) => [series.id, series])),
    actualSeriesById: actualSeries,
    bracket: {
      playIn: {
        east: playInEast,
        west: playInWest,
        connections: connections.playIn,
      },
      playoffs: {
        west: {
          firstRound: westFirstRound,
          conferenceSemifinals: westSemis,
          conferenceFinals: westFinals,
        },
        east: {
          firstRound: eastFirstRound,
          conferenceSemifinals: eastSemis,
          conferenceFinals: eastFinals,
        },
        finals,
        connections: connections.playoffs,
      },
      meta: {
        playInSeriesCount: playInEast.length + playInWest.length,
        playoffSeriesCount:
          westFirstRound.length +
          eastFirstRound.length +
          westSemis.length +
          eastSemis.length +
          westFinals.length +
          eastFinals.length +
          1,
        availableSeriesPages,
        unresolvedSeriesCount,
      },
    },
  };
}

export const getCachedPlayoffDataset = unstable_cache(
  buildBracketDataset,
  ["playoff-bracket-dataset-v2"],
  { revalidate: 900 },
);

export async function getPlayoffBracketPayload(
  season: string,
): Promise<PlayoffBracketPayload> {
  const dataset = await getCachedPlayoffDataset();

  return {
    season,
    sourceSeason: dataset.sourceSeason,
    generatedAt: dataset.generatedAt,
    source: dataset.source,
    note:
      season === CURRENT_SEASON
        ? null
        : "The NBA CDN schedule feed used here is the current-season feed, so historical bracket data may be empty or unavailable.",
    playIn: dataset.bracket.playIn,
    playoffs: dataset.bracket.playoffs,
    meta: dataset.bracket.meta,
  };
}

export async function getSeriesById(seriesId: string) {
  const dataset = await getCachedPlayoffDataset();
  const series = dataset.seriesById.get(seriesId) ?? null;
  const actualSeries = dataset.actualSeriesById.get(seriesId) ?? null;

  return {
    sourceSeason: dataset.sourceSeason,
    generatedAt: dataset.generatedAt,
    source: dataset.source,
    series,
    actualSeries,
  };
}
