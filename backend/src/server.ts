import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory cache
const cache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5000; // 5 seconds

// Helper to get cached data
const getCachedData = (key: string) => {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
};

// Helper to set cached data
const setCachedData = (key: string, data: any) => {
    cache[key] = { data, timestamp: Date.now() };
};

// NBA Stats API Headers
const STATS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
    'Accept-Language': 'en-US,en;q=0.9',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true'
};

// Routes
// Fetch live games from CDN
app.get('/api/games/live', async (req, res) => {
    const cacheKey = 'live_games';
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
        setCachedData(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching live games:', error);
        res.status(500).json({ error: 'Failed to fetch live games' });
    }
});

app.get('/api/games/:gameId', async (req, res) => {
    const { gameId } = req.params;

    try {
        // 1. Try CDN (Best for Live/Finished games)
        try {
            const cdnResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
            const data = cdnResponse.data.game;
            
            const mappedData = {
                gameId: data.gameId,
                gameStatus: data.gameStatus,
                gameStatusText: data.gameStatusText,
                period: data.period,
                clock: data.gameClock,
                homeTeam: {
                    teamId: data.homeTeam.teamId,
                    teamName: data.homeTeam.teamName,
                    teamCity: data.homeTeam.teamCity,
                    teamTricode: data.homeTeam.teamTricode,
                    score: data.homeTeam.score,
                    wins: 0,
                    losses: 0,
                    periods: data.homeTeam.periods.map((p: any) => p.score),
                    statistics: data.homeTeam.statistics,
                    inBonus: false, // Default, as CDN might not have it directly in this structure
                    timeoutsRemaining: 0
                },
                awayTeam: {
                    teamId: data.awayTeam.teamId,
                    teamName: data.awayTeam.teamName,
                    teamCity: data.awayTeam.teamCity,
                    teamTricode: data.awayTeam.teamTricode,
                    score: data.awayTeam.score,
                    wins: 0,
                    losses: 0,
                    periods: data.awayTeam.periods.map((p: any) => p.score),
                    statistics: data.awayTeam.statistics,
                    inBonus: false,
                    timeoutsRemaining: 0
                },
                players: [
                    ...data.homeTeam.players.map((p: any) => ({ ...p, teamId: data.homeTeam.teamId })),
                    ...data.awayTeam.players.map((p: any) => ({ ...p, teamId: data.awayTeam.teamId }))
                ]
            };
            return res.json(mappedData);
        } catch (e) {
            console.log(`CDN fetch failed for ${gameId}, trying Stats API...`);
        }

        // 2. Fallback: BoxscoreSummaryV2 (Reliable for Scheduled Games)
        // We skip boxscoretraditionalv2 for scheduled games as it often fails or returns empty
        const summaryResponse = await axios.get('https://stats.nba.com/stats/boxscoresummaryv2', {
            params: { GameID: gameId },
            headers: STATS_HEADERS
        });

        const summarySets = summaryResponse.data.resultSets;
        const gameSummary = summarySets[0].rowSet[0];
        const lineScore = summarySets[5].rowSet;

        if (!gameSummary) throw new Error('Game not found');

        const getValue = (row: any[], headers: string[], key: string) => {
            const index = headers.indexOf(key);
            return row[index];
        };
        
        const summaryHeaders = summarySets[0].headers;
        const lineScoreHeaders = summarySets[5].headers;

        const homeTeamId = getValue(gameSummary, summaryHeaders, 'HOME_TEAM_ID');
        const awayTeamId = getValue(gameSummary, summaryHeaders, 'VISITOR_TEAM_ID');

        const homeLineScore = lineScore.find((row: any[]) => getValue(row, lineScoreHeaders, 'TEAM_ID') === homeTeamId);
        const awayLineScore = lineScore.find((row: any[]) => getValue(row, lineScoreHeaders, 'TEAM_ID') === awayTeamId);

        // Fetch Rosters for Scheduled Games to populate "players" for Injury Report
        let allPlayers: any[] = [];
        const gameStatus = getValue(gameSummary, summaryHeaders, 'GAME_STATUS_ID');

        if (gameStatus === 1) {
             try {
                const [homeRosterRes, awayRosterRes] = await Promise.all([
                    axios.get('https://stats.nba.com/stats/commonteamroster', {
                        params: { TeamID: homeTeamId, Season: '2025-26' },
                        headers: STATS_HEADERS
                    }),
                    axios.get('https://stats.nba.com/stats/commonteamroster', {
                        params: { TeamID: awayTeamId, Season: '2025-26' },
                        headers: STATS_HEADERS
                    })
                ]);

                const mapRosterPlayer = (p: any[], headers: string[], teamId: number) => ({
                    personId: getValue(p, headers, 'PLAYER_ID'),
                    firstName: getValue(p, headers, 'PLAYER').split(' ')[0],
                    lastName: getValue(p, headers, 'PLAYER').split(' ').slice(1).join(' '),
                    jersey: getValue(p, headers, 'NUM'),
                    position: getValue(p, headers, 'POSITION'),
                    teamId: teamId,
                    status: getValue(p, headers, 'STATUS'), // ACTIVE or INACTIVE
                    points: 0, assists: 0, rebounds: 0, minutes: "0",
                    fg: '0-0', threePt: '0-0', ft: '0-0',
                    fgPercentage: 0, threePtPercentage: 0, ftPercentage: 0,
                    steals: 0, blocks: 0, turnovers: 0, plusMinus: 0,
                    reboundsOffensive: 0, reboundsDefensive: 0, fouls: 0,
                    isOnCourt: false
                });

                const homeHeaders = homeRosterRes.data.resultSets[0].headers;
                const awayHeaders = awayRosterRes.data.resultSets[0].headers;

                allPlayers = [
                    ...homeRosterRes.data.resultSets[0].rowSet.map((p: any) => mapRosterPlayer(p, homeHeaders, homeTeamId)),
                    ...awayRosterRes.data.resultSets[0].rowSet.map((p: any) => mapRosterPlayer(p, awayHeaders, awayTeamId))
                ];
             } catch (e) {
                 console.log('Roster fetch failed', e);
             }
        }

        const mappedData = {
            gameId: getValue(gameSummary, summaryHeaders, 'GAME_ID'),
            gameStatus: gameStatus,
            gameStatusText: getValue(gameSummary, summaryHeaders, 'GAME_STATUS_TEXT'),
            period: getValue(gameSummary, summaryHeaders, 'LIVE_PERIOD'),
            clock: getValue(gameSummary, summaryHeaders, 'LIVE_PC_TIME'),
            homeTeam: {
                teamId: homeTeamId,
                teamName: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_NAME') : 'Home',
                teamCity: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_CITY_NAME') : '',
                teamTricode: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_ABBREVIATION') : 'HOM',
                score: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'PTS') : 0,
                wins: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES').split('-')[0] : 0,
                losses: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES').split('-')[1] : 0,
                periods: [],
                statistics: null,
                inBonus: false,
                timeoutsRemaining: 0
            },
            awayTeam: {
                teamId: awayTeamId,
                teamName: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_NAME') : 'Away',
                teamCity: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_CITY_NAME') : '',
                teamTricode: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_ABBREVIATION') : 'AWY',
                score: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'PTS') : 0,
                wins: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES').split('-')[0] : 0,
                losses: awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES').split('-')[1] : 0,
                periods: [],
                statistics: null,
                inBonus: false,
                timeoutsRemaining: 0
            },
            players: allPlayers
        };

        res.json(mappedData);

    } catch (error) {
        console.error('Error fetching game data:', error);
        res.status(500).json({ error: 'Failed to fetch game data' });
    }
});

