import type { SeasonType } from "@/app/types/team";

export type PlayerTab = "overview" | "stats" | "game-log";
export type PlayerSection = "header" | "overview" | "stats" | "gameLog";

export interface PlayerApiError {
  code: string;
  message: string;
  section: string;
}

export interface PlayerBasicStatLine {
  gamesPlayed: number;
  wins: number;
  losses: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgm: number;
  fga: number;
  threePtMade: number;
  threePtAttempted: number;
  ftm: number;
  fta: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}

export interface PlayerCareerBasicStats {
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgm: number;
  fga: number;
  threePtMade: number;
  threePtAttempted: number;
  ftm: number;
  fta: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}

export interface PlayerTeamHistorySeasonEntry {
  seasonId: string;
  teamId: number;
  teamName: string;
  teamTricode: string;
  isTotalRow: boolean;
}

export interface PlayerTeamHistoryTeam {
  teamId: number;
  teamName: string;
  teamTricode: string;
}

export interface PlayerHeaderData {
  playerId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  teamId: number;
  teamName: string;
  teamTricode: string;
  jersey: string;
  position: string;
  height: string;
  weight: string;
  birthdate: string | null;
  age: number | null;
  experience: string;
  school: string;
  country: string;
  fromYear: string;
  toYear: string;
  draft: {
    year: string;
    round: string;
    pick: string;
    display: string;
  };
  teamsPlayedFor: PlayerTeamHistoryTeam[];
  seasonTeamHistory: PlayerTeamHistorySeasonEntry[];
  fieldAudit?: {
    inspectedEndpoints: string[];
    fields: Array<{
      field: string;
      sourceEndpoint: string | null;
      sourceKey: string | null;
      available: boolean;
      previousFormat: string;
      formattedAs: string;
      note?: string;
    }>;
    missingRequiredFields: string[];
  };
}

export interface PlayerOverviewData {
  playerId: number;
  currentSeasonBasic: PlayerBasicStatLine;
  careerBasic: PlayerCareerBasicStats | null;
  careerHighs: Array<{
    label: string;
    value: number;
    gameDate: string | null;
    opponentTricode: string | null;
  }>;
  awards: {
    total: number;
    grouped: Array<{
      label: string;
      count: number;
      years: string[];
    }>;
  };
}

export interface PlayerSeasonTable {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
}

export interface PlayerStatsData {
  playerId: number;
  basic: PlayerSeasonTable;
  advanced: PlayerSeasonTable;
  per36: PlayerSeasonTable;
}

export interface PlayerGameLogEntry {
  gameId: string;
  gameDate: string;
  matchup: string;
  result: "W" | "L" | "";
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgm: number;
  fga: number;
  threePtMade: number;
  threePtAttempted: number;
  ftm: number;
  fta: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}

export interface PlayerGameLogData {
  playerId: number;
  games: PlayerGameLogEntry[];
}

export interface PlayerPagePayload {
  playerId: number;
  tab: PlayerTab;
  season: string;
  seasonType: SeasonType;
  include: PlayerSection[];
  header?: PlayerHeaderData | PlayerApiError;
  overview?: PlayerOverviewData | PlayerApiError;
  stats?: PlayerStatsData | PlayerApiError;
  gameLog?: PlayerGameLogData | PlayerApiError;
}
