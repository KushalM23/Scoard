import type { GameData, Player, PlayByPlayEvent } from '../types';

export const mockGameData: GameData = {
    gameId: '0022300001',
    gameStatus: 2,
    gameStatusText: 'Q4 2:30',
    period: 4,
    clock: '2:30',
    homeTeam: {
        teamId: 1610612747,
        teamName: 'Lakers',
        teamCity: 'Los Angeles',
        teamTricode: 'LAL',
        score: 108,
        timeoutsRemaining: 3,
        inBonus: true,
        periods: [28, 30, 25, 25],
        wins: 15,
        losses: 10
    },
    awayTeam: {
        teamId: 1610612742,
        teamName: 'Mavericks',
        teamCity: 'Dallas',
        teamTricode: 'DAL',
        score: 105,
        timeoutsRemaining: 2,
        inBonus: false,
        periods: [25, 32, 24, 24],
        wins: 14,
        losses: 11
    },
    arena: {
        name: 'Crypto.com Arena',
        city: 'Los Angeles'
    }
};

export const mockPlayers: Player[] = [
    // Lakers
    { personId: 2544, firstName: 'LeBron', lastName: 'James', jersey: '23', position: 'F', points: 28, rebounds: 8, assists: 9, fouls: 2, fgPercentage: 52.4, threePtPercentage: 33.3, ftPercentage: 75.0, plusMinus: 12, fg: '11-21', threePt: '2-6', isOnCourt: true, teamId: 1610612747, status: 'ACTIVE', ft: '3-4', minutes: '35', blocks: 1, steals: 2, turnovers: 3, reboundsOffensive: 2, reboundsDefensive: 6 },
    { personId: 203076, firstName: 'Anthony', lastName: 'Davis', jersey: '3', position: 'C', points: 22, rebounds: 12, assists: 3, fouls: 3, fgPercentage: 58.8, threePtPercentage: 25.0, ftPercentage: 80.0, plusMinus: 8, fg: '10-17', threePt: '1-4', isOnCourt: true, teamId: 1610612747, status: 'ACTIVE', ft: '4-5', minutes: '38', blocks: 3, steals: 1, turnovers: 2, reboundsOffensive: 4, reboundsDefensive: 8 },
    { personId: 1630559, firstName: 'Austin', lastName: 'Reaves', jersey: '15', position: 'G', points: 18, rebounds: 4, assists: 6, fouls: 1, fgPercentage: 46.2, threePtPercentage: 40.0, ftPercentage: 90.0, plusMinus: 5, fg: '6-13', threePt: '2-5', isOnCourt: true, teamId: 1610612747, status: 'ACTIVE', ft: '4-4', minutes: '32', blocks: 0, steals: 1, turnovers: 1, reboundsOffensive: 1, reboundsDefensive: 3 },
    { personId: 1629637, firstName: 'Jaxson', lastName: 'Hayes', jersey: '11', position: 'C', points: 4, rebounds: 3, assists: 0, fouls: 4, fgPercentage: 66.7, threePtPercentage: 0.0, ftPercentage: 50.0, plusMinus: -2, fg: '2-3', threePt: '0-0', isOnCourt: false, teamId: 1610612747, status: 'ACTIVE', ft: '0-0', minutes: '12', blocks: 1, steals: 0, turnovers: 1, reboundsOffensive: 1, reboundsDefensive: 2 },
    { personId: 1629020, firstName: 'Jarred', lastName: 'Vanderbilt', jersey: '2', position: 'F', points: 6, rebounds: 5, assists: 1, fouls: 2, fgPercentage: 42.9, threePtPercentage: 0.0, ftPercentage: 66.7, plusMinus: 4, fg: '3-7', threePt: '0-1', isOnCourt: true, teamId: 1610612747, status: 'ACTIVE', ft: '0-0', minutes: '20', blocks: 0, steals: 2, turnovers: 0, reboundsOffensive: 2, reboundsDefensive: 3 },
    { personId: 1626156, firstName: 'D\'Angelo', lastName: 'Russell', jersey: '1', position: 'G', points: 15, rebounds: 2, assists: 5, fouls: 1, fgPercentage: 41.7, threePtPercentage: 37.5, ftPercentage: 85.7, plusMinus: 6, fg: '5-12', threePt: '3-8', isOnCourt: true, teamId: 1610612747, status: 'ACTIVE', ft: '2-2', minutes: '28', blocks: 0, steals: 1, turnovers: 2, reboundsOffensive: 0, reboundsDefensive: 2 },
    
    // Mavericks
    { personId: 1629029, firstName: 'Luka', lastName: 'Doncic', jersey: '77', position: 'G', points: 32, rebounds: 9, assists: 10, fouls: 2, fgPercentage: 48.0, threePtPercentage: 35.7, ftPercentage: 88.9, plusMinus: -5, fg: '12-25', threePt: '5-14', isOnCourt: true, teamId: 1610612742, status: 'ACTIVE', ft: '3-3', minutes: '38', blocks: 0, steals: 2, turnovers: 4, reboundsOffensive: 1, reboundsDefensive: 8 },
    { personId: 202681, firstName: 'Kyrie', lastName: 'Irving', jersey: '11', position: 'G', points: 24, rebounds: 3, assists: 5, fouls: 3, fgPercentage: 45.0, threePtPercentage: 42.9, ftPercentage: 92.3, plusMinus: -8, fg: '9-20', threePt: '3-7', isOnCourt: true, teamId: 1610612742, status: 'ACTIVE', ft: '3-3', minutes: '36', blocks: 0, steals: 1, turnovers: 2, reboundsOffensive: 0, reboundsDefensive: 3 },
    { personId: 1630178, firstName: 'Tyrell', lastName: 'Terry', jersey: '1', position: 'G', points: 0, rebounds: 0, assists: 0, fouls: 0, fgPercentage: 0.0, threePtPercentage: 0.0, ftPercentage: 0.0, plusMinus: 0, fg: '0-0', threePt: '0-0', isOnCourt: false, teamId: 1610612742, status: 'INACTIVE', ft: '0-0', minutes: '0', blocks: 0, steals: 0, turnovers: 0, reboundsOffensive: 0, reboundsDefensive: 0 },
    { personId: 1630573, firstName: 'Dereck', lastName: 'Lively II', jersey: '2', position: 'C', points: 10, rebounds: 8, assists: 1, fouls: 4, fgPercentage: 71.4, threePtPercentage: 0.0, ftPercentage: 60.0, plusMinus: -4, fg: '5-7', threePt: '0-0', isOnCourt: true, teamId: 1610612742, status: 'ACTIVE', ft: '0-0', minutes: '25', blocks: 2, steals: 0, turnovers: 1, reboundsOffensive: 3, reboundsDefensive: 5 },
    { personId: 1627827, firstName: 'Dorian', lastName: 'Finney-Smith', jersey: '10', position: 'F', points: 8, rebounds: 5, assists: 2, fouls: 2, fgPercentage: 40.0, threePtPercentage: 33.3, ftPercentage: 75.0, plusMinus: -6, fg: '3-7', threePt: '2-6', isOnCourt: true, teamId: 1610612742, status: 'ACTIVE', ft: '0-0', minutes: '30', blocks: 1, steals: 1, turnovers: 1, reboundsOffensive: 1, reboundsDefensive: 4 },
    { personId: 203501, firstName: 'Tim', lastName: 'Hardaway Jr.', jersey: '11', position: 'G', points: 12, rebounds: 2, assists: 1, fouls: 1, fgPercentage: 36.4, threePtPercentage: 30.0, ftPercentage: 100.0, plusMinus: -3, fg: '4-11', threePt: '3-10', isOnCourt: true, teamId: 1610612742, status: 'ACTIVE', ft: '1-1', minutes: '22', blocks: 0, steals: 0, turnovers: 1, reboundsOffensive: 0, reboundsDefensive: 2 },
];