app.get('/api/games/:gameId/pbp', async (req, res) => {
    const { gameId } = req.params;
    const cacheKey = `pbp_${gameId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`);
        setCachedData(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.log(`PBP fetch failed for ${gameId} (likely scheduled), returning empty.`);
        // Return empty PBP structure for scheduled games instead of error
        res.json({
            game: {
                actions: []
            }
        });
    }
});

app.get('/api/games/date/:date', async (req, res) => {
    const { date } = req.params; // YYYY-MM-DD
    const cacheKey = `games_${date}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Try CDN first for today's games
        try {
            const cdnResponse = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
            // Check if specific date matches
            if (cdnResponse.data.scoreboard.gameDate === date) {
                console.log(`Using CDN for date ${date}`);
                setCachedData(cacheKey, cdnResponse.data);
                return res.json(cdnResponse.data);
            }
        } catch (e) {
            console.log('CDN fetch failed or mismatch, falling back to stats API');
        }

        // Fallback to full season schedule from CDN
        // Note: This provides schedule data but NOT live scores for past/future dates
        console.log(`Fetching schedule from CDN for date ${date}`);
        const scheduleResponse = await axios.get('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json');
        
        // Fetch standings to populate wins/losses
        let standingsMap: Record<string, { wins: number, losses: number }> = {};
        try {
             // Check cache for standings first
             const standingsCacheKey = 'standings_internal';
             let standingsData = getCachedData(standingsCacheKey);
             
             if (!standingsData) {
                 const season = '2025-26'; 
                 const standingsResponse = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {
                    headers: STATS_HEADERS,
                    params: {
                        'LeagueID': '00',
                        'Season': season,
                        'SeasonType': 'Regular Season'
                    }
                });
                standingsData = standingsResponse.data;
                setCachedData(standingsCacheKey, standingsData);
             }

             if (standingsData && standingsData.resultSets && standingsData.resultSets.length > 0) {
                 const resultSet = standingsData.resultSets[0];
                 const headers = resultSet.headers;
                 const rowSet = resultSet.rowSet;
                 const teamIdIdx = headers.indexOf('TeamID');
                 const winsIdx = headers.indexOf('WINS');
                 const lossesIdx = headers.indexOf('LOSSES');

                 rowSet.forEach((row: any[]) => {
                     const teamId = row[teamIdIdx];
                     standingsMap[teamId] = {
                         wins: row[winsIdx],
                         losses: row[lossesIdx]
                     };
                 });
             }
        } catch (e) {
            console.error('Failed to fetch standings for schedule enrichment', e);
        }

        // Convert YYYY-MM-DD to MM/DD/YYYY format
        const [year, month, day] = date.split('-');
        const targetDateString = `${month}/${day}/${year}`;

        const gameDates = scheduleResponse.data.leagueSchedule.gameDates;
        const dayData = gameDates.find((d: any) => d.gameDate.startsWith(targetDateString));

        if (!dayData) {
            return res.json({ scoreboard: { games: [] } });
        }

        const games = dayData.games.map((g: any) => {
            const homeRecord = standingsMap[g.homeTeam.teamId] || { wins: 0, losses: 0 };
            const awayRecord = standingsMap[g.awayTeam.teamId] || { wins: 0, losses: 0 };
            
            return {
                gameId: g.gameId,
                gameStatus: 1, // Default to scheduled/pre-game
                gameStatusText: g.gameStatusText,
                gameEt: g.gameDateTimeEst,
                homeTeam: {
                    teamId: g.homeTeam.teamId,
                    teamTricode: g.homeTeam.teamTricode,
                    score: 0,
                    wins: homeRecord.wins,
                    losses: homeRecord.losses
                },
                awayTeam: {
                    teamId: g.awayTeam.teamId,
                    teamTricode: g.awayTeam.teamTricode,
                    score: 0,
                    wins: awayRecord.wins,
                    losses: awayRecord.losses
                }
            };
        });

        // [SC-Workaround] Fetch scores for each game individually
        // Since the schedule endpoint doesn't have scores, we fetch the boxscore for each game ID.
        // This is slower (N requests) but reliable via CDN.
        await Promise.all(games.map(async (game: any) => {
            try {
                const boxResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${game.gameId}.json`);
                const boxData = boxResponse.data.game;
                
                game.homeTeam.score = boxData.homeTeam.score;
                game.awayTeam.score = boxData.awayTeam.score;
                game.gameStatus = boxData.gameStatus; // 2=Live, 3=Final
                game.gameStatusText = boxData.gameStatusText;
                
                // Update clock info if available
                if (boxData.period) game.period = boxData.period;
                if (boxData.gameClock) game.gameClock = boxData.gameClock;
            } catch (e) {
                // If boxscore fails (e.g. game hasn't started yet or file doesn't exist), 
                // we just keep the default 0-0 score from the schedule.
            }
        }));

        const formattedResponse = {
            scoreboard: {
                gameDate: date,
                games: games
            }
        };
        
        setCachedData(cacheKey, formattedResponse);
        res.json(formattedResponse);
    } catch (error: any) {
        console.error(`Error fetching games for date ${date}:`, error);
        res.status(500).json({
            error: 'Failed to fetch games for date',
            details: error.message,
            responseKeys: error.response?.data ? Object.keys(error.response.data) : 'No response data'
        });
    }
});

