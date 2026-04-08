export type TeamTab = "team-stats" | "player-stats" | "roster";
export type SeasonType = "Regular Season";
export type TeamRange = 5 | 10 | 15;

export interface TeamApiError {
  code: string;
  message: string;
  section: string;
}

export interface TeamOverviewData {
  teamId: number;
  logoUrl?: string;
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

export interface TeamStatsStandardRow {
  GP: number;
  PPG: number;
  RPG: number;
  APG: number;
  BPG: number;
  SPG: number;
  TOV: number;
  ORPG: number;
  DRPG: number;
  FG_PCT: string;
  FG3_PCT: string;
  FT_PCT: string;
  FG3A: number;
  FG3M: number;
  FGA: number;
  FGM: number;
  FTA: number;
  FTM: number;
  PF: number;
}

export interface TeamStatsOpponentRow {
  PPG: number;
  RPG: number;
  APG: number;
  BPG: number;
  SPG: number;
  TOV: number;
  ORPG: number;
  DRPG: number;
  FG_PCT: string;
  FG3_PCT: string;
  FT_PCT: string;
  FG3A: number;
  FG3M: number;
  FGA: number;
  FGM: number;
  FTA: number;
  FTM: number;
  PF: number;
}

export interface TeamStatsAdvancedRow {
  ORtg: number;
  DRtg: number;
  Pace: number;
  eFG_PCT: string;
  Opp_eFG_PCT: string;
  DRB_PCT: string;
  ORB_PCT: string;
  TOV_PCT: string;
  Opp_TOV_PCT: string;
}

export interface TeamStatsTables {
  teamPerGame: TeamStatsStandardRow;
  teamTotals: TeamStatsStandardRow;
  opponentPerGame: TeamStatsOpponentRow;
  advanced: TeamStatsAdvancedRow;
  fieldAudit: {
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

export interface TeamStatsPlayerRow {
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
  fouls: number;
  oReb: number;
  dReb: number;
  fga: number;
  fgm: number;
  fta: number;
  ftm: number;
  threePtA: number;
  threePtM: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
}

export interface TeamStatsData {
  teamMetrics: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    offRating?: number;
    defRating?: number;
    netRating?: number;
    pace?: number;
    pointsPerGame: number;
    reboundsPerGame: number;
    assistsPerGame: number;
  };
  homeAwaySplits?: {
    home: { wins: number; losses: number };
    away: { wins: number; losses: number };
  };
  playerStats: TeamStatsPlayerRow[];
  tables?: TeamStatsTables;
}

export interface TeamRosterPlayer {
  playerId: number;
  playerName: string;
  jersey?: string;
  position?: string;
  age?: number;
  height?: string;
  weight?: string;
  experience?: string;
}

export interface TeamRosterData {
  teamId: number;
  players: TeamRosterPlayer[];
}

export interface TeamGameListItem {
  gameId: string;
  gameDate: string;
  gameDateDisplay?: string;
  gameTime?: string;
  gameTimeDisplay?: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeamTricode?: string;
  awayTeamTricode?: string;
  homeTeamScore?: number;
  awayTeamScore?: number;
  opponentTeamId: number;
  opponentTricode: string;
  opponentName: string;
  homeAway: "Home" | "Away";
  status: string;
  finalScore?: string;
  result?: "W" | "L";
}

export interface TeamScheduleData {
  teamId: number;
  games: TeamGameListItem[];
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

export interface TeamResultsData {
  teamId: number;
  games: TeamGameListItem[];
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

export interface TeamPagePayload {
  teamId: number;
  tab: TeamTab;
  season: string;
  seasonType: SeasonType;
  include?: Array<"overview" | "stats" | "roster" | "schedule" | "results">;
  overview?: TeamOverviewData | TeamApiError;
  stats?: TeamStatsData | TeamApiError;
  roster?: TeamRosterData | TeamApiError;
  schedule?: TeamScheduleData | TeamApiError;
  results?: TeamResultsData | TeamApiError;
}
