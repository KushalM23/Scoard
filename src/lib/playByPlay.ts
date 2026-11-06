import type { PlayByPlayEvent } from "@/types";

export interface NormalizedGameEvent {
  id: string;
  actionNumber: number | null;
  period: number;
  clock: string;
  type: string;
  subType: string;
  teamId: number | null;
  teamTricode: string;
  playerId: number | null;
  playerName: string;
  description: string;
  score: { home: number | null; away: number | null } | null;
  shotResult: "Made" | "Missed" | null;
  location: { x: number; y: number } | null;
}

export interface CourtPoint {
  x: number;
  y: number;
  left: string;
  top: string;
}

export interface GameTeams {
  homeTeamId: number;
  awayTeamId: number;
}

function numericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeActionType(event: PlayByPlayEvent): string {
  const rawType = textValue(event.actionType).toLowerCase();
  if (rawType.includes("free throw")) return "freethrow";
  const shotValue = numericValue(event.shotValue);
  const description = textValue(event.description);
  const isShot = rawType === "made shot"
    || rawType === "missed shot"
    || rawType.includes("field goal")
    || event.isFieldGoal === true
    || event.isFieldGoal === 1;
  if (isShot) return shotValue === 3 || /3\s*[- ]?pt/i.test(description) ? "3pt" : "2pt";
  if (rawType.includes("jump ball")) return "jumpball";
  return rawType.replace(/\s+/g, "");
}

function isShotAction(event: PlayByPlayEvent): boolean {
  const type = textValue(event.actionType).toLowerCase();
  return event.isFieldGoal === true
    || event.isFieldGoal === 1
    || type.includes("shot")
    || type === "2pt"
    || type === "3pt"
    || numericValue(event.shotValue) === 2
    || numericValue(event.shotValue) === 3;
}

function isHomeAction(
  teamId: number | null,
  eventLocation: unknown,
  teams?: GameTeams,
): boolean | null {
  if (teamId !== null && teams) {
    if (teamId === teams.homeTeamId) return true;
    if (teamId === teams.awayTeamId) return false;
  }

  const locationCode = textValue(eventLocation).toLowerCase();
  if (locationCode === "h") return true;
  if (locationCode === "v") return false;
  return null;
}

function normalizeLocation(xValue: unknown, yValue: unknown) {
  const x = numericValue(xValue);
  const y = numericValue(yValue);
  if (x === null || y === null || x < -1 || x > 101 || y < -1 || y > 51) {
    return null;
  }
  if (x === 0 && y === 0) return null;

  // The feed can report a fraction beyond the nominal edge, so keep the marker
  // on the court while preserving valid event locations.
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(50, y)),
  };
}

function normalizeLegacyShotLocation(
  event: PlayByPlayEvent,
  teamId: number | null,
  period: number,
  teams?: GameTeams,
) {
  const xLegacy = numericValue(event.xLegacy);
  const yLegacy = numericValue(event.yLegacy);
  if (xLegacy === null || yLegacy === null || Math.abs(xLegacy) > 300 || yLegacy < -60 || yLegacy > 470) {
    return null;
  }

  if (!isShotAction(event)) return null;
  const isHomeEvent = isHomeAction(teamId, event.location, teams);
  if (isHomeEvent === null) return null;

  // xLegacy/yLegacy are tenths of a foot relative to the attacking basket.
  // Standardize the view so home attacks right in the first half and left after halftime.
  const attacksRight = period <= 2 ? isHomeEvent : !isHomeEvent;
  const svgX = attacksRight ? 887.5 - yLegacy : 52.5 + yLegacy;
  const svgY = 250 + xLegacy;
  return normalizeLocation(svgX / 9.4, svgY / 10);
}

function normalizeDirectShotLocation(
  location: NonNullable<NormalizedGameEvent["location"]>,
  event: PlayByPlayEvent,
  teamId: number | null,
  period: number,
  teams?: GameTeams,
) {
  if (!isShotAction(event) || period <= 0) return location;
  const isHomeEvent = isHomeAction(teamId, event.location, teams);
  if (isHomeEvent === null) return location;

  const attacksRight = period <= 2 ? isHomeEvent : !isHomeEvent;
  const actualBasketIsRight = location.x > 50;
  return actualBasketIsRight === attacksRight
    ? location
    : { x: 100 - location.x, y: 50 - location.y };
}

