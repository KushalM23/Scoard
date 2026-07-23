import axios from 'axios';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { fetchStatsApi, CDN_HEADERS } from '@/lib/statsApi';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StreamController = ReadableStreamDefaultController<Uint8Array>;

// Map<gameId, Set<StreamController>>
const gameClients = new Map<string, Set<StreamController>>();

// Map<gameId, { timer: NodeJS.Timeout, lastData: any, lastHash: string, currentDelay: number }>
const activePollers = new Map<string, { 
    timer: NodeJS.Timeout; 
    lastData: any;
    lastHash: string;
    currentDelay: number;
}>();

// Hash data to detect changes
function hashData(data: any): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

function computeDelay(data: any): number {
    const DEFAULT_DELAY = 5000;   // 5s
    const SCHEDULED_DELAY = 30000; // 30s before tipoff
    const TIMEOUT_DELAY = 30000;  // 30s during timeouts
    const BREAK_DELAY = 45000;    // 45s for period breaks
    const HALFTIME_DELAY = 120000; // 2 minutes for halftime

    if (Number(data?.gameStatus ?? 0) <= 1) {
        return SCHEDULED_DELAY;
    }

    const actions = Array.isArray(data?.pbpActions) ? data.pbpActions : [];
    const last = actions[actions.length - 1];
    if (!last) return DEFAULT_DELAY;

    const actionType = (last.actionType || '').toLowerCase();
    const subType = (last.subType || '').toLowerCase();

    if (actionType === 'timeout') return TIMEOUT_DELAY;
    if (actionType === 'period') {
        if (subType.includes('half')) return HALFTIME_DELAY;
        if (subType === 'end') return BREAK_DELAY;
    }

    return DEFAULT_DELAY;
}

async function fetchPbpData(gameId: string): Promise<any[]> {
    try {
        const pbpResp = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, {
            headers: CDN_HEADERS
        });
        return pbpResp.data?.game?.actions || [];
    } catch (error) {
        console.log(`PBP fetch failed for ${gameId}, returning empty actions.`);
        return [];
    }
}

function shouldFetchPbp(gameStatus: unknown): boolean {
    return Number(gameStatus ?? 0) > 1;
}

// Broadcast data to all clients watching a specific game
function broadcast(gameId: string, data: any) {
    const clients = gameClients.get(gameId);
    if (!clients || clients.size === 0) return;
    
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoded = encoder.encode(message);
    
    const deadClients: StreamController[] = [];
    clients.forEach(controller => {
        try {
            controller.enqueue(encoded);
        } catch (error) {
            console.error('Failed to send to client:', error);
            deadClients.push(controller);
        }
    });
    
    // Remove dead clients
    deadClients.forEach(controller => clients.delete(controller));
}

