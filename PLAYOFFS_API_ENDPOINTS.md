# Playoffs API Endpoints

## Overview

The playoff backend now exposes two frontend-facing endpoints:

1. `GET /api/playoffs/bracket`
2. `GET /api/playoffs/series/:seriesId`

Each endpoint also supports `POST` with a JSON body so we do not have to keep growing query params for frontend integration.

The new contract is intentionally page-shaped:

- The bracket endpoint returns card-ready bracket data for the bracket page.
- The series endpoint returns page-ready data for a single non-play-in series page.
- Raw game arrays were removed from the bracket endpoint because they were extra noise for that page.
- Play-in pages are intentionally not supported as standalone series pages.

## Endpoint 1: Playoff Bracket

### Route

`GET /api/playoffs/bracket`

Optional query params:

- `season=2025-26`

Body alternative:

`POST /api/playoffs/bracket`

```json
{
  "season": "2025-26"
}
```

### Purpose

This endpoint powers the playoff bracket page only.

It returns:

- A play-in section split into `east` and `west`
- A playoffs section split into `west`, `east`, and `finals`
- Small series cards already normalized for the frontend
- Bracket connection metadata for drawing lines
- Canonical `seriesId` values for navigation to the series page

### Response Shape

```json
{
  "season": "2025-26",
  "sourceSeason": "2025-26",
  "generatedAt": "2026-04-14T12:00:00.000Z",
  "source": "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
  "note": null,
  "playIn": {
    "east": [SeriesCard, SeriesCard, SeriesCard],
    "west": [SeriesCard, SeriesCard, SeriesCard],
    "connections": [BracketConnection]
  },
  "playoffs": {
    "west": {
      "firstRound": [SeriesCard, SeriesCard, SeriesCard, SeriesCard],
      "conferenceSemifinals": [SeriesCard, SeriesCard],
      "conferenceFinals": [SeriesCard]
    },
    "east": {
      "firstRound": [SeriesCard, SeriesCard, SeriesCard, SeriesCard],
      "conferenceSemifinals": [SeriesCard, SeriesCard],
      "conferenceFinals": [SeriesCard]
    },
    "finals": SeriesCard,
    "connections": [BracketConnection]
  },
  "meta": {
    "playInSeriesCount": 6,
    "playoffSeriesCount": 15,
    "availableSeriesPages": 8,
    "unresolvedSeriesCount": 0
  }
}
```

### `SeriesCard`

```json
{
  "id": "2025-26-west-first-round-1v8",
  "href": "/playoffs/series/2025-26-west-first-round-1v8",
  "pageAvailable": true,
  "phase": "playoffs",
  "conference": "west",
  "round": "first_round",
  "roundLabel": "First Round",
  "slot": "1v8",
  "bracketOrder": 1,
  "title": "West 1 vs 8",
  "status": "in_progress",
  "bestOf": 7,
  "winsNeeded": 4,
  "hasStarted": true,
  "isCompleted": false,
  "leaderTeamId": 1610612760,
  "winnerTeamId": null,
  "teams": {
    "top": {
      "teamId": 1610612760,
      "seed": 1,
      "tricode": "OKC",
      "name": "Thunder",
      "displayName": "Oklahoma City Thunder",
      "logoUrl": "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg",
      "seriesWins": 2,
      "state": "active",
      "isTbd": false
    },
    "bottom": {
      "teamId": 1610612744,
      "seed": 8,
      "tricode": "GSW",
      "name": "Warriors",
      "displayName": "Golden State Warriors",
      "logoUrl": "https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg",
      "seriesWins": 1,
      "state": "active",
      "isTbd": false
    }
  },
  "summary": {
    "totalGames": 3,
    "completedGames": 3,
    "nextGame": null,
    "lastCompletedGame": {
      "gameId": "0042500103",
      "gameNumber": 3,
      "scheduledAt": "2026-04-24T02:00:00Z",
      "status": "completed",
      "statusText": "Final",
      "winnerTeamId": 1610612760,
      "homeTeam": {
        "teamId": 1610612744,
        "tricode": "GSW",
        "score": 102
      },
      "awayTeam": {
        "teamId": 1610612760,
        "tricode": "OKC",
        "score": 108
      }
    }
  },
  "navigation": {
    "winnerToSeriesId": "2025-26-west-conf-semis-top",
    "loserToSeriesId": null
  }
}
```

