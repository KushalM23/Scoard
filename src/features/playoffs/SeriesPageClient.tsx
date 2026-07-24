"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Layout from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import GameCard from "@/features/home/GameCard";
import TeamLink from "@/components/links/TeamLink";
import PlayerLink from "@/components/links/PlayerLink";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeason } from "@/providers/SeasonProvider";
import type {
  PlayoffSeriesPayload,
  SeriesStatsTeam,
} from "@/types/playoffs";

type SeriesErrorPayload = {
  code: string;
  message: string;
};

type SeriesTab = "stats" | "roster";

type HomeGameCardTeam = {
  teamId: number;
  teamTricode: string;
  score: number;
  wins: number;
  losses: number;
};

type HomeGameCardGame = {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  gameEt: string;
  homeTeam: HomeGameCardTeam;
  awayTeam: HomeGameCardTeam;
};

type PlayerStatRow = {
  id: number;
  name: string;
  teamId: number;
  teamTricode: string;
  teamName: string;
  jersey: string;
  position: string;
  gp: number;
  min: number;
  pts: number;
  reb: number;
  ast: number;
};

type TeamRosterPlayer = {
  playerId: number;
  playerName: string;
  jersey: string;
  position: string;
};

const fetchSeriesPayload = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const typed = payload as SeriesErrorPayload;
    throw Object.assign(new Error(typed.message ?? "Failed to load series"), {
      code: typed.code,
      status: res.status,
    });
  }

  return payload as PlayoffSeriesPayload;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusToGameStatus(status: "scheduled" | "in_progress" | "completed") {
  if (status === "in_progress") return 2;
  if (status === "completed") return 3;
  return 1;
}

function splitTeamName(displayName: string, fallbackTricode: string) {
  const normalized = displayName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return {
      top: fallbackTricode.toUpperCase(),
      bottom: "TEAM",
    };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return {
      top: fallbackTricode.toUpperCase(),
      bottom: parts[0].toUpperCase(),
    };
  }

  return {
    top: parts.slice(0, -1).join(" ").toUpperCase(),
    bottom: parts[parts.length - 1].toUpperCase(),
  };
}

