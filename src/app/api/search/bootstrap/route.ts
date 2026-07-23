import { NextResponse } from "next/server";
import { fetchStatsApi } from "@/lib/statsApi";
import { CURRENT_SEASON, TEAM_META } from "@/lib/teams";
import type {
  SearchBootstrapPayload,
  SearchPlayerRecord,
  SearchTeamRecord,
} from "@/types/search";

const SEARCH_CACHE_SECONDS = 3600;

type ResultSet = {
  headers: string[];
  rowSet: any[][];
};

function getResultSet(raw: any): ResultSet {
  if (Array.isArray(raw?.resultSets) && raw.resultSets.length > 0) {
    return raw.resultSets[0] as ResultSet;
  }

  if (raw?.resultSet?.headers && raw?.resultSet?.rowSet) {
    return raw.resultSet as ResultSet;
  }

  throw new Error("Unexpected stats.nba.com payload shape");
}

function getRowValue(row: any[], headers: string[], key: string): any {
  const index = headers.indexOf(key);
  return index === -1 ? undefined : row[index];
}

function parsePlayerName(
  displayFirstLast: string,
  displayLastCommaFirst: string,
) {
  const normalizedCommaName = (displayLastCommaFirst || "").trim();
  if (normalizedCommaName.includes(",")) {
    const [lastRaw, firstRaw] = normalizedCommaName.split(",", 2);
    const firstName = (firstRaw || "").trim();
    const lastName = (lastRaw || "").trim();
    if (firstName && lastName) {
      return { firstName, lastName };
    }
  }

  const normalizedDisplay = (displayFirstLast || "").trim();
  if (!normalizedDisplay) {
    return { firstName: "", lastName: "" };
  }

  const chunks = normalizedDisplay.split(" ").filter(Boolean);
  if (chunks.length === 1) {
    return { firstName: chunks[0], lastName: chunks[0] };
  }

  return {
    firstName: chunks.slice(0, -1).join(" "),
    lastName: chunks[chunks.length - 1],
  };
}

function mapTeams(rowSet: any[][], headers: string[]): SearchTeamRecord[] {
  const teamMap = new Map<number, SearchTeamRecord>();

  for (const row of rowSet) {
    const id = Number(getRowValue(row, headers, "TeamID"));
    if (!Number.isInteger(id) || id <= 0 || teamMap.has(id)) {
      continue;
    }

    const fallback = TEAM_META[id];
    const city = String(
      getRowValue(row, headers, "TeamCity") || fallback?.city || "",
    ).trim();
    const name = String(
      getRowValue(row, headers, "TeamName") || fallback?.name || "",
    ).trim();

    if (!city && !name) {
      continue;
    }

    teamMap.set(id, {
      id,
      type: "team",
      city,
      name,
      displayName: `${city} ${name}`.trim(),
      logoUrl: `https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg`,
    });
  }

  return Array.from(teamMap.values());
}

function mapPlayers(rowSet: any[][], headers: string[]): SearchPlayerRecord[] {
  const players: SearchPlayerRecord[] = [];

  for (const row of rowSet) {
    const id = Number(getRowValue(row, headers, "PERSON_ID"));
    const rosterStatus = Number(getRowValue(row, headers, "ROSTERSTATUS"));
    const teamId = Number(getRowValue(row, headers, "TEAM_ID"));

    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }

    if (rosterStatus !== 1 || !Number.isInteger(teamId) || teamId <= 0) {
      continue;
    }

    const displayName = String(
      getRowValue(row, headers, "DISPLAY_FIRST_LAST") || "",
    ).trim();
    const displayLastCommaFirst = String(
      getRowValue(row, headers, "DISPLAY_LAST_COMMA_FIRST") || "",
    ).trim();

    const { firstName, lastName } = parsePlayerName(
      displayName,
      displayLastCommaFirst,
    );

    const teamFallback = TEAM_META[teamId];
    const teamCity = String(
      getRowValue(row, headers, "TEAM_CITY") || teamFallback?.city || "",
    ).trim();
    const teamNamePart = String(
      getRowValue(row, headers, "TEAM_NAME") || teamFallback?.name || "",
    ).trim();

    const teamName = `${teamCity} ${teamNamePart}`.trim();
    const teamTricode = String(
      getRowValue(row, headers, "TEAM_ABBREVIATION") ||
        teamFallback?.tricode ||
        "",
    ).trim();

    players.push({
      id,
      type: "player",
      firstName,
      lastName,
      displayName,
      displayLastCommaFirst,
      teamId,
      teamName,
      teamTricode,
      headshotUrl: `https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`,
    });
  }

  return players;
}

export async function GET() {
  try {
    const [playersRaw, teamsRaw] = await Promise.all([
      fetchStatsApi(
        "commonallplayers",
        {
          LeagueID: "00",
          Season: CURRENT_SEASON,
          IsOnlyCurrentSeason: 1,
        },
        3,
        SEARCH_CACHE_SECONDS,
      ),
      fetchStatsApi(
        "leaguestandingsv3",
        {
          LeagueID: "00",
          Season: CURRENT_SEASON,
          SeasonType: "Regular Season",
        },
        3,
        SEARCH_CACHE_SECONDS,
      ),
    ]);

    const playersResultSet = getResultSet(playersRaw);
    const teamsResultSet = getResultSet(teamsRaw);

    const payload: SearchBootstrapPayload = {
      season: CURRENT_SEASON,
      players: mapPlayers(playersResultSet.rowSet, playersResultSet.headers),
      teams: mapTeams(teamsResultSet.rowSet, teamsResultSet.headers),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${SEARCH_CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch (error) {
    console.error("Failed to build search bootstrap payload:", error);
    return NextResponse.json(
      { error: "Failed to load search bootstrap data" },
      { status: 500 },
    );
  }
}