app.get('/api/standings', async (req, res) => {
    const cacheKey = 'standings_full';
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const season = '2025-26';
        const response = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {
            headers: STATS_HEADERS,
            params: {
                'LeagueID': '00',
                'Season': season,
                'SeasonType': 'Regular Season'
            }
        });

        const resultSet = response.data.resultSets[0];
        const headers = resultSet.headers;
        const rowSet = resultSet.rowSet;

        const getValue = (row: any[], key: string) => row[headers.indexOf(key)];

        const standings = rowSet.map((row: any[]) => ({
            teamId: getValue(row, 'TeamID'),
            teamCity: getValue(row, 'TeamCity'),
            teamName: getValue(row, 'TeamName'),
            conference: getValue(row, 'Conference'),
            division: getValue(row, 'Division'),
            wins: getValue(row, 'WINS'),
            losses: getValue(row, 'LOSSES'),
            winPct: getValue(row, 'WinPCT'),
            homeRecord: getValue(row, 'HOME'),
            roadRecord: getValue(row, 'ROAD'),
            l10: getValue(row, 'L10'),
            streak: getValue(row, 'strCurrentStreak'),
            pointsPg: getValue(row, 'PointsPG'),
            oppPointsPg: getValue(row, 'OppPointsPG'),
            diffPointsPg: getValue(row, 'DiffPointsPG'),
            conferenceRank: getValue(row, 'PlayoffRank'),
            divisionRank: getValue(row, 'DivisionRank')
        }));

        console.log(`Fetched ${standings.length} standings records`);
        setCachedData(cacheKey, standings);
        res.json(standings);
    } catch (error) {
        console.error('Error fetching standings:', error);
        res.status(500).json({ error: 'Failed to fetch standings' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