// Fetch game data (reused logic from route.ts)
async function fetchGameData(gameId: string): Promise<any> {
    try {
        // 1. Try CDN first
        try {
            const cdnResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`, {
                headers: CDN_HEADERS
            });
            const data = cdnResponse.data.game;
            
            const gameEt = data.gameTimeUTC || data.gameEt || data.gameDate || data.gameDateTimeUTC;
            
            const pbpActions = shouldFetchPbp(data.gameStatus)
                ? await fetchPbpData(gameId)
                : [];

            return {
                gameId: data.gameId,
                gameEt: gameEt,
                gameStatus: data.gameStatus,
                gameStatusText: data.gameStatusText,
                period: data.period,
                clock: data.gameClock,
                pbpActions,
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
        } catch (e) {
            console.log(`CDN fetch failed for ${gameId}, trying Stats API...`);
        }

        // 2. Fallback to Stats API
        const summaryData = await fetchStatsApi(
            'boxscoresummaryv2',
            { GameID: gameId },
            3,
            5,
        );

        const summarySets = summaryData.resultSets;
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

        const gameStatus = getValue(gameSummary, summaryHeaders, 'GAME_STATUS_ID');

        const pbpActions = shouldFetchPbp(gameStatus)
            ? await fetchPbpData(gameId)
            : [];

        return {
            gameId: getValue(gameSummary, summaryHeaders, 'GAME_ID'),
            gameEt: getValue(gameSummary, summaryHeaders, 'GAME_DATE_EST'),
            gameStatus: gameStatus,
            gameStatusText: getValue(gameSummary, summaryHeaders, 'GAME_STATUS_TEXT'),
            period: getValue(gameSummary, summaryHeaders, 'LIVE_PERIOD'),
            clock: getValue(gameSummary, summaryHeaders, 'LIVE_PC_TIME'),
            pbpActions,
            homeTeam: {
                teamId: homeTeamId,
                teamName: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_NAME') : 'Home',
                teamCity: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_CITY_NAME') : '',
                teamTricode: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'TEAM_ABBREVIATION') : 'HOM',
                score: homeLineScore ? getValue(homeLineScore, lineScoreHeaders, 'PTS') : 0,
                wins: homeLineScore ? (getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[0] : 0,
                losses: homeLineScore ? (getValue(homeLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[1] : 0,
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
                wins: awayLineScore ? (getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[0] : 0,
                losses: awayLineScore ? (getValue(awayLineScore, lineScoreHeaders, 'TEAM_WINS_LOSSES') || '0-0').split('-')[1] : 0,
                periods: [],
                statistics: null,
                inBonus: false,
                timeoutsRemaining: 0
            },
            players: []
        };
    } catch (error: any) {
        console.error(`Error fetching game ${gameId}:`, error.message);
        throw error;
    }
}

// Start polling for a game
async function startPolling(gameId: string) {
    if (activePollers.has(gameId)) {
        console.log(`Poller already active for game ${gameId}`);
        return;
    }

    console.log(`Starting poller for game ${gameId}`);

    const scheduleNext = (delay: number) => {
        const poller = activePollers.get(gameId);
        if (!poller) return;
        poller.currentDelay = delay;
        poller.timer = setTimeout(pollTick, delay);
    };

    const pollTick = async () => {
        try {
            const data = await fetchGameData(gameId);
            const dataHash = hashData(data);
            const poller = activePollers.get(gameId);

            if (!poller) return;

            // Only broadcast if data has changed
            if (poller.lastHash !== dataHash) {
                console.log(`Broadcasting update for game ${gameId}`);
                broadcast(gameId, data);
                poller.lastData = data;
                poller.lastHash = dataHash;
            }

            // Stop polling for finished games
            if (data.gameStatus === 3) {
                console.log(`Game ${gameId} finished, stopping poller`);
                stopPolling(gameId);
                return;
            }

            // Adaptive delay based on last event
            const nextDelay = computeDelay(data);
            scheduleNext(nextDelay);
        } catch (error) {
            console.error(`Polling error for game ${gameId}:`, error);
            // On error, try again after default delay
            scheduleNext(5000);
        }
    };

    // Initial fetch
    try {
        const initialData = await fetchGameData(gameId);
        const initialHash = hashData(initialData);
        
        const initialDelay = computeDelay(initialData);

        activePollers.set(gameId, { 
            timer: setTimeout(() => pollTick(), initialDelay), 
            lastData: initialData, 
            lastHash: initialHash,
            currentDelay: initialDelay
        });

        // Broadcast initial data to all connected clients
        broadcast(gameId, initialData);
    } catch (error) {
        console.error(`Failed to start polling for game ${gameId}:`, error);
    }
}

// Stop polling for a game
function stopPolling(gameId: string) {
    const poller = activePollers.get(gameId);
    if (poller) {
        console.log(`Stopping poller for game ${gameId}`);
        clearTimeout(poller.timer);
        activePollers.delete(gameId);
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;

    console.log(`SSE connection established for game ${gameId}`);

    const encoder = new TextEncoder();
    let heartbeatInterval: NodeJS.Timeout;
    let currentController: StreamController | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            currentController = controller;
            
            // Register this client
            if (!gameClients.has(gameId)) {
                gameClients.set(gameId, new Set());
            }
            gameClients.get(gameId)!.add(controller);

            // Send initial data immediately if available
            const poller = activePollers.get(gameId);
            if (poller?.lastData) {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(poller.lastData)}\n\n`)
                    );
                } catch (error) {
                    console.error('Failed to send initial data:', error);
                }
            }

            // Start polling if not already active
            if (!activePollers.has(gameId)) {
                await startPolling(gameId);
            }

            // Send heartbeat every 30 seconds to keep connection alive
            heartbeatInterval = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch (error) {
                    console.error('Failed to send heartbeat:', error);
                    clearInterval(heartbeatInterval);
                }
            }, 30000);

            console.log(`Client count for game ${gameId}: ${gameClients.get(gameId)?.size}`);
        },

        cancel() {
            // Clean up on disconnect
            console.log(`SSE connection closed for game ${gameId}`);
            
            clearInterval(heartbeatInterval);
            
            const clients = gameClients.get(gameId);
            if (clients && currentController) {
                clients.delete(currentController);
                
                console.log(`Remaining clients for game ${gameId}: ${clients.size}`);
                
                // Stop polling if no clients left
                if (clients.size === 0) {
                    gameClients.delete(gameId);
                    stopPolling(gameId);
                }
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
        },
    });
}
