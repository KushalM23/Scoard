const readline = require('readline');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nba.com/',
    'Origin': 'https://www.nba.com',
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getLatestGameId() {
    try {
        const scoreboardUrl = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
        const res = await fetch(scoreboardUrl);
        if (!res.ok) return null;
        const data = await res.json();
        const games = data.scoreboard.games;
        return games.length > 0 ? games[0].gameId : null;
    } catch (e) {
        return null;
    }
}

async function runTests() {
    console.log('NBA API INTERACTIVE TEST TOOL\n');
    let gameId = null;

    // --- 1. STANDINGS TEST ---
    const ans1 = await ask('Run Standings Test (stats.nba.com)? [y/n]: ');
    if (ans1.toLowerCase().startsWith('y')) {
        try {
            console.log('   Fetching Standings...');
            const url = 'https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2025-26&SeasonType=Regular%20Season';
            const res = await fetch(url, { headers: HEADERS });
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            
            const data = await res.json();
            const headers = data.resultSets[0].headers;
            
            console.log('  Success!');
            console.log('   Available Column Headers:');
            console.log(`   ${headers.join(', ')}`);
            console.log('\n');
        } catch (e) {
            console.log(`Failed: ${e.message}\n`);
        }
    } else {
        console.log('   Skipped.\n');
    }

    // --- 2. SCOREBOARD TEST ---
    const ans2 = await ask('Run Scoreboard Test (cdn.nba.com)? [y/n]: ');
    if (ans2.toLowerCase().startsWith('y')) {
        try {
            console.log('   Fetching Scoreboard...');
            const url = 'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json';
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            
            const data = await res.json();
            const games = data.scoreboard.games;
            
            console.log('Success!');
            console.log(`   Games Found Today: ${games.length}`);
            if (games.length > 0) {
                gameId = games[0].gameId;
                console.log(`   Latest Game ID: ${gameId} (${games[0].awayTeam.teamTricode} @ ${games[0].homeTeam.teamTricode})`);
            }
            console.log('\n');
        } catch (e) {
            console.log(`Failed: ${e.message}\n`);
        }
    } else {
        console.log('Skipped.\n');
    }

    // Ensure we have a gameId for the next tests
    if (!gameId) {
        console.log('Fetching a Game ID quietly for subsequent tests...');
        gameId = await getLatestGameId();
        if (gameId) console.log(`   Found Game ID: ${gameId}`);
        else console.log('Could not find a live Game ID. Subsequent tests may fail.\n');
    }

    // --- 3. BOXSCORE TEST ---
    const ans3 = await ask(`Run Boxscore Test for Game ${gameId || '???'}? [y/n]: `);
    if (ans3.toLowerCase().startsWith('y')) {
        if (!gameId) {
            console.log('No Game ID available. Skipping.\n');
        } else {
            try {
                console.log(`Fetching Boxscore for ${gameId}...`);
                const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                
                const data = await res.json();
                const homeStats = data.game.homeTeam.statistics;
                const playerStats = data.game.homeTeam.players[0].statistics;

                console.log('  Success!');
                console.log('   --- TEAM STATISTICS KEYS (Headers) ---');
                console.log(Object.keys(homeStats).join(', '));
                console.log('\n   --- PLAYER STATISTICS KEYS (Headers) ---');
                console.log(Object.keys(playerStats).join(', '));
                console.log('\n');
            } catch (e) {
                console.log(`Failed: ${e.message}\n`);
            }
        }
    } else {
        console.log('Skipped.\n');
    }

    // --- 4. PLAY-BY-PLAY TEST ---
    const ans4 = await ask(`Run Play-by-Play Test for Game ${gameId || '???'}? [y/n]: `);
    if (ans4.toLowerCase().startsWith('y')) {
        if (!gameId) {
            console.log('No Game ID available. Skipping.\n');
        } else {
            try {
                console.log(`   Fetching Play-by-Play for ${gameId}...`);
                const url = `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status: ${res.status}`);
                
                const data = await res.json();
                const actions = data.game.actions;
                
                console.log('  Success!');
                console.log(`   Total Actions: ${actions.length}`);
                if (actions.length > 0) {
                    const lastAction = actions[actions.length - 1];
                    console.log('   Last Action Sample:');
                    console.log(`   [${lastAction.clock}] ${lastAction.description} (Score: ${lastAction.scoreHome}-${lastAction.scoreAway})`);
                    console.log('   \n   Available Action Keys:');
                    console.log(`   ${Object.keys(lastAction).join(', ')}`);
                }
                console.log('\n');
            } catch (e) {
                console.log(`Failed: ${e.message}\n`);
            }
        }
    } else {
        console.log('Skipped.\n');
    }

    rl.close();
}

runTests();
