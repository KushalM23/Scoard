import axios from 'axios';
import { NextResponse } from 'next/server';

// Force dynamic rendering - don't try to build this at build time
export const dynamic = 'force-dynamic';

const PROXY_URL = process.env.STATS_PROXY_URL || 'http://localhost:3001';

export async function GET() {
    try {
        const season = '2025-26';
        const response = await axios.get(`${PROXY_URL}/api/standings`, {
            params: {
                Season: season
            },
            timeout: 35000
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
            diffPointsPg: getValue(row, 'DiffPointsPg'),
            conferenceRank: getValue(row, 'PlayoffRank'),
            divisionRank: getValue(row, 'DivisionRank')
        }));

        return NextResponse.json(standings, {
            headers: {
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        console.error('Error fetching standings:', error);
        return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 });
    }
}
