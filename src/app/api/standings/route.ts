import { NextRequest, NextResponse } from 'next/server';
import { fetchStatsApi, CDN_HEADERS } from '@/lib/statsApi';
import { parseSeason, CURRENT_SEASON } from '@/lib/teams';

// Force dynamic rendering - don't try to build this at build time
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const seasonInput = searchParams.get('season');
        const season = parseSeason(seasonInput);
        const isCurrentSeason = season === CURRENT_SEASON;
        
        // Dynamic cache: 5 minutes if live games, 2 hours if no live games, 7 days if historical season
        let cacheTime = 7200;
        
        if (isCurrentSeason) {
            // Check if any games are currently live
            let hasLiveGames = false;
            try {
                const cdnResponse = await fetch('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', {
                    headers: CDN_HEADERS
                });
                if (cdnResponse.ok) {
                    const scoreboardData = await cdnResponse.json();
                    hasLiveGames = scoreboardData.scoreboard.games.some((g: any) => g.gameStatus === 2);
                }
            } catch (e) {
                console.log('Failed to check live games, defaulting to 5 min cache');
            }
            cacheTime = hasLiveGames ? 300 : 7200;
            console.log(`Standings cache: ${hasLiveGames ? 'Live games detected' : 'No live games'} - using ${cacheTime}s cache`);
        } else {
            cacheTime = 86400 * 7; // 7 days cache for historical seasons
            console.log(`Standings cache: Historical season ${season} - using ${cacheTime}s cache`);
        }
        
        const data = await fetchStatsApi('leaguestandingsv3', {
            LeagueID: '00',
            Season: season,
            SeasonType: 'Regular Season'
        }, 3, cacheTime);

        const resultSet = data.resultSets[0];
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
            divisionRank: getValue(row, 'DivisionRank'),
            divgamesback: getValue(row, 'DivisionGamesBack'),
            leagueGamesBack: getValue(row, 'LeagueGamesBack'),
            conferenceGamesBack: getValue(row, 'ConferenceGamesBack')
        }));

        return NextResponse.json(standings, {
            headers: {
                'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`
            }
        });
    } catch (error) {
        console.error('Error fetching standings:', error);
        return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
    }
}
