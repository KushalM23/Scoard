import { NextRequest, NextResponse } from "next/server";
import { parseSeason, parseSeasonStart } from "@/app/lib/teams";
import { STATS_HEADERS } from "@/app/lib/statsApi";

const MOVEMENT_URL = "https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const seasonParam = searchParams.get("season");
    const season = parseSeason(seasonParam);
    const startYear = parseSeasonStart(season);

    // Range: July 1 of startYear to June 30 of startYear + 1
    const startDate = `${startYear}-07-01T00:00:00`;
    const endDate = `${startYear + 1}-06-30T23:59:59`;

    const res = await fetch(MOVEMENT_URL, {
      headers: STATS_HEADERS,
      next: {
        // Cache historical seasons longer (e.g. 7 days = 604800s), current season shorter (1 hour = 3600s)
        revalidate: startYear < 2025 ? 604800 : 3600,
        tags: [`transactions-${season}`],
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch transactions from NBA API: HTTP ${res.status}`);
    }

    const data = await res.json();
    const rows = data?.NBA_Player_Movement?.rows || [];

    // Filter rows by transaction date falling within the season range
    const filteredRows = rows.filter((row: any) => {
      const dateStr = row.TRANSACTION_DATE;
      return dateStr >= startDate && dateStr <= endDate;
    });

    // Sort by TRANSACTION_DATE desc, then GroupSort desc
    const sortedRows = filteredRows.sort((a: any, b: any) => {
      const dateCompare = b.TRANSACTION_DATE.localeCompare(a.TRANSACTION_DATE);
      if (dateCompare !== 0) return dateCompare;
      return String(b.GroupSort || "").localeCompare(String(a.GroupSort || ""));
    });

    return NextResponse.json({
      season,
      startYear,
      transactions: sortedRows,
    }, {
      headers: {
        "Cache-Control": startYear < 2025
          ? "public, max-age=604800, stale-while-revalidate=86400"
          : "public, max-age=3600, stale-while-revalidate=600",
      }
    });

  } catch (error: any) {
    console.error("Transactions API error:", error);
    return NextResponse.json({
      code: "TRANSACTIONS_FETCH_FAILED",
      message: error?.message || "Failed to load player transaction logs.",
    }, { status: 500 });
  }
}
