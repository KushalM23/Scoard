export const dynamic = 'force-dynamic';

const STATS_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://stats.nba.com/',
};

export async function GET() {
    const startTime = Date.now();
    
    try {
        const response = await fetch('https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular%20Season', {
            headers: STATS_HEADERS,
            cache: 'no-store',
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });
        
        const duration = Date.now() - startTime;
        const data = await response.text();
        
        return Response.json({
            ok: true,
            status: response.status,
            statusText: response.statusText,
            duration: `${duration}ms`,
            headers: Object.fromEntries(response.headers),
            dataLength: data.length,
            dataSample: data.substring(0, 200)
        });
    } catch (e: any) {
        const duration = Date.now() - startTime;
        return Response.json({
            ok: false,
            error: e.message,
            errorName: e.name,
            duration: `${duration}ms`,
            stack: e.stack
        }, { status: 500 });
    }
}
