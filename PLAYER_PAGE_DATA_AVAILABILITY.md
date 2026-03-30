# Player Page Data Availability Analysis

Date: 2026-03-30
Scope: Player page requirements mapped against the 2 source families already used in this project.

## Source Families in Use

1. Stats source (stats.nba.com via existing fetch wrapper)

- Structured profile, career, season, and awards data
- Best for non-live player pages

2. CDN source (cdn.nba.com static/live JSON)

- Fast live score/schedule/boxscore data
- Best for live game context, not long-term career content

## Requirement Coverage Matrix

| Requirement                            | Stats Source                               | CDN Source              | Verdict                 | Notes                                                       |
| -------------------------------------- | ------------------------------------------ | ----------------------- | ----------------------- | ----------------------------------------------------------- |
| Name                                   | Yes                                        | Yes                     | Available               | Stats profile is canonical for player page base data.       |
| Photo                                  | Via known headshot URL pattern by playerId | Not explicit in payload | Available               | Uses playerId-based image URL pattern.                      |
| Height                                 | Yes                                        | No                      | Available               | From profile endpoint.                                      |
| Weight                                 | Yes                                        | No                      | Available               | From profile endpoint.                                      |
| Age                                    | Birthdate present                          | No                      | Available (derived)     | Compute age from birthdate.                                 |
| Draft year/round/pick                  | Yes                                        | No                      | Available               | Direct profile fields.                                      |
| Jersey number                          | Yes                                        | Yes (live boxscore)     | Available               | Profile is stable; CDN is game-contextual.                  |
| Position                               | Yes                                        | Yes (live boxscore)     | Available               | Profile value preferred for page header.                    |
| Teams played for (ordered)             | Yes                                        | No                      | Available (with caveat) | Derive from season rows; handle TOT rows in traded seasons. |
| Overview: current season basic stats   | Yes                                        | Partial                 | Available               | Aggregate from season logs or dashboard overall.            |
| Overview: career basic stats           | Yes                                        | No                      | Available               | Career totals endpoints provide this directly.              |
| Overview: career highs                 | Yes                                        | No                      | Available               | Dedicated career highs result set exists.                   |
| Overview: awards                       | Yes                                        | No                      | Available               | Raw awards rows available; group in app.                    |
| Stats tab: season-wise basic table     | Yes                                        | No                      | Available               | Year-over-year, Base + PerGame.                             |
| Stats tab: season-wise advanced table  | Yes                                        | No                      | Available               | Year-over-year, Advanced + PerGame.                         |
| Stats tab: season-wise per 36 table    | Yes                                        | No                      | Available               | Year-over-year, Base + Per36.                               |
| Game Log: all played games this season | Yes                                        | Partial                 | Available               | Use season player game log endpoint directly.               |
| Game Log: remove upcoming games        | Yes                                        | Yes                     | Available               | Do not merge schedule data for this tab.                    |

## Endpoint-to-Section Mapping

### Player Details Header

Primary source:

- commonplayerinfo

Fields available directly:

- PERSON_ID
- FIRST_NAME, LAST_NAME, DISPLAY_FIRST_LAST
- BIRTHDATE
- HEIGHT, WEIGHT
- SEASON_EXP
- JERSEY
- POSITION
- SCHOOL, COUNTRY
- TEAM_ID, TEAM_NAME, TEAM_ABBREVIATION, TEAM_CITY
- DRAFT_YEAR, DRAFT_ROUND, DRAFT_NUMBER
- FROM_YEAR, TO_YEAR

Derived:

- Age from BIRTHDATE
- Team display string from TEAM_CITY + TEAM_NAME

### Overview Tab

Current season basic:

- playergamelog (aggregate per game)
- OR playerdashboardbyyearoveryear (Overall row, Base + PerGame)

Career basic:

- playercareerstats
- Use CareerTotalsRegularSeason and optionally CareerTotalsPostSeason

Career highs:

- playercareerstats (CareerHighs result set)

Awards:

- playerawards

### Stats Tab

Season-wise basic table:

- playerdashboardbyyearoveryear
- MeasureType=Base, PerMode=PerGame, ByYear result set

Season-wise advanced table:

- playerdashboardbyyearoveryear
- MeasureType=Advanced, PerMode=PerGame, ByYear result set

Season-wise per 36 table:

- playerdashboardbyyearoveryear
- MeasureType=Base, PerMode=Per36, ByYear result set

### Game Log Tab

All played games this season:

- playergamelog (Season + SeasonType)

Not needed per your requirement:

- CDN schedule/upcoming merge

## Data That Is Not Directly Available (or Needs App Logic)

1. Exact transaction timeline for team changes (signed/traded dates)

- Not provided by the selected endpoints in this architecture.
- You can provide season-level team history reliably.

2. Clean team-history list when player is traded mid-season

- playercareerstats can include TOT rows plus team-specific rows for same season.
- Requires UI/business rule:
  - either show chronological season rows as-is (including TOT), or
  - suppress TOT for team history display and keep team-specific rows only.

3. Curated award groupings

- awards endpoint returns raw rows.
- You need app-side grouping and counting for sections like MVP, All-NBA, POTM, etc.

4. Single precomputed career advanced summary

- Season-wise advanced is available.
- A single career advanced aggregate row may need app-defined computation if required.

## Recommended Build Notes (No Code Changes)

1. Keep player details and all Overview/Stats content stats-source driven.
2. Use CDN only where live or schedule context is explicitly needed.
3. For your requested Game Log tab, use only played-game logs and drop upcoming games entirely.
4. Define and document team-history handling for TOT rows before UI finalization.
5. Define award grouping taxonomy once so counts are stable across players.

## Feasibility Summary

Your requested organization is feasible with the current two-source architecture.

- Fully supported with existing sources: details, overview blocks, basic/advanced/per36 season tables, season game log, career highs, awards.
- Needs explicit app rules: team-history ordering with traded seasons, award grouping, any optional career-advanced rollup.
