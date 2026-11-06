import { NextRequest, NextResponse } from 'next/server';
import { fetchGamePlayByPlay } from '@/lib/gamePlayByPlaySource';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;

    try {
        const actions = await fetchGamePlayByPlay(gameId);
        return NextResponse.json({ game: { gameId, actions } }, {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error(`PBP fetch failed for ${gameId}:`, error);
        return NextResponse.json({
            error: 'Play-by-play is temporarily unavailable.',
            game: {
                actions: []
            }
        }, {
            status: 502,
            headers: { 'Cache-Control': 'no-store' },
        });
    }
}
