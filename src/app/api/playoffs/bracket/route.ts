import { NextRequest, NextResponse } from "next/server";
import { getPlayoffBracketPayload } from "@/lib/playoffs";
import { parseSeason } from "@/lib/teams";

export const revalidate = 900;

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const routeCache = new Map<
  string,
  {
    payload: Awaited<ReturnType<typeof getPlayoffBracketPayload>>;
    expiresAt: number;
  }
>();

function jsonResponse(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}

async function resolvePayload(seasonInput: string | null) {
  const season = parseSeason(seasonInput);
  const cacheKey = season;
  const now = Date.now();
  const cached = routeCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  const payload = await getPlayoffBracketPayload(season);
  routeCache.set(cacheKey, {
    payload,
    expiresAt: now + ROUTE_CACHE_TTL_MS,
  });

  return payload;
}

export async function GET(request: NextRequest) {
  try {
    const payload = await resolvePayload(
      request.nextUrl.searchParams.get("season"),
    );
    return jsonResponse(payload);
  } catch (error) {
    console.error("playoff bracket route failed", error);
    return NextResponse.json(
      {
        code: "PLAYOFF_BRACKET_FAILED",
        message:
          "Playoff bracket details are temporarily unavailable. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = await resolvePayload(
      typeof body?.season === "string" ? body.season : null,
    );
    return jsonResponse(payload);
  } catch (error) {
    console.error("playoff bracket route failed", error);
    return NextResponse.json(
      {
        code: "PLAYOFF_BRACKET_FAILED",
        message:
          "Playoff bracket details are temporarily unavailable. Please try again shortly.",
      },
      { status: 500 },
    );
  }
}
