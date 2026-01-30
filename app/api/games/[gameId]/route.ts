import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to prevent build-time Stats API calls
export const dynamic = 'force-dynamic';

const PROXY_URL = process.env.STATS_PROXY_URL || 'http://localhost:3001';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const bustCache = request.nextUrl.searchParams.get('bustCache') === 'true';

    try {
        // 1. Try CDN (Best for Live/Finished games)
        try {
            const cdnResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
            const data = cdnResponse.data.game;
            
            const gameEt = data.gameTimeUTC || data.gameEt || data.gameDate || data.gameDateTimeUTC;
            
            const mappedData = {
                gameId: data.gameId,
                gameEt: gameEt,
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
                    wins: data.homeTeam.wins || 0,
                    losses: data.homeTeam.losses || 0,
                    periods: data.homeTeam.periods.map((p: any) => p.score),
                    statistics: data.homeTeam.statistics,
                    inBonus: false,
                    timeoutsRemaining: 0
                },
                awayTeam: {
                    teamId: data.awayTeam.teamId,
                    teamName: data.awayTeam.teamName,
                    teamCity: data.awayTeam.teamCity,
                    teamTricode: data.awayTeam.teamTricode,
                    score: data.awayTeam.score,
                    wins: data.awayTeam.wins || 0,
                    losses: data.awayTeam.losses || 0,
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
            const cacheTime = data.gameStatus === 3 ? 86400 : data.gameStatus === 1 ? 1800 : 5;
            return NextResponse.json(mappedData, {
                 headers: { 'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}` }
            });
        } catch (e) {
            console.log(`CDN fetch failed for ${gameId}, trying Stats API...`);
        }

        // 2. Fallback: BoxscoreSummaryV2 (Reliable for Scheduled Games)
        const summaryResponse = await axios.get(`${PROXY_URL}/api/boxscore/${gameId}`, {
            params: { bustCache },
            timeout: 35000
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

        let allPlayers: any[] = [];
        let previousMatchups: any[] = [];
        let winProbability: any = null;
        let homeRecord = { wins: 0, losses: 0 };
        let awayRecord = { wins: 0, losses: 0 };
        const gameStatus = getValue(gameSummary, summaryHeaders, 'GAME_STATUS_ID');

        if (gameStatus === 1) {
             try {
                const results = await Promise.allSettled([
                    axios.get(`${PROXY_URL}/api/roster/${homeTeamId}`, {
                        params: { Season: '2025-26', bustCache },
                        timeout: 35000
                    }),
                    axios.get(`${PROXY_URL}/api/roster/${awayTeamId}`, {
                        params: { Season: '2025-26', bustCache },
                        timeout: 35000
                    }),
                    axios.get(`${PROXY_URL}/api/gamelog/${homeTeamId}`, {
                        params: { Season: '2025-26', bustCache },
                        timeout: 35000
                    }),
                    axios.get(`${PROXY_URL}/api/standings`, {
                        params: { Season: '2025-26', bustCache },
                        timeout: 35000
                    })
                ]);

                const homeRosterRes = results[0].status === 'fulfilled' ? results[0].value : null;
                const awayRosterRes = results[1].status === 'fulfilled' ? results[1].value : null;
                const homeLogRes = results[2].status === 'fulfilled' ? results[2].value : null;
                const standingsRes = results[3].status === 'fulfilled' ? results[3].value : null;

                const mapRosterPlayer = (p: any[], headers: string[], teamId: number) => ({
                    personId: getValue(p, headers, 'PLAYER_ID'),
                    firstName: getValue(p, headers, 'PLAYER').split(' ')[0],
                    lastName: getValue(p, headers, 'PLAYER').split(' ').slice(1).join(' '),
                    jersey: getValue(p, headers, 'NUM'),
                    position: getValue(p, headers, 'POSITION'),
                    teamId: teamId,
                    status: getValue(p, headers, 'STATUS'),
                    points: 0, assists: 0, rebounds: 0, minutes: "0",
                    fg: '0-0', threePt: '0-0', ft: '0-0',
                    fgPercentage: 0, threePtPercentage: 0, ftPercentage: 0,
                    steals: 0, blocks: 0, turnovers: 0, plusMinus: 0,
                    reboundsOffensive: 0, reboundsDefensive: 0, fouls: 0,
                    isOnCourt: false
                });

                if (homeRosterRes) {
                    const homeHeaders = homeRosterRes.data.resultSets[0].headers;
                    allPlayers.push(...homeRosterRes.data.resultSets[0].rowSet.map((p: any) => mapRosterPlayer(p, homeHeaders, homeTeamId)));
                }
                if (awayRosterRes) {
                    const awayHeaders = awayRosterRes.data.resultSets[0].headers;
                    allPlayers.push(...awayRosterRes.data.resultSets[0].rowSet.map((p: any) => mapRosterPlayer(p, awayHeaders, awayTeamId)));
                }

                if (homeLogRes) {
                    const logHeaders = homeLogRes.data.resultSets[0].headers;
                    const logRows = homeLogRes.data.resultSets[0].rowSet;
                    const awayTricode = awayLineScore ? getValue(awayLineScore, lineScoreHeaders, 'TEAM_ABBREVIATION') : 'SAC';

                    previousMatchups = logRows
                        .filter((row: any[]) => getValue(row, logHeaders, 'MATCHUP').includes(awayTricode))
                        .map((row: any[]) => ({
                            gameId: getValue(row, logHeaders, 'Game_ID'),
                            gameDate: getValue(row, logHeaders, 'GAME_DATE'),
                            matchup: getValue(row, logHeaders, 'MATCHUP'),
                            wl: getValue(row, logHeaders, 'WL'),
                            pts: getValue(row, logHeaders, 'PTS'),
                            plusMinus: getValue(row, logHeaders, 'Plus_Minus')
                        }));
                }

                if (standingsRes) {
                    const standingsHeaders = standingsRes.data.resultSets[0].headers;
                    const standingsRows = standingsRes.data.resultSets[0].rowSet;
                    
                    const homeRow = standingsRows.find((row: any[]) => getValue(row, standingsHeaders, 'TeamID') === homeTeamId);
                    const awayRow = standingsRows.find((row: any[]) => getValue(row, standingsHeaders, 'TeamID') === awayTeamId);

                    if (homeRow && awayRow) {
                        const homeWinPct = getValue(homeRow, standingsHeaders, 'WinPCT');
                        const awayWinPct = getValue(awayRow, standingsHeaders, 'WinPCT');
                        
                        homeRecord = {
                            wins: getValue(homeRow, standingsHeaders, 'WINS'),
                            losses: getValue(homeRow, standingsHeaders, 'LOSSES')
                        };
                        awayRecord = {
                            wins: getValue(awayRow, standingsHeaders, 'WINS'),
                            losses: getValue(awayRow, standingsHeaders, 'LOSSES')
                        };

                        const homeWinProb = (homeWinPct * (1 - awayWinPct)) / ((homeWinPct * (1 - awayWinPct)) + ((1 - homeWinPct) * awayWinPct));
                    
                    winProbability = {
                        homeWinPct,
                        awayWinPct,
                        homeWinProb: homeWinProb * 100,
                        awayWinProb: (1 - homeWinProb) * 100
                    };
                }
                }

             } catch (e) {
                 console.log('Scheduled game details fetch failed', e);
             }
        }

        const mappedData = {
            gameId: getValue(gameSummary, summaryHeaders, 'GAME_ID'),
            gameEt: getValue(gameSummary, summaryHeaders, 'GAME_DATE_EST'),
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
                wins: gameStatus === 1 ? homeRecord.wins : (homeLineScore ? (getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[0] : 0),
                losses: gameStatus === 1 ? homeRecord.losses : (homeLineScore ? (getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[1] : 0),
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
                wins: gameStatus === 1 ? awayRecord.wins : (awayLineScore ? (getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[0] : 0),
                losses: gameStatus === 1 ? awayRecord.losses : (awayLineScore ? (getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[1] : 0),
                periods: [],
                statistics: null,
                inBonus: false,
                timeoutsRemaining: 0
            },
            players: allPlayers,
            previousMatchups,
            winProbability
        };

        const cacheTime = gameStatus === 3 ? 86400 : gameStatus === 1 ? 1800 : 5;
        return NextResponse.json(mappedData, {
            headers: { 'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}` }
        });

    } catch (error: any) {
        console.error('Error fetching game data:', error.message);
        return NextResponse.json({ error: 'Failed to fetch game data' }, { status: 500 });
    }
}