export const mockPbpData: PlayByPlayEvent[] = [
    {
        actionNumber: 450,
        clock: '2:45',
        period: 4,
        teamId: 1610612742,
        teamTricode: 'DAL',
        personId: 1629029,
        playerName: 'Luka Doncic',
        playerNameI: 'L. Doncic',
        actionType: 'shot',
        subType: 'Layup',
        shotResult: 'Missed',
        x: 47,
        y: 10,
        description: 'L. Doncic Layup Missed'
    },
    {
        actionNumber: 451,
        clock: '2:43',
        period: 4,
        teamId: 1610612747,
        teamTricode: 'LAL',
        personId: 203076,
        playerName: 'Anthony Davis',
        playerNameI: 'A. Davis',
        actionType: 'rebound',
        x: 50,
        y: 12,
        description: 'A. Davis Rebound'
    },
    {
        actionNumber: 452,
        clock: '2:35',
        period: 4,
        teamId: 1610612747,
        teamTricode: 'LAL',
        personId: 1630559,
        playerName: 'Austin Reaves',
        playerNameI: 'A. Reaves',
        actionType: 'shot',
        subType: '3PT Jump Shot',
        shotResult: 'Made',
        x: 25,
        y: 80,
        description: 'A. Reaves 3PT Made (24 PTS)'
    },
    {
        actionNumber: 453,
        clock: '2:30',
        period: 4,
        teamId: 1610612742,
        teamTricode: 'DAL',
        personId: 0,
        playerName: '',
        playerNameI: '',
        actionType: 'timeout',
        x: 0,
        y: 0,
        description: 'Dallas Timeout'
    }
];