### `BracketConnection`

```json
{
  "fromSeriesId": "2025-26-east-play-in-7v8",
  "outcome": "winner",
  "toSeriesId": "2025-26-east-first-round-2v7"
}
```

### Important UI Rules Encoded in the API

- `teams.top` is always the higher seed when both seeds are known.
- `teams.bottom` is always the lower seed when both seeds are known.
- `state = "eliminated"` marks the team that should be dimmed after the series is over.
- `isTbd = true` means the card should render `TBD`.
- `pageAvailable = false` means the frontend should not link to a series page yet.
- `navigation.winnerToSeriesId` and `navigation.loserToSeriesId` support bracket line drawing.

### Canonical Series IDs

Examples:

- `2025-26-east-play-in-7v8`
- `2025-26-west-play-in-8-seed`
- `2025-26-east-first-round-4v5`
- `2025-26-west-conf-semis-bottom`
- `2025-26-east-conf-finals-conference-finals`
- `2025-26-nba-finals`

These IDs are now the source of truth for deep linking and series page requests.

## Endpoint 2: Series Page

### Route

`GET /api/playoffs/series/:seriesId`

Example:

`GET /api/playoffs/series/2025-26-west-first-round-1v8`

Optional query params:

- `season=2025-26`

Body alternative:

`POST /api/playoffs/series/:seriesId`

```json
{
  "season": "2025-26"
}
```

### Purpose

This endpoint powers the dedicated series page for one playoff series.

It returns:

- The series overview header data
- The series games tab
- The stats tab
- Team context for both sides
- Automatic switching between regular-season preview stats and playoff-context stats

### Important Restrictions

- Play-in series are not supported here.
- If both teams are not locked in yet, the endpoint returns `409`.
- If the `seriesId` does not exist, the endpoint returns `404`.

### Response Shape

```json
{
  "season": "2025-26",
  "sourceSeason": "2025-26",
  "generatedAt": "2026-04-14T12:00:00.000Z",
  "source": "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2_1.json",
  "note": null,
  "series": {
    "id": "2025-26-west-first-round-1v8",
    "href": "/playoffs/series/2025-26-west-first-round-1v8",
    "title": "Oklahoma City Thunder vs Golden State Warriors",
    "round": "first_round",
    "roundLabel": "First Round",
    "conference": "west",
    "status": "in_progress",
    "bestOf": 7,
    "winsNeeded": 4,
    "hasStarted": true,
    "isCompleted": false,
    "leaderTeamId": 1610612760,
    "winnerTeamId": null,
    "navigation": {
      "winnerToSeriesId": "2025-26-west-conf-semis-top",
      "loserToSeriesId": null
    },
    "teams": {
      "top": TeamCardTeam,
      "bottom": TeamCardTeam
    },
    "summary": {
      "totalGames": 3,
      "completedGames": 3,
      "nextGame": null,
      "lastCompletedGame": BracketGameSummary
    }
  },
  "statsContext": {
    "mode": "playoff_context",
    "seasonType": "Playoffs",
    "label": "Playoff run to date",
    "description": "The series has started, so team and player stats reflect each club's playoff run to date."
  },
  "overview": {
    "teams": [OverviewTeam, OverviewTeam]
  },
  "tabs": {
    "games": {
      "totalGames": 3,
      "completedGames": 3,
      "items": [SeriesGameItem]
    },
    "stats": {
      "mode": "playoff_context",
      "seasonType": "Playoffs",
      "label": "Playoff run to date",
      "description": "The series has started, so team and player stats reflect each club's playoff run to date.",
      "teams": [DetailedStatsTeam, DetailedStatsTeam]
    }
  }
}
```

