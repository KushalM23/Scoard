"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import { Skeleton } from "@/app/components/skeleton";
import type {
  PlayoffSeriesPayload,
  SeriesGameItem,
  SeriesStatsTeam,
} from "@/app/types/playoffs";

type SeriesErrorPayload = {
  code: string;
  message: string;
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

function formatDate(raw: string) {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TeamBadge({
  team,
  compact,
}: {
  team: PlayoffSeriesPayload["overview"]["teams"][number];
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border-white/5 bg-white/[0.03] p-3"
          : "glass-card p-4 sm:p-5"
      }
    >
      <div className="flex items-center gap-3">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.displayName}
            className={
              compact ? "w-8 h-8 object-contain" : "w-11 h-11 object-contain"
            }
          />
        ) : (
          <div
            className={
              compact
                ? "w-8 h-8 rounded-full border border-white/30"
                : "w-11 h-11 rounded-full border border-white/30"
            }
          />
        )}

        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-text/60">
            Seed {team.seed ?? "-"}
          </p>
          <p className="text-base sm:text-xl font-semibold truncate">
            {team.displayName}
          </p>
          <p className="text-xs text-text/65">
            {team.regularSeasonRecord.wins}-{team.regularSeasonRecord.losses}{" "}
            regular season
          </p>
        </div>

        <div className="ml-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.15em] text-text/55">
            Series Wins
          </p>
          <p className="font-display text-3xl leading-none text-primary">
            {team.seriesWins}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <p className="rounded-lg border border-white/10 px-2 py-1 text-text/75">
          Conf #{team.conferenceRank}
        </p>
        <p className="rounded-lg border border-white/10 px-2 py-1 text-text/75">
          Div #{team.divisionRank}
        </p>
        <p className="rounded-lg border border-white/10 px-2 py-1 text-text/75">
          Streak {team.streak}
        </p>
      </div>
    </div>
  );
}

