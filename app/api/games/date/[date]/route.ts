import { NextRequest, NextResponse } from 'next/server';
import { fetchStatsApi } from '@/app/lib/statsApi';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    const { date } = await params;

    try {
        // Try CDN first for today's games
        try {
            const cdnResponse = await fetch('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', {
                next: { revalidate: 5 }
            });
            
            if (cdnResponse.ok) {
                const cdnData = await cdnResponse.json();
                if (cdnData.scoreboard.gameDate === date) {
                    const hasLive = cdnData.scoreboard.games.some((g: any) => g.gameStatus === 2);
                    const allFinished = cdnData.scoreboard.games.every((g: any) => g.gameStatus === 3);
                    const cacheTime = allFinished ? 86400 : hasLive ? 5 : 1800;
                    
                    return NextResponse.json(cdnData, {
                        headers: {
                            'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`
                        }
                    });
                }
            }
        } catch (e) {
            console.log('CDN fetch failed, falling back to schedule');
        }

        const scheduleResponse = await fetch('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json', {
            next: { revalidate: 3600 } // Cache full schedule for 1 hour
        });
        
        if (!scheduleResponse.ok) {
            throw new Error('Failed to fetch schedule');
        }
        
        const scheduleData = await scheduleResponse.json();

        let standingsMap: Record<string, { wins: number, losses: number }> = {};
        
        try {
            const standingsData = await fetchStatsApi('leaguestandingsv3', {
                LeagueID: '00',
                Season: '2025-26',
                SeasonType: 'Regular Season'
            });

            if (standingsData.resultSets && standingsData.resultSets.length > 0) {
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
            console.log('Standings fetch failed, continuing without records');
        }

        const [year, month, day] = date.split('-');
        const targetDateString = `${month}/${day}/${year}`;

        const gameDates = scheduleData.leagueSchedule.gameDates;
        const dayData = gameDates.find((d: any) => d.gameDate.startsWith(targetDateString));

        if (!dayData) {
            return NextResponse.json({ scoreboard: { games: [] } });
        }

        const games = dayData.games.map((g: any) => {
            const homeRecord = standingsMap[g.homeTeam.teamId] || { wins: 0, losses: 0 };
            const awayRecord = standingsMap[g.awayTeam.teamId] || { wins: 0, losses: 0 };
            
            return {
                gameId: g.gameId,
                gameStatus: 1,
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

        await Promise.all(games.map(async (game: any) => {
            try {
                const boxResponse = await fetch(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${game.gameId}.json`, {
                    next: { revalidate: 5 }, // 5 seconds for live updates
                    signal: AbortSignal.timeout(3000)
                });
                
                if (boxResponse.ok) {
                    const boxData = await boxResponse.json();
                    const gameData = boxData.game;
                    
                    game.homeTeam.score = gameData.homeTeam.score;
                    game.awayTeam.score = gameData.awayTeam.score;
                    game.gameStatus = gameData.gameStatus;
                    game.gameStatusText = gameData.gameStatusText;
                    
                    if (gameData.period) game.period = gameData.period;
                    if (gameData.gameClock) game.gameClock = gameData.gameClock;
                }
            } catch (e) {
                // Keep default values
            }
        }));

        const formattedResponse = {
            scoreboard: {
                gameDate: date,
                games: games
            }
        };
        
        const hasLive = games.some((g: any) => g.gameStatus === 2);
        const allFinished = games.every((g: any) => g.gameStatus === 3);
        const cacheTime = allFinished ? 86400 : hasLive ? 5 : 1800;
        
        return NextResponse.json(formattedResponse, {
            headers: {
                'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`
            }
        });
    } catch (error: any) {
        console.error(`Error fetching games for date ${date}:`, error.message);
        return NextResponse.json({
            error: 'Failed to fetch games for date',
            details: error.message
        }, { status: 500 });
    }
}