function formatGameDateLabel(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return {
      dateText: "TBD",
      timeText: "--",
    };
  }

  return {
    dateText: date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    timeText: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function normalizeTeamPlayers(team: SeriesStatsTeam): PlayerStatRow[] {
  return team.stats.playerStats.map((player) => ({
    id: toNumber(player.playerId ?? player.PLAYER_ID ?? 0),
    name: String(player.playerName ?? player.PLAYER_NAME ?? "Unknown"),
    teamId: team.teamId,
    teamTricode: team.tricode,
    teamName: team.displayName,
    jersey: String(player.jersey ?? player.JERSEY ?? player.NUM ?? "").trim(),
    position: String(
      player.position ??
        player.POSITION ??
        player.POS ??
        player.PlayerPosition ??
        "",
    ).trim(),
    gp: toNumber(player.GP ?? player.gamesPlayed ?? 0),
    min: toNumber(player.MIN ?? player.minutes ?? 0),
    pts: toNumber(player.PTS ?? player.points ?? 0),
    reb: toNumber(player.REB ?? player.rebounds ?? 0),
    ast: toNumber(player.AST ?? player.assists ?? 0),
  }));
}

function selectPotentialStarters(rows: PlayerStatRow[]) {
  const withMinutes = rows.filter((row) => row.min > 0);
  const pool = withMinutes.length > 0 ? withMinutes : rows;

  return [...pool]
    .sort((a, b) => b.min - a.min || b.gp - a.gp || b.pts - a.pts)
    .slice(0, 5);
}

async function fetchTeamRoster(teamId: number, season: string) {
  const res = await fetch(
    `/api/teams/${teamId}?include=roster&season=${season}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return [] as TeamRosterPlayer[];
  }

  const payload = (await res.json().catch(() => null)) as {
    roster?: {
      players?: Array<Record<string, unknown>>;
    };
  } | null;

  const players = payload?.roster?.players;
  if (!Array.isArray(players)) {
    return [] as TeamRosterPlayer[];
  }

  return players
    .map((player) => ({
      playerId: toNumber(player.playerId),
      playerName: String(player.playerName ?? "Unknown"),
      jersey: String(player.jersey ?? "").trim(),
      position: String(player.position ?? "").trim(),
    }))
    .filter((player) => player.playerId > 0 || player.playerName !== "Unknown");
}

function SeriesLoadingState() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[220px] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          <Skeleton className="h-[160px] rounded-xl" />
          <Skeleton className="h-[160px] rounded-xl" />
          <Skeleton className="h-[160px] rounded-xl" />
        </div>
      </div>
      <div className="rounded-2xl bg-white/[0.04] p-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <Skeleton className="h-[240px] w-full rounded-xl mt-4" />
      </div>
    </div>
  );
}

function SeriesErrorState({ error }: { error: SeriesErrorPayload }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] p-5 text-sm text-accent space-y-2">
      <p>{error.message}</p>
      {error.code === "PLAYOFF_SERIES_NOT_READY" && (
        <p className="text-accent/80">
          This matchup has not been locked in yet. Check back after the bracket
          updates.
        </p>
      )}
    </div>
  );
}

function SeriesScoreboard({ payload }: { payload: PlayoffSeriesPayload }) {
  const top = payload.overview.teams[0];
  const bottom = payload.overview.teams[1];

  const TeamPanel = ({
    team,
    align,
    source,
  }: {
    team: PlayoffSeriesPayload["overview"]["teams"][number];
    align: "left" | "right";
    source: string;
  }) => {
    const lines = splitTeamName(team.displayName, team.tricode);
    const isLeft = align === "left";

    return (
      <div
        className={[
          "flex items-center gap-3 min-w-0",
          isLeft ? "justify-start" : "justify-end",
        ].join(" ")}
      >
        {isLeft &&
          (team.logoUrl ? (
            <div className="h-16 w-16 md:h-24 md:w-24 rounded-2xl p-2 shrink-0">
              <img
                src={team.logoUrl}
                alt={team.displayName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl shrink-0" />
          ))}

        <div className={isLeft ? "min-w-0 text-left" : "min-w-0 text-right"}>
          <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] text-text/68 font-semibold truncate">
            {lines.top}
          </p>
          <TeamLink
            teamId={team.teamId}
            sourceComponent={source}
            className="block text-xl sm:text-2xl md:text-[2.4rem] leading-none font-display font-black uppercase tracking-[0.04em] hover:text-accent transition-colors truncate"
          >
            {lines.bottom}
          </TeamLink>
          <span className="inline-block mt-2 text-sm md:text-md text-secondary font-sans font-semibold tracking-[0.08em] bg-secondary/10 px-2 py-0.5 rounded-full">
            {team.seed !== null ? `#${team.seed}` : "SEED TBD"}
          </span>
        </div>

        {!isLeft &&
          (team.logoUrl ? (
            <div className="h-16 w-16 md:h-24 md:w-24 rounded-2xl p-2 shrink-0">
              <img
                src={team.logoUrl}
                alt={team.displayName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl shrink-0" />
          ))}
      </div>
    );
  };

  return (
    <section className="bg-white/5 border border-white/10 rounded-lg p-4 md:p-5">
      <div className="flex items-center justify-center mb-3">
        <p className="text-sm uppercase tracking-[0.14em] text-text/65">
          {payload.series.roundLabel}
        </p>
      </div>

      <div className="rounded-2xl px-3 py-4 md:px-5 md:py-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-5">
          <TeamPanel team={top} align="left" source="series_scoreboard_top" />

          <div className="flex flex-col items-center min-w-[86px] md:min-w-[120px]">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.14em] text-text/55">
              Best of {payload.series.bestOf}
            </p>
            <div className="flex items-center gap-2 md:gap-3 mt-1">
              <span className="text-3xl md:text-6xl font-mono text-text">
                {top.seriesWins}
              </span>
              <span className="text-text/20 text-lg md:text-2xl">-</span>
              <span className="text-3xl md:text-6xl font-mono text-text">
                {bottom.seriesWins}
              </span>
            </div>
          </div>

          <TeamPanel
            team={bottom}
            align="right"
            source="series_scoreboard_bottom"
          />
        </div>
      </div>
    </section>
  );
}

