"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/app/components/Loading";
import TeamLink from "@/app/components/TeamLink";
import { trackEvent } from "@/app/lib/analytics";
import { parseTab } from "@/app/lib/teams";
import type {
  TeamOverviewData,
  TeamRosterData,
  TeamScheduleData,
  TeamStatsData,
  TeamStatsStandardRow,
  TeamStatsAdvancedRow,
  TeamResultsData,
  TeamTab,
  TeamApiError,
  TeamPagePayload,
} from "@/app/types/team";

interface TeamPageClientProps {
  teamId: number;
  initialTab: TeamTab;
  initialOverview: TeamOverviewData | null;
}

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const TABS: Array<{ id: TeamTab; label: string }> = [
  { id: "team-stats", label: "Team Stats" },
  { id: "player-stats", label: "Player Stats" },
  { id: "roster", label: "Roster" },
];

const metricLabels: Array<{
  label: string;
  value: (data: TeamStatsData) => string;
}> = [
  { label: "PPG", value: (data) => data.teamMetrics.pointsPerGame.toFixed(1) },
  {
    label: "RPG",
    value: (data) => data.teamMetrics.reboundsPerGame.toFixed(1),
  },
  { label: "APG", value: (data) => data.teamMetrics.assistsPerGame.toFixed(1) },
  {
    label: "NET RTG",
    value: (data) => (data.teamMetrics.netRating ?? 0).toFixed(1),
  },
];

type SortKey = keyof TeamStatsData["playerStats"][number];

type TeamSection = "overview" | "stats" | "roster" | "schedule" | "results";

