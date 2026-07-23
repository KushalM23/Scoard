import { NextRequest, NextResponse } from "next/server";
import { parseSeason, parseSeasonStart } from "@/lib/teams";
import { STATS_HEADERS } from "@/lib/statsApi";

const DRAFT_URL = "https://stats.nba.com/stats/drafthistory?LeagueID=00";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const seasonParam = searchParams.get("season");
    const season = parseSeason(seasonParam);
    const startYear = parseSeasonStart(season);

    const res = await fetch(DRAFT_URL, {
      headers: STATS_HEADERS,
      next: {
        // Cache historical seasons longer (e.g. 7 days = 604800s), current season shorter (1 hour = 3600s)
        revalidate: startYear < 2025 ? 604800 : 3600,
        tags: [`draft-${season}`],
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch draft history from NBA API: HTTP ${res.status}`);
    }

    const data = await res.json();
    const draftSet = data?.resultSets?.[0];
    if (!draftSet) {
      throw new Error("Draft history payload has invalid structure");
    }

    const headers = draftSet.headers;
    const rows = draftSet.rowSet || [];

    const personIdIdx = headers.indexOf("PERSON_ID");
    const playerNameIdx = headers.indexOf("PLAYER_NAME");
    const seasonIdx = headers.indexOf("SEASON");
    const roundNumberIdx = headers.indexOf("ROUND_NUMBER");
    const roundPickIdx = headers.indexOf("ROUND_PICK");
    const overallPickIdx = headers.indexOf("OVERALL_PICK");
    const teamIdIdx = headers.indexOf("TEAM_ID");
    const teamCityIdx = headers.indexOf("TEAM_CITY");
    const teamNameIdx = headers.indexOf("TEAM_NAME");
    const teamAbbrevIdx = headers.indexOf("TEAM_ABBREVIATION");
    const organizationIdx = headers.indexOf("ORGANIZATION");

    // Filter by draft year (season's start year, e.g. "2024" for "2024-25")
    const targetSeasonYearStr = String(startYear);
    const filteredRows = rows.filter((row: any) => String(row[seasonIdx]) === targetSeasonYearStr);

    const formattedPicks = filteredRows.map((row: any) => ({
      personId: row[personIdIdx],
      playerName: row[playerNameIdx],
      season: row[seasonIdx],
      roundNumber: row[roundNumberIdx],
      roundPick: row[roundPickIdx],
      overallPick: row[overallPickIdx],
      teamId: row[teamIdIdx],
      teamCity: row[teamCityIdx],
      teamName: row[teamNameIdx],
      teamAbbreviation: row[teamAbbrevIdx],
      organization: row[organizationIdx],
    }));

    // Sort by overallPick ascending
    formattedPicks.sort((a: any, b: any) => a.overallPick - b.overallPick);

    return NextResponse.json({
      season,
      draftYear: startYear,
      picks: formattedPicks,
    }, {
      headers: {
        "Cache-Control": startYear < 2025
          ? "public, max-age=604800, stale-while-revalidate=86400"
          : "public, max-age=3600, stale-while-revalidate=600",
      }
    });

  } catch (error: any) {
    console.error("Draft history API error:", error);
    return NextResponse.json({
      code: "DRAFT_FETCH_FAILED",
      message: error?.message || "Failed to load draft picks history.",
    }, { status: 500 });
  }
}
