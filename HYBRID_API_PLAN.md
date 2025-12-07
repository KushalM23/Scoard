# Hybrid API Implementation Plan

## Objective
Implement a robust data fetching strategy for NBA game data that leverages the speed of the CDN for live games and the reliability/depth of the Stats API for historical or fallback scenarios.

## Architecture

### 1. Primary Source: NBA CDN
- **Endpoint**: `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_{gameId}.json`
- **Use Case**: Live games, recent finished games.
- **Benefits**: Low latency, high availability, CORS-friendly (mostly).
- **Strategy**: Always attempt to fetch from CDN first.

### 2. Secondary Source: NBA Stats API
- **Endpoint**: `https://stats.nba.com/stats/boxscoretraditionalv2`
- **Use Case**: Historical games, games not found on CDN (404), or when CDN data is incomplete.
- **Benefits**: Comprehensive historical archive.
- **Constraints**: Stricter rate limiting, requires specific headers (`Referer`, `User-Agent`).
- **Strategy**: Use as a fallback when CDN fails.

## Implementation Steps

### Frontend (`Game.tsx`)
1.  **Remove Mock Data**: Eliminate dependency on `mockGameData`.
2.  **State Management**: Initialize `gameData` as `null` and handle loading/error states.
3.  **Data Parsing**: Implement logic to extract and normalize player statistics from the API response (which comes in a nested structure) to match the flat `Player` interface used by the UI.
4.  **Polling**: Maintain the 5-second polling interval for live updates.

### Backend (`server.ts`)
1.  **Hybrid Route Handler**: Modify `/api/games/:gameId`.
2.  **Fallback Logic**:
    - `try { return await fetchCDN(gameId) }`
    - `catch (e) { return await fetchStatsAPI(gameId) }`
3.  **Data Normalization**: Ensure the Stats API response is transformed to match the CDN response structure so the frontend remains agnostic to the source.

## Testing Strategy
- **Live Game**: Verify CDN is hit (fast response).
- **Old Game**: Verify fallback to Stats API (slower response, but successful).
- **Invalid Game**: Verify 404 handling.