function SectionError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <p className="text-red-300 font-display text-sm tracking-wider uppercase">
        {title}
      </p>
      <p className="text-text/70 text-sm">
        {message ?? "This section is temporarily unavailable."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="glass-card p-8 text-center">
      <p className="text-text text-lg font-display tracking-wider uppercase">
        {title}
      </p>
      {subtitle && <p className="text-text/60 text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

function TeamOverviewInline({
  data,
  schedule,
  results,
}: {
  data: TeamOverviewData;
  schedule: SectionState<TeamScheduleData>;
  results: SectionState<TeamResultsData>;
}) {
  const renderSnapshot = (
    title: string,
    rows: TeamOverviewData["standingsSnapshot"]["conference"],
  ) => (
    <div className="glass-card p-4 h-[360px] flex flex-col">
      <h3 className="text-xs uppercase tracking-wider text-text/70 mb-3">
        {title}
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div
            key={`${title}-${row.teamId}`}
            className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
              row.teamId === data.teamId
                ? "bg-accent/20 border border-accent/30"
                : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-text/60 w-4">{row.rank}</span>
              <TeamLink
                teamId={row.teamId}
                sourceComponent="team_overview_snapshot"
                className="text-sm hover:text-accent transition-colors"
              >
                {row.tricode}
              </TeamLink>
            </div>
            <span className="text-xs text-text/70">
              {row.wins}-{row.losses}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderScheduleContent = () => {
    if (schedule.loading && !schedule.data) {
      return <p className="text-text/60 text-sm">Loading schedule...</p>;
    }

    if (schedule.error && !schedule.data) {
      return <p className="text-red-300 text-sm">{schedule.error}</p>;
    }

    if (!schedule.data?.games.length) {
      return (
        <p className="text-text/60 text-sm">
          No upcoming games in this season.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {schedule.data.games.map((game) => (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:bg-white/5 transition-colors block"
          >
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {game.awayTeamTricode ?? game.awayTeamName ?? "Away"} @{" "}
                  {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
                </p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-text/70 uppercase tracking-wide">
                  {game.status}
                </span>
              </div>
              <p className="text-[11px] text-text/50 mt-1">
                {game.awayTeamName ?? game.awayTeamTricode ?? "Away Team"} at{" "}
                {game.homeTeamName ?? game.homeTeamTricode ?? "Home Team"}
              </p>
              <p className="text-xs text-text/65 mt-1">
                {game.gameDateDisplay ?? game.gameDate} ·{" "}
                {game.gameTimeDisplay ?? game.gameTime ?? "TBD"}
              </p>
            </>
          </Link>
        ))}
      </div>
    );
  };

  const renderResultsContent = () => {
    if (results.loading && !results.data) {
      return <p className="text-text/60 text-sm">Loading results...</p>;
    }

    if (results.error && !results.data) {
      return <p className="text-red-300 text-sm">{results.error}</p>;
    }

    if (!results.data?.games.length) {
      return (
        <p className="text-text/60 text-sm">
          No completed games in this season yet.
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {results.data.games.map((game) => (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:bg-white/5 transition-colors block"
          >
            <>
              <p className="text-sm font-semibold">
                {game.awayTeamTricode ?? game.awayTeamName ?? "Away"} @{" "}
                {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
              </p>
              <p className="text-[11px] text-text/50 mt-1">
                {game.awayTeamName ?? game.awayTeamTricode ?? "Away Team"} at{" "}
                {game.homeTeamName ?? game.homeTeamTricode ?? "Home Team"}
              </p>
              <p className="text-xs text-text/65 mt-1">
                {game.gameDateDisplay ?? game.gameDate}
              </p>
            </>
            <div className="mt-1 flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  game.result === "W" ? "text-green-300" : "text-red-300"
                }`}
              >
                {game.result}
              </span>
              <span className="text-sm text-text/75 font-mono">
                {game.finalScore ??
                  (game.homeTeamScore !== undefined &&
                  game.awayTeamScore !== undefined
                    ? `${game.homeTeamScore}-${game.awayTeamScore}`
                    : "--")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <section className="mb-6">
      <div className="glass-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={
                data.logoUrl ??
                `https://cdn.nba.com/logos/nba/${data.teamId}/primary/L/logo.svg`
              }
              alt={`${data.city} ${data.name}`}
              className="w-16 h-16 md:w-20 md:h-20 object-contain"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-display">
                {data.city} {data.name}
              </h1>
              <p className="text-text/70 text-sm md:text-base">
                {data.record.wins}-{data.record.losses} (
                {(data.record.winPct * 100).toFixed(1)}%)
              </p>
              <p className="text-text/60 text-xs mt-1">
                Conf #{data.ranks.conferenceRank} | Div #
                {data.ranks.divisionRank} | {data.streak}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-text/60 mb-2">
            Recent Form
          </p>
          {!data.recentForm.length ? (
            <p className="text-text/50 text-xs">No recent form available</p>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {data.recentForm.map((value, idx) => (
                <span
                  key={`${value}-${idx}`}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    value === "W"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {renderSnapshot(
            "Conference Snapshot",
            data.standingsSnapshot.conference,
          )}
          <div className="glass-card p-4 h-[360px] flex flex-col">
            <h3 className="text-xs uppercase tracking-wider text-text/70 mb-3">
              Results
            </h3>
            <div className="overflow-y-auto pr-1">{renderResultsContent()}</div>
          </div>
          <div className="glass-card p-4 h-[360px] flex flex-col">
            <h3 className="text-xs uppercase tracking-wider text-text/70 mb-3">
              Schedule
            </h3>
            <div className="overflow-y-auto pr-1">
              {renderScheduleContent()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const STAT_COLUMNS: Array<{ key: keyof TeamStatsStandardRow; label: string }> =
  [
    { key: "GP", label: "GP" },
    { key: "PPG", label: "PPG" },
    { key: "RPG", label: "RPG" },
    { key: "APG", label: "APG" },
    { key: "BPG", label: "BPG" },
    { key: "SPG", label: "SPG" },
    { key: "TOV", label: "TOV" },
    { key: "ORPG", label: "ORPG" },
    { key: "DRPG", label: "DRPG" },
    { key: "FG_PCT", label: "FG%" },
    { key: "FG3_PCT", label: "3P%" },
    { key: "FT_PCT", label: "FT%" },
    { key: "FG3A", label: "3PA" },
    { key: "FG3M", label: "3PM" },
    { key: "FGA", label: "FGA" },
    { key: "FGM", label: "FGM" },
    { key: "FTA", label: "FTA" },
    { key: "FTM", label: "FTM" },
    { key: "PF", label: "PF" },
  ];

const OPP_STAT_COLUMNS: Array<{
  key: keyof TeamStatsStandardRow;
  label: string;
}> = STAT_COLUMNS.map((column) => ({
  key: column.key,
  label: `Opp ${column.label}`,
}));

const ADV_COLUMNS: Array<{ key: keyof TeamStatsAdvancedRow; label: string }> = [
  { key: "ORtg", label: "ORtg" },
  { key: "DRtg", label: "DRtg" },
  { key: "Pace", label: "Pace" },
  { key: "eFG_PCT", label: "eFG%" },
  { key: "Opp_eFG_PCT", label: "Opp eFG%" },
  { key: "DRB_PCT", label: "DRB%" },
  { key: "ORB_PCT", label: "ORB%" },
  { key: "TOV_PCT", label: "TOV%" },
  { key: "Opp_TOV_PCT", label: "Opp TOV%" },
];

function TeamStatsTable({
  title,
  columns,
  row,
}: {
  title: string;
  columns: Array<{ key: string; label: string }>;
  row: Record<string, string | number>;
}) {
  return (
    <div className="glass-card overflow-auto">
      <h3 className="text-xs uppercase tracking-wider text-text/70 px-4 py-3 border-b border-white/10">
        {title}
      </h3>
      <table className="w-full min-w-[1040px] text-left">
        <thead className="text-xs uppercase text-text/60 bg-white/[0.03]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10 hover:bg-white/5">
            {columns.map((column) => (
              <td key={column.key} className="px-3 py-2 font-mono text-sm">
                {row[column.key] ?? "--"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TeamStatsInline({ data }: { data: TeamStatsData }) {
  if (data.tables) {
    return (
      <div className="space-y-4">
        <TeamStatsTable
          title="Team Stats - Per Game"
          columns={STAT_COLUMNS}
          row={
            data.tables.teamPerGame as unknown as Record<
              string,
              string | number
            >
          }
        />
        <TeamStatsTable
          title="Team Stats - Totals"
          columns={STAT_COLUMNS}
          row={
            data.tables.teamTotals as unknown as Record<string, string | number>
          }
        />
        <TeamStatsTable
          title="Opponent Team Stats - Per Game"
          columns={OPP_STAT_COLUMNS}
          row={
            data.tables.opponentPerGame as unknown as Record<
              string,
              string | number
            >
          }
        />
        <TeamStatsTable
          title="Advanced Stats"
          columns={ADV_COLUMNS}
          row={
            data.tables.advanced as unknown as Record<string, string | number>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metricLabels.map((metric) => (
          <div key={metric.label} className="glass-card p-3 text-center">
            <p className="text-[11px] text-text/60 tracking-wider uppercase">
              {metric.label}
            </p>
            <p className="text-2xl font-mono">{metric.value(data)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-text/70 mb-2">
            Team Record
          </h3>
          <p className="text-lg font-semibold">
            {data.teamMetrics.wins}-{data.teamMetrics.losses}
          </p>
          <p className="text-sm text-text/60 mt-1">
            Games Played: {data.teamMetrics.gamesPlayed}
          </p>
        </div>
        <div className="glass-card p-4">
          <h3 className="text-xs uppercase tracking-wider text-text/70 mb-2">
            Home / Away
          </h3>
          <p className="text-sm text-text/80">
            Home: {data.homeAwaySplits?.home.wins ?? 0}-
            {data.homeAwaySplits?.home.losses ?? 0}
          </p>
          <p className="text-sm text-text/80 mt-1">
            Away: {data.homeAwaySplits?.away.wins ?? 0}-
            {data.homeAwaySplits?.away.losses ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamPlayerStatsInline({ data }: { data: TeamStatsData }) {
  const [sortBy, setSortBy] = useState<SortKey>("points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    const cloned = [...data.playerStats];
    return cloned.sort((a, b) => {
      const aVal = Number(a[sortBy] ?? 0);
      const bVal = Number(b[sortBy] ?? 0);
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [data.playerStats, sortBy, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortDirection("desc");
  };

  if (!data.playerStats.length) {
    return (
      <EmptyState
        title="No stats available"
        subtitle="Stats feed has no rows for this team right now."
      />
    );
  }

  return (
    <div className="glass-card overflow-auto">
      <table className="w-full text-left min-w-[780px]">
        <thead className="text-xs uppercase text-text/60 border-b border-white/10">
          <tr>
            <th className="px-3 py-2">Player</th>
            <th
              className="px-3 py-2 cursor-pointer"
              onClick={() => handleSort("points")}
            >
              PTS
            </th>
            <th
              className="px-3 py-2 cursor-pointer"
              onClick={() => handleSort("rebounds")}
            >
              REB
            </th>
            <th
              className="px-3 py-2 cursor-pointer"
              onClick={() => handleSort("assists")}
            >
              AST
            </th>
            <th
              className="px-3 py-2 cursor-pointer"
              onClick={() => handleSort("steals")}
            >
              STL
            </th>
            <th
              className="px-3 py-2 cursor-pointer"
              onClick={() => handleSort("blocks")}
            >
              BLK
            </th>
            <th className="px-3 py-2">FG%</th>
            <th className="px-3 py-2">3P%</th>
            <th className="px-3 py-2">FT%</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.playerId}
              className="border-b border-white/5 hover:bg-white/5"
            >
              <td className="px-3 py-2">{row.playerName}</td>
              <td className="px-3 py-2 font-mono">{row.points.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono">{row.rebounds.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono">{row.assists.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono">{row.steals.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono">{row.blocks.toFixed(1)}</td>
              <td className="px-3 py-2 font-mono">
                {(row.fgPct * 100).toFixed(1)}%
              </td>
              <td className="px-3 py-2 font-mono">
                {(row.threePtPct * 100).toFixed(1)}%
              </td>
              <td className="px-3 py-2 font-mono">
                {(row.ftPct * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRosterInline({ data }: { data: TeamRosterData }) {
  if (!data.players.length) {
    return (
      <EmptyState
        title="Roster unavailable"
        subtitle="No roster rows are currently available."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {data.players.map((player) => (
        <div
          key={player.playerId}
          className="glass-card p-3 flex items-center gap-3"
        >
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.playerId}.png`}
            alt={player.playerName}
            className="w-14 h-14 rounded-full object-cover bg-white/10"
            onError={(event) => {
              (event.target as HTMLImageElement).src =
                "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
            }}
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">{player.playerName}</p>
            <p className="text-xs text-text/60">
              #{player.jersey || "--"} | {player.position || "N/A"} |{" "}
              {player.status || "Unknown"}
            </p>
            <p className="text-xs text-text/50 mt-1">
              {player.height || "N/A"} | {player.weight || "N/A"} | EXP{" "}
              {player.experience || "0"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamScheduleInline({
  data,
  onGameClick,
}: {
  data: TeamScheduleData;
  onGameClick?: (gameId: string) => void;
}) {
  if (!data.games.length) {
    return (
      <EmptyState
        title="No upcoming games"
        subtitle="There are no scheduled games for this range."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {data.games.map((game) => (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            onClick={() => onGameClick?.(game.gameId)}
            className="glass-card p-3 flex items-center justify-between hover:bg-white/10 transition-colors rounded-xl"
          >
            <div>
              <p className="text-sm font-semibold">
                {game.awayTeamTricode ??
                  game.awayTeamName ??
                  game.opponentTricode}{" "}
                @ {game.homeTeamTricode ?? game.homeTeamName ?? "TBD"}
              </p>
              <p className="text-[11px] text-text/50 mt-0.5">
                {game.awayTeamName ?? game.awayTeamTricode ?? "Away Team"} at{" "}
                {game.homeTeamName ?? game.homeTeamTricode ?? "Home Team"}
              </p>
              <p className="text-xs text-text/60">
                {(game.gameDateDisplay ?? game.gameDate) + " · "}
                {game.gameTimeDisplay ?? game.gameTime ?? "TBD"}
              </p>
            </div>
            <span className="text-xs text-text/60">{game.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TeamResultsInline({
  data,
  onGameClick,
}: {
  data: TeamResultsData;
  onGameClick?: (gameId: string) => void;
}) {
  if (!data.games.length) {
    return (
      <EmptyState
        title="No recent results"
        subtitle="No completed games for this range."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {data.games.map((game) => (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            onClick={() => onGameClick?.(game.gameId)}
            className="glass-card p-3 flex items-center justify-between hover:bg-white/10 transition-colors rounded-xl"
          >
            <div>
              <p className="text-sm font-semibold">
                {game.awayTeamTricode ??
                  game.awayTeamName ??
                  game.opponentTricode}{" "}
                @ {game.homeTeamTricode ?? game.homeTeamName ?? "TBD"}
              </p>
              <p className="text-[11px] text-text/50 mt-0.5">
                {game.awayTeamName ?? game.awayTeamTricode ?? "Away Team"} at{" "}
                {game.homeTeamName ?? game.homeTeamTricode ?? "Home Team"}
              </p>
              <p className="text-xs text-text/60">
                {game.gameDateDisplay ?? game.gameDate}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-bold px-2 py-0.5 rounded-full ${game.result === "W" ? "text-green-300" : "text-red-300"}`}
              >
                {game.result}
              </p>
              <p className="text-sm text-text/75 font-mono">
                {game.finalScore ??
                  (game.homeTeamScore !== undefined &&
                  game.awayTeamScore !== undefined
                    ? `${game.homeTeamScore}-${game.awayTeamScore}`
                    : "--")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const isSectionError = (payload: unknown): payload is TeamApiError => {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload &&
    "section" in payload,
  );
};

export default function TeamPageClient({
  teamId,
  initialTab,
  initialOverview,
}: TeamPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TeamTab>(initialTab);

  const [overview, setOverview] = useState<SectionState<TeamOverviewData>>({
    data: initialOverview,
    loading: !initialOverview,
    error: null,
  });

  const [stats, setStats] = useState<SectionState<TeamStatsData>>({
    data: null,
    loading: true,
    error: null,
  });
  const [roster, setRoster] = useState<SectionState<TeamRosterData>>({
    data: null,
    loading: true,
    error: null,
  });
  const [schedule, setSchedule] = useState<SectionState<TeamScheduleData>>({
    data: null,
    loading: true,
    error: null,
  });
  const [results, setResults] = useState<SectionState<TeamResultsData>>({
    data: null,
    loading: true,
    error: null,
  });

  const syncQuery = (next: { tab?: TeamTab }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab) params.set("tab", next.tab);
    router.replace(`/team/${teamId}?${params.toString()}`);
  };

  const querySignature = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    const tab = parseTab(searchParams.get("tab"));

    setActiveTab(tab);
  }, [querySignature]);

  useEffect(() => {
    const rawTab = searchParams.get("tab");

    const normalizedTab = parseTab(rawTab);

    const shouldNormalize = rawTab !== normalizedTab;

    if (shouldNormalize) {
      syncQuery({
        tab: normalizedTab,
      });
    }
  }, [querySignature]);

  const setSectionFromPayload = <T,>(
    setState: Dispatch<SetStateAction<SectionState<T>>>,
    sectionPayload: T | TeamApiError,
    preserve = false,
  ) => {
    if (isSectionError(sectionPayload)) {
      setState((prev) => ({
        data: preserve ? prev.data : null,
        loading: false,
        error: sectionPayload.message,
      }));
      return;
    }

    setState({ data: sectionPayload, loading: false, error: null });
  };

  const fetchTeamPagePayload = async (preserveOverview = true) => {
    const include: TeamSection[] = ["overview", "schedule", "results"];
    if (activeTab === "roster") {
      include.push("roster");
    } else {
      include.push("stats");
    }

    const includeSet = new Set<TeamSection>(include);

    setOverview((prev) => ({
      data: preserveOverview ? prev.data : null,
      loading: includeSet.has("overview"),
      error: null,
    }));
    setStats((prev) => ({
      data: prev.data,
      loading: includeSet.has("stats"),
      error: null,
    }));
    setRoster((prev) => ({
      data: prev.data,
      loading: includeSet.has("roster"),
      error: null,
    }));
    setSchedule((prev) => ({
      data: prev.data,
      loading: includeSet.has("schedule"),
      error: null,
    }));
    setResults((prev) => ({
      data: prev.data,
      loading: includeSet.has("results"),
      error: null,
    }));

    try {
      const response = await axios.get<TeamPagePayload>(
        `/api/teams/${teamId}?tab=${activeTab}&include=${include.join(",")}`,
      );
      const payload = response.data;

      if (payload.overview) {
        setSectionFromPayload(setOverview, payload.overview, true);
      } else {
        setOverview((prev) => ({ ...prev, loading: false }));
      }

      if (payload.stats) {
        setSectionFromPayload(setStats, payload.stats);
      } else {
        setStats((prev) => ({ ...prev, loading: false }));
      }

      if (payload.roster) {
        setSectionFromPayload(setRoster, payload.roster);
      } else {
        setRoster((prev) => ({ ...prev, loading: false }));
      }

      if (payload.schedule) {
        setSectionFromPayload(setSchedule, payload.schedule);
      } else {
        setSchedule((prev) => ({ ...prev, loading: false }));
      }

      if (payload.results) {
        setSectionFromPayload(setResults, payload.results);
      } else {
        setResults((prev) => ({ ...prev, loading: false }));
      }
    } catch (error: any) {
      const message =
        "We could not load this team page right now. Please try again in a moment.";

      setOverview((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
      setStats((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
      setRoster((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
      setSchedule((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
      setResults((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
    }
  };

  useEffect(() => {
    trackEvent("team_page_view", { teamId, tab: activeTab });
  }, [teamId]);

  useEffect(() => {
    fetchTeamPagePayload(true);
  }, [teamId, activeTab]);

  const handleTabChange = (tab: TeamTab) => {
    setActiveTab(tab);
    syncQuery({ tab });
    trackEvent("team_tab_change", { teamId, tab });
  };

  return (
    <div className="space-y-4 pb-6">
      {overview.loading && !overview.data ? (
        <div className="py-10">
          <Loading text="Loading team overview..." />
        </div>
      ) : overview.error || !overview.data ? (
        <SectionError
          title="Overview unavailable"
          message={overview.error ?? "Team overview failed to load."}
          onRetry={() => fetchTeamPagePayload(false)}
        />
      ) : (
        <TeamOverviewInline
          data={overview.data}
          schedule={schedule}
          results={results}
        />
      )}

      <div className="flex justify-start">
        <div className="glass rounded-xl p-1 flex flex-wrap gap-1 w-full md:w-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm transition-colors ${
                tab.id === activeTab
                  ? "bg-accent text-text"
                  : "text-text/70 hover:text-text hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "team-stats" && (
        <>
          {stats.loading && !stats.data ? (
            <Loading text="Loading team stats..." />
          ) : null}
          {stats.error ? (
            <SectionError
              title="Team stats unavailable"
              message={stats.error}
              onRetry={() => fetchTeamPagePayload(true)}
            />
          ) : null}
          {stats.data ? <TeamStatsInline data={stats.data} /> : null}
        </>
      )}

      {activeTab === "player-stats" && (
        <>
          {stats.loading && !stats.data ? (
            <Loading text="Loading player stats..." />
          ) : null}
          {stats.error ? (
            <SectionError
              title="Player stats unavailable"
              message={stats.error}
              onRetry={() => fetchTeamPagePayload(true)}
            />
          ) : null}
          {stats.data ? <TeamPlayerStatsInline data={stats.data} /> : null}
        </>
      )}

      {activeTab === "roster" && (
        <>
          {roster.loading && !roster.data ? (
            <Loading text="Loading roster..." />
          ) : null}
          {roster.error ? (
            <SectionError
              title="Roster unavailable"
              message={roster.error}
              onRetry={() => fetchTeamPagePayload(true)}
            />
          ) : null}
          {roster.data ? <TeamRosterInline data={roster.data} /> : null}
        </>
      )}
    </div>
  );
}