function normalizeEvent(
  event: PlayByPlayEvent,
  teams?: GameTeams,
): NormalizedGameEvent | null {
  const actionNumber = numericValue(event.actionNumber);
  const period = numericValue(event.period) ?? 0;
  const type = normalizeActionType(event);
  const subType = textValue(event.subType);
  const rawPlayerId = numericValue(event.personId);
  const playerId = rawPlayerId !== null && rawPlayerId > 0 ? rawPlayerId : null;
  const description = textValue(event.description);
  const clock = textValue(event.clock);
  const rawTeamId = numericValue(event.teamId);
  const teamId = rawTeamId !== null && rawTeamId > 0 ? rawTeamId : null;
  const teamTricode = textValue(event.teamTricode);
  const playerName = textValue(event.playerNameI) || textValue(event.playerName);

  const scoreHome = numericValue(event.scoreHome);
  const scoreAway = numericValue(event.scoreAway);
  const score = scoreHome === null && scoreAway === null
    ? null
    : { home: scoreHome, away: scoreAway };

  const directLocation = normalizeLocation(event.x, event.y);
  const location = directLocation
    ? normalizeDirectShotLocation(directLocation, event, teamId, period, teams)
    : normalizeLegacyShotLocation(event, teamId, period, teams);
  const id = actionNumber !== null
    ? String(actionNumber)
    : `${period}:${clock}:${type}:${playerId ?? ""}:${description}`;

  if (!id || (!type && !description)) return null;

  return {
    id,
    actionNumber,
    period,
    clock,
    type,
    subType,
    teamId,
    teamTricode,
    playerId,
    playerName,
    description,
    score,
    shotResult: event.shotResult === "Made" || event.shotResult === "Missed"
      ? event.shotResult
      : textValue(event.actionType).toLowerCase().includes("made shot")
        ? "Made"
        : textValue(event.actionType).toLowerCase().includes("missed shot")
          ? "Missed"
          : null,
    location,
  };
}

/** Normalize, correct duplicate action numbers, and order feed snapshots once. */
export function normalizePlayByPlayEvents(
  actions: PlayByPlayEvent[],
  teams?: GameTeams,
): NormalizedGameEvent[] {
  const byId = new Map<string, NormalizedGameEvent>();

  actions.forEach((action) => {
    const event = normalizeEvent(action, teams);
    if (event) byId.set(event.id, event);
  });

  return [...byId.values()].sort((left, right) => {
    if (left.actionNumber === null) return right.actionNumber === null ? 0 : 1;
    if (right.actionNumber === null) return -1;
    return left.actionNumber - right.actionNumber;
  });
}

/** Map feed coordinates (x: 0–100, y: 0–50) to the 940×500 SVG court. */
export function mapEventLocationToCourt(
  location: NormalizedGameEvent["location"],
): CourtPoint | null {
  if (!location) return null;

  return {
    x: location.x * 9.4,
    y: location.y * 10,
    left: `${location.x}%`,
    top: `${(location.y / 50) * 100}%`,
  };
}

export function formatGameClock(clock: string): string {
  const match = clock.match(/PT(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!match) return clock || "—";
  const minutes = Number(match[1] ?? 0);
  const seconds = Math.floor(Number(match[2] ?? 0));
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatPeriod(period: number): string {
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

export function getEventScoreAtIndex(
  events: NormalizedGameEvent[],
  eventId: string | null,
): { home: number; away: number } | null {
  if (!eventId) return null;
  const selectedIndex = events.findIndex((event) => event.id === eventId);
  if (selectedIndex < 0) return null;

  let home: number | null = null;
  let away: number | null = null;
  for (let index = 0; index <= selectedIndex; index += 1) {
    const score = events[index].score;
    if (!score) continue;
    if (score.home !== null) home = score.home;
    if (score.away !== null) away = score.away;
  }

  if (home === null && away === null) return null;
  return { home: home ?? 0, away: away ?? 0 };
}
