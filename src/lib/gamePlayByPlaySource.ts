import axios from "axios";
import { CDN_HEADERS, fetchStatsApi } from "@/lib/statsApi";

type ActionRecord = Record<string, any>;
const USE_CDN_QUALITY_THRESHOLD = 0.72;

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function actionsFromResponse(payload: any): ActionRecord[] {
  if (Array.isArray(payload?.game?.actions)) return payload.game.actions;
  if (Array.isArray(payload?.actions)) return payload.actions;

  const resultSets = Array.isArray(payload?.resultSets)
    ? payload.resultSets
    : Array.isArray(payload?.resultSet)
      ? payload.resultSet
      : payload?.resultSets && typeof payload.resultSets === "object"
        ? Object.values(payload.resultSets)
      : payload?.resultSet && typeof payload.resultSet === "object"
        ? Object.values(payload.resultSet)
      : [];
  const playByPlaySet = resultSets.find((set: any) =>
    Array.isArray(set?.headers)
      && Array.isArray(set?.rowSet)
      && set.headers.some((header: string) => ["EVENTNUM", "actionNumber"].includes(header)),
  );
  if (!playByPlaySet) return [];

  return playByPlaySet.rowSet.map((row: any[]) => {
    const item = Object.fromEntries(
      playByPlaySet.headers.map((header: string, index: number) => [header, row[index]]),
    );
    return normalizeLegacyAction(item);
  });
}

function normalizeLegacyAction(row: ActionRecord): ActionRecord {
  const eventType = Number(row.EVENTMSGTYPE);
  const description = [row.HOMEDESCRIPTION, row.VISITORDESCRIPTION, row.NEUTRALDESCRIPTION]
    .find((value) => hasValue(value)) ?? "";
  const scoreMatch = String(row.SCORE ?? "").match(/(\d+)\s*-\s*(\d+)/);
  const playerName = String(row.PLAYER1_NAME ?? "");
  const descriptionText = String(description);
  const isThreePoint = /3\s*[- ]?pt/i.test(descriptionText);

  const actionType = eventType === 1 || eventType === 2
    ? isThreePoint ? "3pt" : "2pt"
    : ({
        3: "freethrow",
        4: "rebound",
        5: "turnover",
        6: "foul",
        7: "violation",
        8: "substitution",
        9: "timeout",
        10: "jumpball",
        11: "ejection",
        12: "period",
      } as Record<number, string>)[eventType] ?? "play";

  return {
    actionNumber: Number(row.EVENTNUM) || null,
    clock: String(row.PCTIMESTRING ?? row.WCTIMESTRING ?? ""),
    period: Number(row.PERIOD) || 0,
    teamId: Number(row.PLAYER1_TEAM_ID) || null,
    teamTricode: String(row.PLAYER1_TEAM_ABBREVIATION ?? ""),
    personId: Number(row.PLAYER1_ID) || null,
    playerName,
    playerNameI: playerName,
    actionType,
    subType: String(row.EVENTMSGACTIONTYPE ?? ""),
    shotResult: eventType === 1 ? "Made" : eventType === 2 ? "Missed" : undefined,
    isFieldGoal: eventType === 1 || eventType === 2 ? 1 : 0,
    shotValue: eventType === 1 || eventType === 2 ? isThreePoint ? 3 : 2 : 0,
    xLegacy: hasValue(row.LOC_X) ? Number(row.LOC_X) : hasValue(row.xLegacy) ? Number(row.xLegacy) : null,
    yLegacy: hasValue(row.LOC_Y) ? Number(row.LOC_Y) : hasValue(row.yLegacy) ? Number(row.yLegacy) : null,
    location: row.location,
    description: descriptionText,
    scoreHome: scoreMatch?.[1],
    scoreAway: scoreMatch?.[2],
  };
}

function actionQuality(actions: ActionRecord[]): number {
  if (actions.length === 0) return 0;

  const values = actions.reduce((total, action) => {
    const hasCoreText = hasValue(action.description) || hasValue(action.actionType) || hasValue(action.subType);
    if (!hasCoreText) return total;

    return total
      + Number(hasValue(action.description))
      + Number(hasValue(action.actionType))
      + Number(hasValue(action.clock))
      + Number(Number(action.period) > 0)
      + Number(hasValue(action.teamTricode) || Number(action.teamId) > 0)
      + Number(hasValue(action.playerNameI) || Number(action.personId) > 0);
  }, 0);

  return values / (actions.length * 6);
}

function mergeActions(primary: ActionRecord[], supplemental: ActionRecord[]): ActionRecord[] {
  const supplementalById = new Map(
    supplemental.map((action) => [String(action.actionNumber ?? ""), action]),
  );
  const primaryIds = new Set<string>();

  const merged = primary.map((action) => {
    const id = String(action.actionNumber ?? "");
    primaryIds.add(id);
    const fallback = supplementalById.get(id);
    if (!fallback) return action;

    const result = { ...fallback, ...action };
    Object.keys(fallback).forEach((key) => {
      if (!hasValue(action[key]) && hasValue(fallback[key])) result[key] = fallback[key];
    });
    return result;
  });

  supplemental.forEach((action) => {
    const id = String(action.actionNumber ?? "");
    if (!primaryIds.has(id)) merged.push(action);
  });

  return merged.sort((left, right) => Number(left.actionNumber ?? 0) - Number(right.actionNumber ?? 0));
}

/** Read the live CDN first, then enrich older or incomplete feeds with Stats API PBP. */
export async function fetchGamePlayByPlay(gameId: string): Promise<ActionRecord[]> {
  let cdnActions: ActionRecord[] = [];
  let cdnRequestSucceeded = false;
  let lastError: unknown;

  try {
    const response = await axios.get(
      `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`,
      { headers: CDN_HEADERS, timeout: 15_000 },
    );
    cdnRequestSucceeded = true;
    cdnActions = actionsFromResponse(response.data);
  } catch (error) {
    lastError = error;
    console.warn(`NBA CDN play-by-play unavailable for ${gameId}.`);
  }

  const cdnQuality = actionQuality(cdnActions);
  if (cdnQuality >= USE_CDN_QUALITY_THRESHOLD) return cdnActions;
  if (cdnRequestSucceeded) {
    console.warn(`NBA CDN play-by-play for ${gameId} is incomplete (quality ${cdnQuality.toFixed(2)}); trying Stats API.`);
  }

  let bestSupplement: ActionRecord[] = [];
  for (const endpoint of ["playbyplayv3", "playbyplayv2"]) {
    try {
      const response = await fetchStatsApi(
        endpoint,
        { GameID: gameId, StartPeriod: 0, EndPeriod: 14 },
        1,
        60,
      );
      const actions = actionsFromResponse(response);
      if (actionQuality(actions) > actionQuality(bestSupplement)) bestSupplement = actions;
      if (actionQuality(actions) >= USE_CDN_QUALITY_THRESHOLD) break;
    } catch (error) {
      lastError = error;
      console.warn(`NBA Stats ${endpoint} play-by-play unavailable for ${gameId}.`);
    }
  }

  const combined = mergeActions(cdnActions, bestSupplement);
  if (combined.length > 0) return combined;
  if (cdnRequestSucceeded) return [];

  throw new Error(`No play-by-play source returned data for game ${gameId}.`, { cause: lastError });
}
