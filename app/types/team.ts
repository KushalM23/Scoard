export type TeamTab = "team-stats" | "player-stats" | "roster";
export type SeasonType = "Regular Season";
export type TeamRange = 5 | 10 | 15;

export interface TeamApiError {
  code: string;
  message: string;
  section: string;
}

export interface TeamInjuryData {
  playerName: string;
  status: string;
  note?: string;
  updatedAt?: string;
}

export interface TeamOverviewData {
  teamId: number;
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
  recentForm: string[];
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
  injuries: {
    list: TeamInjuryData[];
    reason?: string;
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
}

export interface TeamRosterPlayer {
  playerId: number;
  playerName: string;
  jersey?: string;
  position?: string;
  status?: string;
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
  gameTime?: string;
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
}

export interface TeamResultsData {
  teamId: number;
  games: TeamGameListItem[];
}

export interface TeamPagePayload {
  teamId: number;
  tab: TeamTab;
  seasonType: SeasonType;
  overview: TeamOverviewData | TeamApiError;
  stats: TeamStatsData | TeamApiError;
  roster: TeamRosterData | TeamApiError;
  schedule: TeamScheduleData | TeamApiError;
  results: TeamResultsData | TeamApiError;
}