### `OverviewTeam`

This is the lightweight top-of-page overview model.

```json
{
  "slot": "top",
  "teamId": 1610612760,
  "seed": 1,
  "tricode": "OKC",
  "displayName": "Oklahoma City Thunder",
  "logoUrl": "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg",
  "seriesWins": 2,
  "regularSeasonRecord": {
    "wins": 68,
    "losses": 14,
    "winPct": 0.829
  },
  "conferenceRank": 1,
  "divisionRank": 1,
  "streak": "W3",
  "contextRecord": {
    "wins": 5,
    "losses": 2
  }
}
```

### `SeriesGameItem`

This is the model for the series games tab.

```json
{
  "gameId": "0042500103",
  "gameNumber": 3,
  "scheduledAt": "2026-04-24T02:00:00Z",
  "status": "completed",
  "statusText": "Final",
  "winnerTeamId": 1610612760,
  "homeTeam": {
    "teamId": 1610612744,
    "tricode": "GSW",
    "displayName": "Golden State Warriors",
    "score": 102
  },
  "awayTeam": {
    "teamId": 1610612760,
    "tricode": "OKC",
    "displayName": "Oklahoma City Thunder",
    "score": 108
  }
}
```

### `DetailedStatsTeam`

Each side in the stats tab includes:

- Card-level team identity data
- Regular-season overview context
- Context record
- Team metrics
- Home/away splits
- Normalized team tables
- Player stats

```json
{
  "slot": "top",
  "teamId": 1610612760,
  "seed": 1,
  "tricode": "OKC",
  "displayName": "Oklahoma City Thunder",
  "logoUrl": "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg",
  "seriesWins": 2,
  "regularSeasonRecord": {
    "wins": 68,
    "losses": 14,
    "winPct": 0.829
  },
  "conferenceRank": 1,
  "divisionRank": 1,
  "streak": "W3",
  "standingsSnapshot": {
    "conference": [],
    "division": []
  },
  "contextRecord": {
    "wins": 5,
    "losses": 2
  },
  "stats": {
    "teamMetrics": {},
    "homeAwaySplits": {},
    "tables": {},
    "playerStats": []
  }
}
```

## Stats Context Switching

The series endpoint now handles the pre-series vs post-start requirement automatically.

### Before the series starts

- `statsContext.mode = "regular_season_preview"`
- `statsContext.seasonType = "Regular Season"`
- Team stats come from regular season
- Player stats come from regular season
- The page still shows series seeding and matchup context

### After the series starts

- `statsContext.mode = "playoff_context"`
- `statsContext.seasonType = "Playoffs"`
- Team stats come from the current playoff run
- Player stats come from the current playoff run
- The series games tab continues to show the actual scheduled/completed games in the series

## Error Responses

### Bracket endpoint

```json
{
  "code": "PLAYOFF_BRACKET_FAILED",
  "message": "Playoff bracket details are temporarily unavailable. Please try again shortly."
}
```

### Series endpoint: series not found

Status: `404`

```json
{
  "code": "PLAYOFF_SERIES_NOT_FOUND",
  "message": "Playoff series not found."
}
```

### Series endpoint: teams not locked in yet

Status: `409`

```json
{
  "code": "PLAYOFF_SERIES_NOT_READY",
  "message": "This series page is not available yet because both teams are not locked in."
}
```

### Series endpoint: generic failure

Status: `500`

```json
{
  "code": "PLAYOFF_SERIES_FAILED",
  "message": "Playoff series details are temporarily unavailable. Please try again shortly."
}
```

## Frontend Integration Notes

- Use `playIn.connections` and `playoffs.connections` to draw bracket lines.
- Use `pageAvailable` to decide whether a series card is clickable.
- Use `teams.top` and `teams.bottom` exactly as delivered. They are already ordered for the card layout.
- Dim teams where `state === "eliminated"`.
- Render `TBD` when `isTbd === true`.
- Use `statsContext` from the series endpoint as the source of truth for tab labeling and empty/explanatory copy.
