import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';

// Cache play-by-play for 5 seconds
export const revalidate = 5;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;

    try {
        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`);
        return NextResponse.json(response.data);
    } catch (error) {
        console.log(`PBP fetch failed for ${gameId} (likely scheduled), returning empty.`);
        return NextResponse.json({
            game: {
                actions: []
            }
        });
    }
}