function TeamStatsPanel({ team }: { team: SeriesStatsTeam }) {
  const metrics = team.stats.teamMetrics;
  const statCards = [
    { key: "PPG", value: metrics.pointsPerGame.toFixed(1) },
    { key: "RPG", value: metrics.reboundsPerGame.toFixed(1) },
    { key: "APG", value: metrics.assistsPerGame.toFixed(1) },
    { key: "NET", value: toNumber(metrics.netRating).toFixed(1) },
    { key: "PACE", value: toNumber(metrics.pace).toFixed(1) },
    { key: "W-L", value: `${metrics.wins}-${metrics.losses}` },
  ];

  return (
    <article className="rounded-2xl bg-white/[0.05] p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.displayName}
            className="w-9 h-9 object-contain"
          />
        ) : (
          <div className="w-9 h-9 rounded-full border border-white/20" />
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold text-text">
            {team.displayName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {statCards.map((entry) => (
          <div
            key={`${team.teamId}-${entry.key}`}
            className="rounded-lg bg-black/20 px-2 py-2 text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.12em] text-text/56">
              {entry.key}
            </p>
            <p className="text-sm font-semibold text-text">{entry.value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function TeamPlayerStatsTable({
  team,
  rows,
}: {
  team: SeriesStatsTeam;
  rows: PlayerStatRow[];
}) {
  return (
    <article className="rounded-2xl bg-white/[0.05] p-5 md:p-7">
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={`${row.teamId}-${row.id}-${row.name}`}
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 md:px-4 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <p className="text-base md:text-lg font-semibold text-text min-w-0 truncate">
              {row.id > 0 ? (
                <PlayerLink
                  playerId={row.id}
                  sourceComponent="series_player_stats"
                  className="hover:text-accent transition-colors"
                >
                  {row.name}
                </PlayerLink>
              ) : (
                row.name
              )}
            </p>
            <div className="grid grid-cols-3 gap-2 md:gap-3 w-full sm:w-auto sm:min-w-[270px]">
              <div className="rounded-lg bg-white/[0.04] px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-text/58">
                  PPG
                </p>
                <p className="text-lg md:text-xl font-semibold text-text mt-0.5">
                  {row.pts.toFixed(1)}
                </p>
              </div>

              <div className="rounded-lg bg-white/[0.04] px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-text/58">
                  RPG
                </p>
                <p className="text-lg md:text-xl font-semibold text-text mt-0.5">
                  {row.reb.toFixed(1)}
                </p>
              </div>

              <div className="rounded-lg bg-white/[0.04] px-2 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.1em] text-text/58">
                  APG
                </p>
                <p className="text-lg md:text-xl font-semibold text-text mt-0.5">
                  {row.ast.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <div className="rounded-xl bg-black/20 p-4 text-center text-sm text-text/60">
            No player stats available.
          </div>
        )}
      </div>
    </article>
  );
}

function RosterSection({
  teams,
  rostersByTeam,
  fallbackRostersByTeam,
  isLoading,
}: {
  teams: SeriesStatsTeam[];
  rostersByTeam: Record<number, TeamRosterPlayer[]>;
  fallbackRostersByTeam: Record<number, TeamRosterPlayer[]>;
  isLoading: boolean;
}) {
  const fallbackImage =
    "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {teams.map((team) => {
        const players =
          rostersByTeam[team.teamId]?.length > 0
            ? rostersByTeam[team.teamId]
            : (fallbackRostersByTeam[team.teamId] ?? []);

        return (
          <article
            key={`roster-${team.teamId}`}
            className="rounded-2xl bg-white/[0.05] p-4 md:p-5"
          >
            <div className="mb-4 flex items-center gap-2.5">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.displayName}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/20" />
              )}
              <h3 className="text-sm uppercase tracking-[0.14em] text-text/72 font-semibold">
                {team.displayName}
              </h3>
            </div>

            {isLoading && players.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`roster-loading-${team.teamId}-${idx}`}
                    className="rounded-xl bg-black/20 p-3 flex items-center gap-3"
                  >
                    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : players.length === 0 ? (
              <div className="rounded-xl bg-black/20 p-4 text-sm text-text/60">
                No roster data available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((player) => {
                  const detailLine = [
                    `#${player.jersey || "--"}`,
                    player.position || "N/A",
                  ].join(" | ");

                  return (
                    <div
                      key={`${team.teamId}-${player.playerId}-${player.playerName}`}
                      className="rounded-xl bg-black/20 p-3 flex items-center gap-3 min-w-0"
                    >
                      {player.playerId > 0 ? (
                        <img
                          src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.playerId}.png`}
                          alt={player.playerName}
                          className="w-12 h-12 rounded-full object-cover bg-white/10 shrink-0"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src =
                              fallbackImage;
                          }}
                        />
                      ) : (
                        <img
                          src={fallbackImage}
                          alt={player.playerName}
                          className="w-12 h-12 rounded-full object-cover bg-white/10 shrink-0"
                        />
                      )}

                      <div className="min-w-0">
                        <p className="font-semibold truncate text-text">
                          {player.playerId > 0 ? (
                            <PlayerLink
                              playerId={player.playerId}
                              sourceComponent="series_roster_card"
                              className="hover:text-accent transition-colors"
                            >
                              {player.playerName}
                            </PlayerLink>
                          ) : (
                            player.playerName
                          )}
                        </p>
                        <p className="text-xs text-text/60">{detailLine}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        );
      })}

      {teams.length === 0 && !isLoading && (
        <div className="rounded-2xl bg-white/[0.05] p-5 text-sm text-text/60">
          No roster data available.
        </div>
      )}
    </div>
  );
}

export default function SeriesPageClient({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const { setIsDropdownDisabled, setActiveSeasonContext } = useSeason();
  const [activeTab, setActiveTab] = useState<SeriesTab>("stats");
  const [data, setData] = useState<PlayoffSeriesPayload | null>(null);
  const [rostersByTeam, setRostersByTeam] = useState<
    Record<number, TeamRosterPlayer[]>
  >({});
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SeriesErrorPayload | null>(null);

  useEffect(() => {
    setIsDropdownDisabled(true);
    return () => {
      setIsDropdownDisabled(false);
      setActiveSeasonContext(null);
    };
  }, [seriesId]);

  useEffect(() => {
    if (data && data.season) {
      setActiveSeasonContext(data.season);
    }
  }, [data]);

  useEffect(() => {
    let isActive = true;

    const loadSeries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchSeriesPayload(
          `/api/playoffs/series/${seriesId}`,
        );
        if (!isActive) return;
        setData(payload);
      } catch (fetchError) {
        if (!isActive) return;

        const code =
          typeof fetchError === "object" &&
          fetchError !== null &&
          "code" in fetchError
            ? String(
                (fetchError as { code?: string }).code ??
                  "PLAYOFF_SERIES_FAILED",
              )
            : "PLAYOFF_SERIES_FAILED";

        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load this series.";

        setError({ code, message });
        setData(null);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadSeries();

    return () => {
      isActive = false;
    };
  }, [seriesId]);

  useEffect(() => {
    if (!data) {
      setRostersByTeam({});
      setIsRosterLoading(false);
      return;
    }

    let isActive = true;

    const loadRosters = async () => {
      setIsRosterLoading(true);

      try {
        const rosterEntries = await Promise.all(
          data.overview.teams.map(async (team) => {
            const players = await fetchTeamRoster(team.teamId, data.season);
            return [team.teamId, players] as const;
          }),
        );

        if (!isActive) return;
        setRostersByTeam(Object.fromEntries(rosterEntries));
      } finally {
        if (isActive) {
          setIsRosterLoading(false);
        }
      }
    };

    void loadRosters();

    return () => {
      isActive = false;
    };
  }, [data]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/playoffs");
  };

  const gameCards = useMemo(() => {
    if (!data) return [] as HomeGameCardGame[];

    const records = new Map<number, { wins: number; losses: number }>();
    for (const team of data.overview.teams) {
      records.set(team.teamId, {
        wins: team.regularSeasonRecord.wins,
        losses: team.regularSeasonRecord.losses,
      });
    }

    return data.tabs.games.items.map((game) => {
      const homeId = game.homeTeam.teamId ?? 0;
      const awayId = game.awayTeam.teamId ?? 0;

      const homeRecord = records.get(homeId) ?? { wins: 0, losses: 0 };
      const awayRecord = records.get(awayId) ?? { wins: 0, losses: 0 };

      return {
        gameId: game.gameId,
        gameStatus: statusToGameStatus(game.status),
        gameStatusText: game.statusText || game.status.replace("_", " "),
        gameEt: game.scheduledAt,
        homeTeam: {
          teamId: homeId,
          teamTricode: game.homeTeam.tricode,
          score: game.homeTeam.score ?? 0,
          wins: homeRecord.wins,
          losses: homeRecord.losses,
        },
        awayTeam: {
          teamId: awayId,
          teamTricode: game.awayTeam.tricode,
          score: game.awayTeam.score ?? 0,
          wins: awayRecord.wins,
          losses: awayRecord.losses,
        },
      } as HomeGameCardGame;
    });
  }, [data]);

  const statTeams = useMemo(() => {
    if (!data) return [] as SeriesStatsTeam[];
    return [...data.tabs.stats.teams].sort(
      (a, b) => (a.slot === "top" ? -1 : 1) - (b.slot === "top" ? -1 : 1),
    );
  }, [data]);

  const playerRowsByTeam = useMemo(() => {
    return Object.fromEntries(
      statTeams.map((team) => {
        const rows = normalizeTeamPlayers(team).sort((a, b) => b.pts - a.pts);
        return [team.teamId, rows];
      }),
    ) as Record<number, PlayerStatRow[]>;
  }, [statTeams]);

  const fallbackRostersByTeam = useMemo(() => {
    return Object.fromEntries(
      statTeams.map((team) => {
        const fallback = (playerRowsByTeam[team.teamId] ?? []).map((row) => ({
          playerId: row.id,
          playerName: row.name,
          jersey: row.jersey,
          position: row.position,
        }));

        return [team.teamId, fallback];
      }),
    ) as Record<number, TeamRosterPlayer[]>;
  }, [playerRowsByTeam, statTeams]);

  const starterRowsByTeam = useMemo(() => {
    return Object.fromEntries(
      statTeams.map((team) => [
        team.teamId,
        selectPotentialStarters(playerRowsByTeam[team.teamId] ?? []),
      ]),
    ) as Record<number, PlayerStatRow[]>;
  }, [playerRowsByTeam, statTeams]);

  const renderStatsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {statTeams.map((team) => (
          <TeamStatsPanel key={`${team.slot}-${team.teamId}`} team={team} />
        ))}

        {statTeams.length === 0 && (
          <div className="rounded-2xl bg-white/[0.05] p-5 text-sm text-text/66">
            No team stats available.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
        {statTeams.map((team) => (
          <TeamPlayerStatsTable
            key={`player-stats-${team.teamId}`}
            team={team}
            rows={starterRowsByTeam[team.teamId] ?? []}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <Header />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-7xl mx-auto px-3 sm:px-6 md:px-4 py-5 sm:py-8 md:py-6"
      >
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-text/60 hover:text-text mb-6 md:mb-4 transition-colors text-base md:text-sm"
        >
          <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
          <span>Back</span>
        </button>

        {isLoading ? (
          <SeriesLoadingState />
        ) : error ? (
          <SeriesErrorState error={error} />
        ) : !data ? (
          <div className="rounded-2xl bg-white/[0.06] p-5 text-sm text-accent">
            Failed to load this series.
          </div>
        ) : (
          <div className="space-y-6">
            <SeriesScoreboard payload={data} />

            <section className="space-y-3">
              <h2 className="text-sm uppercase tracking-[0.14em] text-text/72 font-semibold">
                Series Games
              </h2>

              {gameCards.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.05] p-5 text-sm text-text/66">
                  No games listed for this series yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {gameCards.map((game) => (
                    <GameCard
                      key={game.gameId}
                      game={game}
                      scheduledDisplay={formatGameDateLabel(game.gameEt)}
                      onClick={() => router.push(`/game/${game.gameId}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white/5 border border-white/10 rounded-lg rounded-xl p-1 flex gap-1.5 relative">
                  {(
                    [
                      { id: "stats", label: "Stats" },
                      { id: "roster", label: "Roster" },
                    ] as Array<{ id: SeriesTab; label: string }>
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-5 py-2 rounded-lg font-display text-xs sm:px-6 sm:text-sm transition-colors duration-300 tracking-wide z-10 ${
                        activeTab === tab.id
                          ? "text-text"
                          : "text-text/60 hover:text-text"
                      }`}
                    >
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="seriesActiveTab"
                          className="absolute inset-0 bg-accent rounded-lg"
                          transition={{
                            type: "spring",
                            bounce: 0.2,
                            duration: 0.5,
                          }}
                        />
                      )}
                      <span className="relative z-10 uppercase">
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === "stats" ? (
                    renderStatsTab()
                  ) : (
                    <RosterSection
                      teams={statTeams}
                      rostersByTeam={rostersByTeam}
                      fallbackRostersByTeam={fallbackRostersByTeam}
                      isLoading={isRosterLoading}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
