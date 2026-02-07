export interface Player {
    personId: number;
    firstName: string;
    lastName: string;
    jersey: string;
    position: string;
    status: string; // 'ACTIVE' | 'INACTIVE'
    notPlayingReason?: string;
    points: number;
    rebounds: number;
    assists: number;
    fouls: number;
    fgPercentage: number;
    threePtPercentage: number;
    ftPercentage: number;
    plusMinus: number;
    fg: string; // e.g. "10-20"
    threePt: string; // e.g. "3-8"
    ft: string; // e.g. "5-6"
    minutes: string;
    blocks: number;
    steals: number;
    turnovers: number;
    reboundsOffensive: number;
    reboundsDefensive: number;
    isOnCourt: boolean;
    teamId: number;
}

export interface TeamStatistics {
    fieldGoalsPercentage: number;
    threePointersPercentage: number;
    freeThrowsPercentage: number;
    reboundsTotal: number;
    assists: number;
    turnovers: number;
    pointsInThePaint: number;
    fastBreakPoints: number;
    blocks: number;
    steals: number;
    benchPoints?: number;
    pointsFromTurnovers?: number;
    reboundsOffensive?: number;
    reboundsDefensive?: number;
    reboundsTeamOffensive?: number;
    reboundsTeamDefensive?: number;
    pointsFastBreak?: number;
    fieldGoalsAttempted?: number;
    fieldGoalsMade?: number;
    freeThrowsAttempted?: number;
    freeThrowsMade?: number;
    threePointersAttempted?: number;
    threePointersMade?: number;
}

export interface Team {
    teamId: number;
    teamName: string;
    teamCity: string;
    teamTricode: string;
    score: number;
    timeoutsRemaining: number;
    inBonus: boolean;
    periods: number[]; // Scores per period
    wins: number;
    losses: number;
    statistics?: TeamStatistics;
}

export interface Matchup {
    gameId: string;
    gameDate: string;
    matchup: string;
    wl: string;
    pts: number;
    plusMinus: number;
}

export interface WinProbability {
    homeWinPct: number;
    awayWinPct: number;
    homeWinProb: number;
    awayWinProb: number;
}

export interface PlayByPlayEvent {
    actionNumber: number;
    clock: string;
    period: number;
    teamId: number;
    teamTricode: string;
    personId: number;
    playerName: string;
    playerNameI: string; // Initial. Lastname
    actionType: string;
    subType?: string; // e.g., 'Layup', '3PT'
    shotResult?: 'Made' | 'Missed';
    x: number; // 0-100
    y: number; // 0-50
    description: string;
    qualifiers?: string[];
    descriptor?: string; // Add descriptor
    stealPersonId?: number;
    blockPersonId?: number;
    assistPersonId?: number;
    shotDistance?: number;
    pointsTotal?: number;
    scoreHome?: string;
    scoreAway?: string;
    side?: string;
}

export interface GameData {
    gameId: string;
    gameStatus: number; // 1: Scheduled, 2: Live, 3: Final
    gameStatusText: string;
    gameEt: string; // Added gameEt
    period: number;
    clock: string;
    homeTeam: Team;
    awayTeam: Team;
    arena: {
        name: string;
        city: string;
    };
    previousMatchups?: Matchup[];
    winProbability?: WinProbability;
    players?: Player[];
}