function GameCard({
  game,
  topTeamId,
}: {
  game: SeriesGameItem;
  topTeamId: number;
}) {
  const winnerRowTone = (teamId: number | null) =>
    game.status === "completed" && game.winnerTeamId === teamId
      ? "border-green-300/40 bg-green-500/10"
      : "border-white/10";

  return (
    <div className="rounded-xl glass-card p-3.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-[0.16em] text-text/60">
          Game {game.gameNumber ?? "-"}
        </p>
        <p
          className={[
            "text-xs font-semibold uppercase",
            game.status === "in_progress"
              ? "text-accent"
              : game.status === "completed"
                ? "text-secondary"
                : "text-secondary",
          ].join(" ")}
        >
          {game.statusText || game.status.replace("_", " ")}
        </p>
      </div>

      <div className="space-y-2">
        <div
          className={[
            "rounded-lg border px-2.5 py-2 flex items-center gap-2",
            winnerRowTone(game.awayTeam.teamId),
          ].join(" ")}
        >
          <p className="text-sm font-semibold">{game.awayTeam.tricode}</p>
          <p className="text-xs text-text/65 truncate">
            {game.awayTeam.displayName}
          </p>
          <p className="ml-auto text-base font-display">
            {game.awayTeam.score ?? "-"}
          </p>
        </div>

        <div
          className={[
            "rounded-lg border px-2.5 py-2 flex items-center gap-2",
            winnerRowTone(game.homeTeam.teamId),
          ].join(" ")}
        >
          <p className="text-sm font-semibold">{game.homeTeam.tricode}</p>
          <p className="text-xs text-text/65 truncate">
            {game.homeTeam.displayName}
          </p>
          <p className="ml-auto text-base font-display">
            {game.homeTeam.score ?? "-"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[11px] text-text/55">
          {formatDate(game.scheduledAt)}
        </p>
        <Link
          href={`/game/${game.gameId}`}
          className="text-[11px] uppercase tracking-[0.12em] text-primary hover:text-primary/80"
        >
          View Game
        </Link>
      </div>

      {game.winnerTeamId && game.status === "completed" && (
        <p className="mt-1 text-[11px] text-text/55">
          Winner:{" "}
          {game.winnerTeamId === topTeamId ? "Higher Seed" : "Lower Seed"}
        </p>
      )}
    </div>
  );
}

function TeamStatsTables({ team }: { team: SeriesStatsTeam }) {
  const metrics = team.stats.teamMetrics;

  const summary = [
    { label: "PPG", value: metrics.pointsPerGame.toFixed(1) },
    { label: "RPG", value: metrics.reboundsPerGame.toFixed(1) },
    { label: "APG", value: metrics.assistsPerGame.toFixed(1) },
    { label: "NET RTG", value: (metrics.netRating ?? 0).toFixed(1) },
    { label: "OFF RTG", value: (metrics.offRating ?? 0).toFixed(1) },
    { label: "DEF RTG", value: (metrics.defRating ?? 0).toFixed(1) },
    { label: "PACE", value: (metrics.pace ?? 0).toFixed(1) },
  ];

  const topPlayers = team.stats.playerStats
    .map((player) => {
      const pts = Number(player.PTS ?? player.points ?? 0);
      const reb = Number(player.REB ?? player.rebounds ?? 0);
      const ast = Number(player.AST ?? player.assists ?? 0);
      const gp = Number(player.GP ?? player.gamesPlayed ?? 0);
      const min = Number(player.MIN ?? player.minutes ?? 0);
      const stl = Number(player.STL ?? player.steals ?? 0);
      const blk = Number(player.BLK ?? player.blocks ?? 0);
      const fg =
        Number(player.FG_PCT ?? player.fgPct ?? 0) *
        (Number(player.FG_PCT ?? player.fgPct ?? 0) <= 1 ? 100 : 1);
      const tp =
        Number(player.FG3_PCT ?? player.threePtPct ?? 0) *
        (Number(player.FG3_PCT ?? player.threePtPct ?? 0) <= 1 ? 100 : 1);
      const ft =
        Number(player.FT_PCT ?? player.ftPct ?? 0) *
        (Number(player.FT_PCT ?? player.ftPct ?? 0) <= 1 ? 100 : 1);

      return {
        id: Number(player.playerId ?? player.PLAYER_ID ?? 0),
        name: String(player.playerName ?? player.PLAYER_NAME ?? "Unknown"),
        gp,
        min,
        pts,
        reb,
        ast,
        stl,
        blk,
        fg,
        tp,
        ft,
      };
    })
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 10);

  return (
    <div className="rounded-2xl glass-card p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={team.displayName}
            className="w-8 h-8 object-contain"
          />
        ) : (
          <div className="w-8 h-8 rounded-full border border-white/30" />
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-text/60">
            {team.tricode}
          </p>
          <h4 className="text-lg font-semibold">{team.displayName}</h4>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-5">
        {summary.map((entry) => (
          <div
            key={`${team.teamId}-${entry.label}`}
            className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-text/55">
              {entry.label}
            </p>
            <p className="text-sm font-semibold text-text">{entry.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-text/65 border-b border-white/10">
              <th className="py-2 pr-2">Player</th>
              <th className="py-2 pr-2">GP</th>
              <th className="py-2 pr-2">MIN</th>
              <th className="py-2 pr-2">PTS</th>
              <th className="py-2 pr-2">REB</th>
              <th className="py-2 pr-2">AST</th>
              <th className="py-2 pr-2">STL</th>
              <th className="py-2 pr-2">BLK</th>
              <th className="py-2 pr-2">FG%</th>
              <th className="py-2 pr-2">3PT%</th>
              <th className="py-2 pr-2">FT%</th>
            </tr>
          </thead>
          <tbody>
            {topPlayers.map((player) => (
              <tr
                key={`${team.teamId}-${player.id}-${player.name}`}
                className="border-b border-white/5"
              >
                <td className="py-2 pr-2 font-medium text-text">
                  {player.name}
                </td>
                <td className="py-2 pr-2 text-text/80">{player.gp}</td>
                <td className="py-2 pr-2 text-text/80">
                  {player.min.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.pts.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.reb.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.ast.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.stl.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.blk.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.fg.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.tp.toFixed(1)}
                </td>
                <td className="py-2 pr-2 text-text/80">
                  {player.ft.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeriesSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[180px] w-full rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[132px] w-full rounded-2xl" />
        <Skeleton className="h-[132px] w-full rounded-2xl" />
      </div>
      <div className="rounded-2xl border border-white/10 p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton
              key={`series-skel-${idx}`}
              className="h-[168px] w-full rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SeriesPageClient({ seriesId }: { seriesId: string }) {
  const [activeTab, setActiveTab] = useState<"games" | "stats">("games");
  const [data, setData] = useState<PlayoffSeriesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SeriesErrorPayload | null>(null);

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
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadSeries();

    return () => {
      isActive = false;
    };
  }, [seriesId]);

  const overviewTeams = data?.overview.teams ?? [];
  const topTeam = overviewTeams[0];
  const bottomTeam = overviewTeams[1];

  const progressLabel = useMemo(() => {
    if (!data) return "";
    return `${data.series.summary.completedGames}/${data.series.summary.totalGames} games completed`;
  }, [data]);

  return (
    <Layout>
      <Header />

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {isLoading ? (
          <SeriesSkeleton />
        ) : error ? (
          error.code === "PLAYOFF_SERIES_NOT_READY" ? (
            <div className="rounded-2xl glass-card border border-accent/25 p-5 text-accent text-sm space-y-3">
              <p>{error.message}</p>
              <p className="text-accent/80">
                This matchup has not been locked in yet. Check the live bracket
                for updates.
              </p>
              <Link
                href="/playoffs"
                className="inline-block text-xs uppercase tracking-[0.13em] text-primary hover:text-primary/80"
              >
                Back to bracket
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl glass-card border border-accent/25 p-5 text-accent text-sm">
              {error.message}
            </div>
          )
        ) : !data ? (
          <div className="rounded-2xl glass-card border border-accent/25 p-5 text-accent text-sm">
            Failed to load this series.
          </div>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl glass-card border-none px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-xs uppercase tracking-[0.16em] text-text/60">
                  {data.series.roundLabel} •{" "}
                  {data.series.conference
                    ? `${data.series.conference.toUpperCase()}ERN`
                    : "NBA"}
                </p>
                <Link
                  href="/playoffs"
                  className="text-xs uppercase tracking-[0.13em] text-primary hover:text-primary/80"
                >
                  Back to bracket
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                {topTeam ? <TeamBadge team={topTeam} /> : <div />}

                <div className="text-center px-3">
                  <p className="text-xs uppercase tracking-[0.15em] text-text/55">
                    Best of {data.series.bestOf}
                  </p>
                  <p className="font-display text-4xl sm:text-5xl text-primary leading-none mt-1">
                    {topTeam?.seriesWins ?? 0} - {bottomTeam?.seriesWins ?? 0}
                  </p>
                  <p className="text-xs text-text/65 mt-2 capitalize">
                    {data.series.status.replace("_", " ")} • {progressLabel}
                  </p>
                </div>

                {bottomTeam ? <TeamBadge team={bottomTeam} /> : <div />}
              </div>
            </section>

            <section className="rounded-2xl glass-card p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("games")}
                  className={[
                    "h-10 rounded-lg text-sm uppercase tracking-[0.13em] font-semibold transition-colors",
                    activeTab === "games"
                      ? "bg-white/10 text-primary"
                      : "border-white/5 text-text/70 hover:text-text",
                  ].join(" ")}
                >
                  Games
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("stats")}
                  className={[
                    "h-10 rounded-lg text-sm uppercase tracking-[0.13em] font-semibold transition-colors",
                    activeTab === "stats"
                      ? "bg-white/10 text-primary"
                      : "border-white/5 text-text/70 hover:text-text",
                  ].join(" ")}
                >
                  Stats
                </button>
              </div>

              {activeTab === "games" ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.tabs.games.items.map((game) => (
                      <GameCard
                        key={game.gameId}
                        game={game}
                        topTeamId={topTeam?.teamId ?? 0}
                      />
                    ))}

                    {data.tabs.games.items.length === 0 && (
                      <p className="text-sm text-text/70">
                        No games scheduled for this series yet.
                      </p>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-xs uppercase tracking-[0.14em] text-text/60">
                      {data.statsContext.label}
                    </p>
                    <p className="text-sm text-text/78 mt-1">
                      {data.statsContext.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {data.tabs.stats.teams.map((team) => (
                      <TeamStatsTables
                        key={`${team.slot}-${team.teamId}`}
                        team={team}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </section>
          </div>
        )}
      </main>
    </Layout>
  );
}
