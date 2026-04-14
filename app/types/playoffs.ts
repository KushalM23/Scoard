export type ConferenceKey = "east" | "west";

export type BracketStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed";

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

export interface BracketSeriesCard {
  id: string;
  href: string | null;
  pageAvailable: boolean;
  phase: "play_in" | "playoffs";
  conference: ConferenceKey | null;
  round: "play_in" | "first_round" | "conf_semis" | "conf_finals" | "finals";
  roundLabel: string;
  slot: string;
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

export interface SeriesOverviewTeam {
  slot: "top" | "bottom";
  teamId: number;
  seed: number | null;
  tricode: string;
  displayName: string;
  logoUrl: string | null;
  seriesWins: number;
  regularSeasonRecord: {
    wins: number;
    losses: number;
    winPct: number;
  };
  conferenceRank: number;
  divisionRank: number;
  streak: string;
  contextRecord: {
    wins: number;
    losses: number;
  };
}

export interface SeriesGameItem {
  gameId: string;
  gameNumber: number | null;
  scheduledAt: string;
  status: "scheduled" | "in_progress" | "completed";
  statusText: string;
  winnerTeamId: number | null;
  homeTeam: {
    teamId: number | null;
    tricode: string;
    displayName: string;
    score: number | null;
  };
  awayTeam: {
    teamId: number | null;
    tricode: string;
    displayName: string;
    score: number | null;
  };
}

export interface SeriesStatsTeam {
  slot: "top" | "bottom";
  teamId: number;
  seed: number | null;
  tricode: string;
  displayName: string;
  logoUrl: string | null;
  seriesWins: number;
  state: "tbd" | "active" | "advanced" | "eliminated";
  isTbd: boolean;
  regularSeasonRecord: {
    wins: number;
    losses: number;
    winPct: number;
  };
  conferenceRank: number;
  divisionRank: number;
  streak: string;
  contextRecord: {
    wins: number;
    losses: number;
  };
  stats: {
    teamMetrics: {
      gamesPlayed: number;
      wins: number;
      losses: number;
      pointsPerGame: number;
      reboundsPerGame: number;
      assistsPerGame: number;
      netRating?: number;
      offRating?: number;
      defRating?: number;
      pace?: number;
    };
    homeAwaySplits?: {
      home: { wins: number; losses: number };
      away: { wins: number; losses: number };
    };
    tables?: Record<string, unknown>;
    playerStats: Array<Record<string, unknown>>;
  };
}

export interface PlayoffSeriesPayload {
  season: string;
  sourceSeason: string;
  generatedAt: string;
  source: string;
  note: string | null;
  series: BracketSeriesCard;
  statsContext: {
    mode: "playoff_context" | "regular_season_preview";
    seasonType: "Playoffs" | "Regular Season";
    label: string;
    description: string;
  };
  overview: {
    teams: SeriesOverviewTeam[];
  };
  tabs: {
    games: {
      totalGames: number;
      completedGames: number;
      items: SeriesGameItem[];
    };
    stats: {
      mode: "playoff_context" | "regular_season_preview";
      seasonType: "Playoffs" | "Regular Season";
      label: string;
      description: string;
      teams: SeriesStatsTeam[];
    };
  };
}
