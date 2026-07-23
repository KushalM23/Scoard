export type NbaSeasonType = "Regular Season" | "Playoffs";
export type PostseasonPhase = "regular" | "play_in" | "playoffs";
export type PostseasonRound =
  | "play_in"
  | "first_round"
  | "conf_semis"
  | "conf_finals"
  | "finals"
  | null;

export interface PostseasonClassification {
  phase: PostseasonPhase;
  round: PostseasonRound;
}

export function parseSeasonType(raw: string | null): NbaSeasonType {
  const normalized = String(raw ?? "")
    .replace(/[-_]+/g, " ")
    .trim()
    .toLowerCase();

  if (
    normalized === "playoffs" ||
    normalized === "playoff" ||
    normalized === "postseason"
  ) {
    return "Playoffs";
  }

  return "Regular Season";
}

function gameLabelText(game: any): string {
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

export function classifyPostseasonGame(
  game: any,
): PostseasonClassification {
  const labelText = gameLabelText(game);
  const stage = Number(
    game?.seasonStageId ?? game?.seasonStageID ?? game?.seasonStage,
  );
  const hasSeriesMetadata =
    game?.seriesGameNumber !== null &&
    game?.seriesGameNumber !== undefined &&
    String(game.seriesGameNumber).trim() !== "";

  if (labelText.includes("play in") || labelText.includes("play-in")) {
    return { phase: "play_in", round: "play_in" };
  }

  if (labelText.includes("nba finals")) {
    return { phase: "playoffs", round: "finals" };
  }

  if (
    labelText.includes("conference finals") ||
    labelText.includes("east finals") ||
    labelText.includes("west finals") ||
    labelText.includes("eastern finals") ||
    labelText.includes("western finals")
  ) {
    return { phase: "playoffs", round: "conf_finals" };
  }

  if (
    labelText.includes("semifinals") ||
    labelText.includes("semi finals") ||
    labelText.includes("semis") ||
    labelText.includes("second round") ||
    labelText.includes("2nd round")
  ) {
    return { phase: "playoffs", round: "conf_semis" };
  }

  if (
    labelText.includes("first round") ||
    labelText.includes("1st round") ||
    labelText.includes("quarterfinals") ||
    labelText.includes("quarter finals")
  ) {
    return { phase: "playoffs", round: "first_round" };
  }

  if (labelText.includes("finals")) {
    return { phase: "playoffs", round: "finals" };
  }

  if (stage === 4 || hasSeriesMetadata || labelText.includes("playoff")) {
    return { phase: "playoffs", round: null };
  }

  return { phase: "regular", round: null };
}

export function isPostseasonGame(game: any): boolean {
  return classifyPostseasonGame(game).phase !== "regular";
}

export function isGameForSeasonType(
  game: any,
  seasonType: NbaSeasonType,
): boolean {
  const phase = classifyPostseasonGame(game).phase;

  if (seasonType === "Playoffs") {
    return phase === "playoffs";
  }

  return phase === "regular";
}
