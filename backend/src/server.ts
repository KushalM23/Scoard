import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory cache
const cache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5000; // 5 seconds

// Helper to get cached data
const getCachedData = (key: string) => {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
};

// Helper to set cached data
const setCachedData = (key: string, data: any) => {
    cache[key] = { data, timestamp: Date.now() };
};

// Routes
// Fetch live games from CDN
app.get('/api/games/live', async (req, res) => {
    const cacheKey = 'live_games';
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
        setCachedData(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching live games:', error);
        res.status(500).json({ error: 'Failed to fetch live games' });
    }
});

app.get('/api/games/:gameId', async (req, res) => {
    const { gameId } = req.params;
    const cacheKey = `game_${gameId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`);
        setCachedData(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching game ${gameId}:`, error);
        res.status(500).json({ error: 'Failed to fetch game data' });
    }
});

app.get('/api/games/:gameId/pbp', async (req, res) => {
    const { gameId } = req.params;
    const cacheKey = `pbp_${gameId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`);
        setCachedData(cacheKey, response.data);
        res.json(response.data);
    } catch (error) {
        console.error(`Error fetching PBP for ${gameId}:`, error);
        res.status(500).json({ error: 'Failed to fetch play-by-play data' });
    }
});

app.get('/api/games/date/:date', async (req, res) => {
    const { date } = req.params; // YYYY-MM-DD
    const cacheKey = `games_${date}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);

    try {
        // Try CDN first for today's games
        try {
            const cdnResponse = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json');
            // Check if specific date matches
            if (cdnResponse.data.scoreboard.gameDate === date) {
                console.log(`Using CDN for date ${date}`);
                setCachedData(cacheKey, cdnResponse.data);
                return res.json(cdnResponse.data);
            }
        } catch (e) {
            console.log('CDN fetch failed or mismatch, falling back to stats API');
        }

        // Fallback to full season schedule from CDN
        // Note: This provides schedule data but NOT live scores for past/future dates
        console.log(`Fetching schedule from CDN for date ${date}`);
        const scheduleResponse = await axios.get('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json');
        
        // Convert YYYY-MM-DD to MM/DD/YYYY format
        const [year, month, day] = date.split('-');
        const targetDateString = `${month}/${day}/${year}`;

        const gameDates = scheduleResponse.data.leagueSchedule.gameDates;
        const dayData = gameDates.find((d: any) => d.gameDate.startsWith(targetDateString));

        if (!dayData) {
            return res.json({ scoreboard: { games: [] } });
        }

        const games = dayData.games.map((g: any) => ({
            gameId: g.gameId,
            gameStatus: 1, // Default to scheduled/pre-game
            gameStatusText: g.gameStatusText,
            gameEt: g.gameDateTimeEst,
            homeTeam: {
                teamId: g.homeTeam.teamId,
                teamTricode: g.homeTeam.teamTricode,
                score: 0,
                wins: 0,
                losses: 0
            },
            awayTeam: {
                teamId: g.awayTeam.teamId,
                teamTricode: g.awayTeam.teamTricode,
                score: 0,
                wins: 0,
                losses: 0
            }
        }));

        // [SC-Workaround] Fetch scores for each game individually
        // Since the schedule endpoint doesn't have scores, we fetch the boxscore for each game ID.
        // This is slower (N requests) but reliable via CDN.
        await Promise.all(games.map(async (game: any) => {
            try {
                const boxResponse = await axios.get(`https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${game.gameId}.json`);
                const boxData = boxResponse.data.game;
                
                game.homeTeam.score = boxData.homeTeam.score;
                game.awayTeam.score = boxData.awayTeam.score;
                game.gameStatus = boxData.gameStatus; // 2=Live, 3=Final
                game.gameStatusText = boxData.gameStatusText;
                
                // Update clock info if available
                if (boxData.period) game.period = boxData.period;
                if (boxData.gameClock) game.gameClock = boxData.gameClock;
            } catch (e) {
                // If boxscore fails (e.g. game hasn't started yet or file doesn't exist), 
                // we just keep the default 0-0 score from the schedule.
            }
        }));

        const formattedResponse = {
            scoreboard: {
                gameDate: date,
                games: games
            }
        };
        
        setCachedData(cacheKey, formattedResponse);
        res.json(formattedResponse);
    } catch (error: any) {
        console.error(`Error fetching games for date ${date}:`, error);
        res.status(500).json({
            error: 'Failed to fetch games for date',
            details: error.message,
            responseKeys: error.response?.data ? Object.keys(error.response.data) : 'No response data'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
