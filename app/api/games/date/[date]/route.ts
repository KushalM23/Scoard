import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

const STATS_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://stats.nba.com/',
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    const { date } = await params;

    try {
        // Try CDN first for today's games
        try {
            const cdnResponse = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
            if (cdnResponse.data.scoreboard.gameDate === date) {
                const hasLive = cdnResponse.data.scoreboard.games.some((g: any) => g.gameStatus === 2);
                const allFinished = cdnResponse.data.scoreboard.games.every((g: any) => g.gameStatus === 3);
                const cacheTime = allFinished ? 86400 : hasLive ? 5 : 1800;
                
                return NextResponse.json(cdnResponse.data, {
                    headers: {
                        'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`
                    }
                });
           }
        } catch (e) {
            console.log('CDN fetch failed, falling back to schedule');
        }

        const scheduleResponse = await axios.get('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json');

        let standingsMap: Record<string, { wins: number, losses: number }> = {};
        
        try {
            const standingsResponse = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {
                headers: STATS_HEADERS,
                params: {
                    'LeagueID': '00',
                    'Season': '2025-26',
                    'SeasonType': 'Regular Season'
                },
                timeout: 10000
            });

            if (standingsResponse.data.resultSets && standingsResponse.data.resultSets.length > 0) {
                const resultSet = standingsResponse.data.resultSets[0];
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

        const gameDates = scheduleResponse.data.leagueSchedule.gameDates;
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
                const boxResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${game.gameId}.json`, {
                    timeout: 3000
                });
                const boxData = boxResponse.data.game;
                
                game.homeTeam.score = boxData.homeTeam.score;
                game.awayTeam.score = boxData.awayTeam.score;
                game.gameStatus = boxData.gameStatus;
                game.gameStatusText = boxData.gameStatusText;
                
                if (boxData.period) game.period = boxData.period;
                if (boxData.gameClock) game.gameClock = boxData.gameClock;
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
