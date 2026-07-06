import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { fetchStatsApi, CDN_HEADERS } from '@/app/lib/statsApi';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function getSummaryValue(resultSet: any, row: any[], key: string) {
    const index = resultSet?.headers?.indexOf(key);
    return typeof index === 'number' && index >= 0 ? row[index] : null;
}

async function isScheduledGame(gameId: string): Promise<boolean> {
    try {
        const summaryData = await fetchStatsApi(
            'boxscoresummaryv2',
            { GameID: gameId },
            2,
            30,
        );
        const gameSummarySet = summaryData?.resultSets?.[0];
        const gameSummaryRow = gameSummarySet?.rowSet?.[0];

        if (!gameSummarySet || !gameSummaryRow) {
            return false;
        }

        const gameStatus = Number(
            getSummaryValue(gameSummarySet, gameSummaryRow, 'GAME_STATUS_ID'),
        );
        return gameStatus <= 1;
    } catch {
        return false;
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;

    try {
        if (await isScheduledGame(gameId)) {
            return NextResponse.json({
                game: {
                    actions: []
                }
            });
        }

        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, {
            headers: CDN_HEADERS
        });
        return NextResponse.json(response.data);
    } catch (error) {
        console.log(`PBP fetch failed for ${gameId}, returning empty.`);
        return NextResponse.json({
            game: {
                actions: []
            }
        });
    }
}
