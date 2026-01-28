const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Cache with 5 minute TTL by default
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Enable CORS for your Next.js domain
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
}));

app.use(express.json());

// NBA Stats API Headers
const STATS_HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://stats.nba.com/',
    'Pragma': 'no-cache',
    'Cache-Control': 'no-cache',
};

// Helper function to fetch from Stats API with caching
async function fetchWithCache(cacheKey, url, params = {}, cacheTTL = 300) {
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log(`Cache HIT: ${cacheKey}`);
        return cached;
    }

    console.log(`Cache MISS: ${cacheKey} - Fetching from Stats API...`);
    try {
        const response = await axios.get(url, {
            params,
            headers: STATS_HEADERS,
            timeout: 30000 // 30 second timeout
        });

        cache.set(cacheKey, response.data, cacheTTL);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${cacheKey}:`, error.message);
        throw error;
    }
}

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'NBA Stats Proxy',
        cacheStats: cache.getStats()
    });
});

// League Standings
app.get('/api/standings', async (req, res) => {
    try {
        const season = req.query.Season || '2025-26';
        const cacheKey = `standings_${season}`;
        
        const data = await fetchWithCache(
            cacheKey,
            'https://stats.nba.com/stats/leaguestandingsv3',
            {
                'LeagueID': '00',
                'Season': season,
                'SeasonType': 'Regular Season'
            },
            300 // 5 min cache
        );

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch standings', message: error.message });
    }
});

// Boxscore Summary
app.get('/api/boxscore/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const cacheKey = `boxscore_${gameId}`;
        
        const data = await fetchWithCache(
            cacheKey,
            'https://stats.nba.com/stats/boxscoresummaryv2',
            { GameID: gameId },
            60 // 1 min cache (games update frequently)
        );

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch boxscore', message: error.message });
    }
});

// Team Roster
app.get('/api/roster/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        const season = req.query.Season || '2025-26';
        const cacheKey = `roster_${teamId}_${season}`;
        
        const data = await fetchWithCache(
            cacheKey,
            'https://stats.nba.com/stats/commonteamroster',
            {
                TeamID: teamId,
                Season: season
            },
            1800 // 30 min cache (rosters don't change often)
        );

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roster', message: error.message });
    }
});

// Team Game Log
app.get('/api/gamelog/:teamId', async (req, res) => {
    try {
        const { teamId } = req.params;
        const season = req.query.Season || '2025-26';
        const cacheKey = `gamelog_${teamId}_${season}`;
        
        const data = await fetchWithCache(
            cacheKey,
            'https://stats.nba.com/stats/teamgamelog',
            {
                TeamID: teamId,
                Season: season,
                SeasonType: 'Regular Season'
            },
            300 // 5 min cache
        );

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch game log', message: error.message });
    }
});

// Generic Stats API proxy (for any other endpoint)
app.get('/api/stats/*', async (req, res) => {
    try {
        const endpoint = req.params[0];
        const cacheKey = `stats_${endpoint}_${JSON.stringify(req.query)}`;
        
        const data = await fetchWithCache(
            cacheKey,
            `https://stats.nba.com/stats/${endpoint}`,
            req.query,
            300
        );

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch from Stats API', message: error.message });
    }
});

// Clear cache endpoint (optional - for manual cache clearing)
app.post('/api/cache/clear', (req, res) => {
    const { key } = req.body;
    if (key) {
        cache.del(key);
        res.json({ message: `Cache cleared for key: ${key}` });
    } else {
        cache.flushAll();
        res.json({ message: 'All cache cleared' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 NBA Stats Proxy running on port ${PORT}`);
    console.log(`📊 Cache TTL: 5 minutes`);
    console.log(`🔗 Allowed origin: ${process.env.ALLOWED_ORIGIN || '*'}`);
});
