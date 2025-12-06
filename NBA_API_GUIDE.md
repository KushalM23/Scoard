# NBA API Guide: Hybrid Architecture

This guide documents the recommended **Hybrid Architecture** for building a high-performance NBA Live Scores app. It combines the speed and simplicity of **CDN Endpoints** for live data with the depth of the **Stats API** for historical/season data.

## 1. Live Scores & Schedule (CDN)

Use the CDN for the fastest possible load times of the daily schedule and live scores.

*   **Source:** CDN
*   **Endpoint:** `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`
*   **Method:** GET Request
*   **Key Data:** Game IDs, Status, Scores, Period info.

### Code Example
```python
import requests

url = "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json"
data = requests.get(url).json()
games = data['scoreboard']['games']

for game in games:
    print(f"{game['gameId']}: {game['awayTeam']['teamTricode']} vs {game['homeTeam']['teamTricode']}")
```

### Output Example
```json
{
  "scoreboard": {
    "gameDate": "2023-10-25",
    "games": [
      {
        "gameId": "0022300063",
        "gameCode": "20231025/ATLCHA",
        "gameStatus": 2,              // 1=Scheduled, 2=Live, 3=Final
        "gameStatusText": "Q4 5:30",
        "period": 4,
        "homeTeam": {
          "teamId": 1610612766,
          "teamTricode": "CHA",
          "score": 102
        },
        "awayTeam": {
          "teamId": 1610612737,
          "teamTricode": "ATL",
          "score": 98
        }
      }
    ]
  }
}
```

---

## 2. Live Visualizer: Play-by-Play + Coordinates (CDN)

**The "Game Changer" Endpoint.** This single endpoint provides the text description AND the X/Y coordinates for every event. No synchronization logic required.

*   **Source:** CDN
*   **Endpoint:** `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gameId}.json`
*   **Method:** GET Request
*   **Key Data:** `description`, `x`, `y`, `scoreHome`, `scoreAway`.

### Code Example
```python
game_id = "0022300063"
url = f"https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{game_id}.json"
data = requests.get(url).json()
actions = data['game']['actions']
```

### Output Example (Shot Event)
```json
{
  "actionNumber": 45,
  "clock": "PT11M35.00S",
  "period": 1,
  "actionType": "2pt",
  "subType": "Jump Shot",
  "description": "Young 19' Pullup Jump Shot (2 PTS)",
  "x": 34.5,          // Coordinate X (0-100)
  "y": 50.2,          // Coordinate Y (0-50)
  "isFieldGoal": 1,
  "shotResult": "Made",
  "scoreHome": "2",
  "scoreAway": "0",
  "playerNameI": "T. Young"
}
```

### Coordinate System (CDN)
*   **x**: 0 to 100 (Court Length). 0 and 100 are the baselines.
*   **y**: 0 to 50 (Court Width).
*   **Note:** You must scale these values to your UI canvas size (e.g., if canvas is 500px wide, x=50 becomes 250px).

---

## 3. Game Box Score (CDN)

Detailed stats for a specific game.

*   **Source:** CDN
*   **Endpoint:** `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gameId}.json`
*   **Method:** GET Request

### Code Example
```python
url = f"https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{game_id}.json"
box = requests.get(url).json()
home_players = box['game']['homeTeam']['players']
```

### Output Example
```json
{
  "game": {
    "homeTeam": {
      "teamTricode": "CHA",
      "score": 116,
      "players": [
        {
          "personId": 202330,
          "nameI": "G. Hayward",
          "statistics": {
            "points": 10,
            "assists": 7,
            "reboundsTotal": 8,
            "minutes": "33:20"
          }
        }
      ]
    }
  }
}
```

---

## 4. Season Leaders (Stats API)

For league-wide standings and season averages, we must fall back to the `nba_api` as the CDN does not provide this aggregated view.

*   **Source:** Stats API (`nba_api`)
*   **Endpoints:** `LeagueDashTeamStats`, `LeagueDashPlayerStats`

### Code Example
```python
from nba_api.stats.endpoints import leaguedashteamstats, leaguedashplayerstats

# Team Stats
team_stats = leaguedashteamstats.LeagueDashTeamStats()
team_df = team_stats.get_data_frames()[0]

# Player Stats
player_stats = leaguedashplayerstats.LeagueDashPlayerStats()
player_df = player_stats.get_data_frames()[0]
```

### Output Example (Player Row)
```json
{
  "PLAYER_ID": 1631260,
  "PLAYER_NAME": "AJ Green",
  "TEAM_ABBREVIATION": "MIL",
  "GP": 22,
  "PTS": 251,
  "AST": 49,
  "REB": 65
}
```

---

## 5. Team Standings (Stats API)

For conference and division standings, use the `LeagueStandingsV3` endpoint from `nba_api`.

*   **Source:** Stats API (`nba_api`)
*   **Endpoint:** `nba_api.stats.endpoints.leaguestandingsv3.LeagueStandingsV3`
*   **Key Data:** `Conference`, `Division`, `PlayoffRank`, `WINS`, `LOSSES`, `Record`.

### Code Example
```python
from nba_api.stats.endpoints import leaguestandingsv3

standings = leaguestandingsv3.LeagueStandingsV3()
data = standings.get_dict()
teams = data['resultSets'][0]['rowSet']
headers = data['resultSets'][0]['headers']

# Convert to list of dicts for easier handling
team_list = [dict(zip(headers, team)) for team in teams]

# Example: Filter for Western Conference
west_teams = [t for t in team_list if t['Conference'] == 'West']
```

### Output Example (Single Team)
```json
{
  "TeamID": 1610612760,
  "TeamCity": "Oklahoma City",
  "TeamName": "Thunder",
  "Conference": "West",
  "PlayoffRank": 1,
  "Division": "Northwest",
  "DivisionRank": 1,
  "WINS": 21,
  "LOSSES": 1,
  "WinPCT": 0.955,
  "Record": "21-1",
  "HOME": "10-0",
  "ROAD": "11-1",
  "L10": "10-0",     // Last 10 Games
  "strCurrentStreak": "W 13"
}
```
