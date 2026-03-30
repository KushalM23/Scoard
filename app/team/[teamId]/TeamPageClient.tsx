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
import { motion } from "framer-motion";
import { ArrowUpDown } from "lucide-react";
import Loading from "@/app/components/Loading";
import TeamLink from "@/app/components/TeamLink";
import { trackEvent } from "@/app/lib/analytics";
import { parseTab } from "@/app/lib/teams";
import type {
  TeamOverviewData,
  TeamRosterData,
  TeamScheduleData,
  TeamStatsData,
  TeamStatsPlayerRow,
  TeamStatsStandardRow,
  TeamStatsOpponentRow,
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
      <p className="text-red-400 font-display text-sm tracking-wider uppercase">
        {title}
      </p>
      <p className="text-text/70 text-sm">
        {message ?? "This section is temporarily unavailable."}
      </p>
      {onRetry && (
        <button
          type="button"
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
  const panelHeightClass = "h-[250px] md:h-[372px]";
  const snapshotPanelHeightClass = "h-[292px] md:h-[372px]";

  const formatGameDate = (rawDate: string, display?: string) => {
    if (display) return display;

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return rawDate;
    }

    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const streakClass = /^W/i.test(data.streak)
    ? "text-green-300"
    : /^L/i.test(data.streak)
      ? "text-red-400"
      : "text-text/80";

  const formatScoreLine = (game: TeamResultsData["games"][number]) => {
    if (
      typeof game.homeTeamScore === "number" &&
      typeof game.awayTeamScore === "number"
    ) {
      return `${game.homeTeamScore} - ${game.awayTeamScore}`;
    }

    return game.finalScore ?? "--";
  };

  const getSelectedTeamPresentation = (
    game: TeamResultsData["games"][number],
  ) => {
    const isSelectedHome =
      game.homeAway === "Home" || Number(game.homeTeamId) === data.teamId;
    const didSelectedWin = game.result === "W";
    const selectedTone = didSelectedWin ? "text-green-300" : "text-red-400";

    return {
      isSelectedHome,
      selectedTone,
      homeTeamTone: isSelectedHome ? selectedTone : "text-text/95",
      awayTeamTone: isSelectedHome ? "text-text/95" : selectedTone,
      homeScoreTone: isSelectedHome ? selectedTone : "text-text",
      awayScoreTone: isSelectedHome ? "text-text" : selectedTone,
    };
  };

  const getScoreParts = (game: TeamResultsData["games"][number]) => {
    if (
      typeof game.homeTeamScore === "number" &&
      typeof game.awayTeamScore === "number"
    ) {
      return {
        home: String(game.homeTeamScore),
        away: String(game.awayTeamScore),
      };
    }

    const fallback = formatScoreLine(game)
      .split("-")
      .map((part) => part.trim());
    if (fallback.length === 2) {
      return {
        home: fallback[0],
        away: fallback[1],
      };
    }

    return {
      home: "--",
      away: "--",
    };
  };

  const renderSnapshot = (
    title: string,
    rows: TeamOverviewData["standingsSnapshot"]["conference"],
  ) => (
    <div
      className={`rounded-2xl border border-white/10 bg-background/20 p-4 ${snapshotPanelHeightClass} flex flex-col`}
    >
      <h3 className="text-sm uppercase tracking-wider text-text/70 mb-3 font-semibold">
        {title}
      </h3>
      <div className="flex flex-col gap-2 h-full">
        {rows.map((row, index) => (
          <div
            key={`${title}-${row.teamId}`}
            className={`${index > 4 ? "hidden md:flex" : "flex"} md:flex-1 md:min-h-0 items-center justify-between rounded-lg px-2.5 py-2 md:py-1.5 ${
              row.teamId === data.teamId
                ? "bg-accent/20 border border-accent/30"
                : ""
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
      return (
        <div className="flex items-center justify-center py-6">
          <Loading size={24} className="p-0" showText={false} />
        </div>
      );
    }

    if (schedule.error && !schedule.data) {
      return <p className="text-red-400 text-sm">{schedule.error}</p>;
    }

    if (!schedule.data?.games.length) {
      return (
        <p className="text-text/60 text-sm">
          No upcoming games in this season.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {schedule.data.games.map((game) => (
          <Link
            key={game.gameId}
            href={`/game/${game.gameId}`}
            className="rounded-xl border border-white/10 bg-background/35 p-4 hover:bg-background/50 transition-colors block"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-text/95 w-1/3 text-base md:text-xl font-display">
                {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
              </span>
              <span className="text-text/60 text-sm uppercase tracking-wide w-1/3 text-center">
                vs
              </span>
              <span className="text-text/95 text-right w-1/3 text-base md:text-xl font-display">
                {game.awayTeamTricode ?? game.awayTeamName ?? "Away"}
              </span>
            </div>
            <p className="text-sm text-text/70 mt-2 text-center">
              {formatGameDate(game.gameDate, game.gameDateDisplay)} ·{" "}
              {game.gameTimeDisplay ?? game.gameTime ?? "TBD"}
            </p>
          </Link>
        ))}
      </div>
    );
  };

  const renderResultsContent = () => {
    if (results.loading && !results.data) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loading size={24} className="p-0" showText={false} />
        </div>
      );
    }

    if (results.error && !results.data) {
      return <p className="text-red-400 text-sm">{results.error}</p>;
    }

    if (!results.data?.games.length) {
      return (
        <p className="text-text/60 text-sm">
          No completed games in this season yet.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {results.data.games.map((game) => {
          const tone = getSelectedTeamPresentation(game);
          const scores = getScoreParts(game);

          return (
            <Link
              key={game.gameId}
              href={`/game/${game.gameId}`}
              className="rounded-xl border border-white/10 bg-background/35 p-4 hover:bg-background/50 transition-colors block"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`${tone.homeTeamTone} w-1/3 text-base md:text-xl font-display`}
                >
                  {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
                </span>
                <div className="w-1/3 flex items-center justify-center gap-2 md:gap-3 leading-none font-mono text-2xl md:text-3xl font-bold">
                  <span className={tone.homeScoreTone}>{scores.home}</span>
                  <span className="text-text/50">-</span>
                  <span className={tone.awayScoreTone}>{scores.away}</span>
                </div>
                <span
                  className={`${tone.awayTeamTone} text-right w-1/3 text-base md:text-xl font-display`}
                >
                  {game.awayTeamTricode ?? game.awayTeamName ?? "Away"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-sm text-text/70">
                  {formatGameDate(game.gameDate, game.gameDateDisplay)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <section className="mb-6">
      <div className="glass-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={
                data.logoUrl ??
                `https://cdn.nba.com/logos/nba/${data.teamId}/primary/L/logo.svg`
              }
              alt={`${data.city} ${data.name}`}
              className="w-16 h-16 md:w-20 md:h-20 object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-display leading-tight truncate">
                {data.city}
              </h1>
              <h2 className="text-2xl md:text-3xl font-display leading-tight truncate">
                {data.name}
              </h2>
            </div>
          </div>

          <div className="hidden md:block w-full md:w-auto md:min-w-[320px] lg:min-w-[360px]">
            <div className="flex items-center justify-center md:justify-end gap-2 font-bold text-xs md:text-lg text-text/80">
              <span>
                {data.record.wins}-{data.record.losses}
              </span>
              <span className="text-text/30">|</span>
              <span className={streakClass}>{data.streak}</span>
            </div>
            <div className="flex items-center justify-center md:justify-end gap-2 font-bold text-xs md:text-lg text-text/80 mt-1">
              <span>Conf #{data.ranks.conferenceRank}</span>
              <span className="text-text/30">|</span>
              <span>Div #{data.ranks.divisionRank}</span>
            </div>
          </div>
        </div>

        <div className="md:hidden mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-text/60">
              Record
            </p>
            <p className="text-base font-semibold mt-1">
              {data.record.wins}-{data.record.losses}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-text/60">
              Streak
            </p>
            <p className={`text-base font-semibold mt-1 ${streakClass}`}>
              {data.streak}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-text/60">
              Conference
            </p>
            <p className="text-sm font-semibold mt-1">
              #{data.ranks.conferenceRank}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-background/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-text/60">
              Division
            </p>
            <p className="text-sm font-semibold mt-1">
              #{data.ranks.divisionRank}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div
            className={`rounded-2xl border border-white/10 bg-background/20 p-4 ${panelHeightClass} flex flex-col`}
          >
            <h3 className="text-sm uppercase tracking-wider text-text/70 mb-3 font-semibold">
              Results
            </h3>
            <div className="overflow-y-auto pr-1">{renderResultsContent()}</div>
          </div>
          <div
            className={`rounded-2xl border border-white/10 bg-background/20 p-4 ${panelHeightClass} flex flex-col`}
          >
            <h3 className="text-sm uppercase tracking-wider text-text/70 mb-3 font-semibold">
              Schedule
            </h3>
            <div className="overflow-y-auto pr-1">
              {renderScheduleContent()}
            </div>
          </div>
          {renderSnapshot(
            "Conference Snapshot",
            data.standingsSnapshot.conference,
          )}
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

const TOTAL_STAT_COLUMNS: Array<{
  key: keyof TeamStatsStandardRow;
  label: string;
}> = [
  { key: "GP", label: "GP" },
  { key: "PPG", label: "PTS" },
  { key: "RPG", label: "REB" },
  { key: "APG", label: "AST" },
  { key: "BPG", label: "BLK" },
  { key: "SPG", label: "STL" },
  { key: "TOV", label: "TOV" },
  { key: "ORPG", label: "OREB" },
  { key: "DRPG", label: "DREB" },
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

const OPP_STAT_KEYS: Array<keyof TeamStatsOpponentRow> = [
  "PPG",
  "RPG",
  "APG",
  "BPG",
  "SPG",
  "TOV",
  "ORPG",
  "DRPG",
  "FG_PCT",
  "FG3_PCT",
  "FT_PCT",
  "FG3A",
  "FG3M",
  "FGA",
  "FGM",
  "FTA",
  "FTM",
  "PF",
];

const OPP_STAT_COLUMNS: Array<{
  key: keyof TeamStatsOpponentRow;
  label: string;
}> = OPP_STAT_KEYS.map((key) => {
  const baseLabel =
    STAT_COLUMNS.find((column) => column.key === key)?.label ?? key;
  return {
    key,
    label: `Opp ${baseLabel}`,
  };
});

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
  const tableMinWidthClass =
    columns.length <= 10 ? "min-w-[760px]" : "min-w-[1160px]";

  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
        {title}
      </h3>
      <div className="glass-card overflow-auto rounded-2xl">
        <table className={`w-full ${tableMinWidthClass} text-center`}>
          <thead className="text-sm uppercase text-text/70 bg-white/[0.03]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-4 font-semibold whitespace-nowrap text-center"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10 hover:bg-white/5">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-5 py-4 font-mono text-base md:text-lg whitespace-nowrap text-center"
                >
                  {row[column.key] ?? "--"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamStatsInline({ data }: { data: TeamStatsData }) {
  if (data.tables) {
    return (
      <div className="space-y-6">
        <TeamStatsTable
          title="Per Game"
          columns={STAT_COLUMNS}
          row={
            data.tables.teamPerGame as unknown as Record<
              string,
              string | number
            >
          }
        />
        <TeamStatsTable
          title="Totals"
          columns={TOTAL_STAT_COLUMNS}
          row={
            data.tables.teamTotals as unknown as Record<string, string | number>
          }
        />
        <TeamStatsTable
          title="Opponent Team Stats"
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricLabels.map((metric) => (
          <div
            key={metric.label}
            className="glass-card p-4 text-center rounded-xl"
          >
            <p className="text-[11px] text-text/60 tracking-wider uppercase">
              {metric.label}
            </p>
            <p className="text-2xl font-mono">{metric.value(data)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-xl">
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
        <div className="glass-card p-5 rounded-xl">
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

  const statColumns: Array<{
    key: SortKey;
    label: string;
    format?: (value: number) => string;
  }> = [
    { key: "points", label: "PTS" },
    { key: "rebounds", label: "REB" },
    { key: "assists", label: "AST" },
    { key: "steals", label: "STL" },
    { key: "blocks", label: "BLK" },
    {
      key: "fgPct",
      label: "FG%",
      format: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      key: "threePtPct",
      label: "3P%",
      format: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      key: "ftPct",
      label: "FT%",
      format: (value) => `${(value * 100).toFixed(1)}%`,
    },
    { key: "fgm", label: "FGM" },
    { key: "fga", label: "FGA" },
    { key: "threePtM", label: "3PM" },
    { key: "threePtA", label: "3PA" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "turnovers", label: "TOV" },
    { key: "fouls", label: "PF" },
    { key: "oReb", label: "OREB" },
    { key: "dReb", label: "DREB" },
  ];

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
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Player Stats - Per Game
        </h3>
        <div className="glass-card overflow-auto rounded-2xl">
          <table className="w-full min-w-[1160px] text-center">
            <thead className="text-sm uppercase text-text/70 bg-white/[0.03]">
              <tr>
                <th className="px-5 py-4 font-semibold whitespace-nowrap text-left">
                  Player
                </th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap text-center">
                  GP
                </th>
                <th className="px-5 py-4 font-semibold whitespace-nowrap text-center">
                  MIN
                </th>
                {statColumns.map((column) => (
                  <th
                    key={column.key}
                    className="px-5 py-4 font-semibold whitespace-nowrap text-center cursor-pointer"
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${sortBy === column.key ? "text-accent" : "text-text/35"}`}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row: TeamStatsPlayerRow) => (
                <tr
                  key={row.playerId}
                  className="border-t border-white/10 hover:bg-white/5"
                >
                  <td className="px-5 py-4 text-left text-base md:text-lg font-semibold whitespace-nowrap">
                    {row.playerName}
                  </td>
                  <td className="px-5 py-4 font-mono text-base md:text-lg whitespace-nowrap text-center">
                    {row.gamesPlayed}
                  </td>
                  <td className="px-5 py-4 font-mono text-base md:text-lg whitespace-nowrap text-center">
                    {row.minutes.toFixed(1)}
                  </td>
                  {statColumns.map((column) => {
                    const raw = Number(row[column.key] ?? 0);
                    const value = column.format
                      ? column.format(raw)
                      : raw.toFixed(1);

                    return (
                      <td
                        key={`${row.playerId}-${column.key}`}
                        className="px-5 py-4 font-mono text-base md:text-lg whitespace-nowrap text-center"
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
      {data.players.map((player) =>
        (() => {
          const detailLine = [
            `#${player.jersey || "--"}`,
            player.position || "N/A",
            typeof player.age === "number" ? `${player.age}` : null,
          ]
            .filter(Boolean)
            .join(" | ");

          return (
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
                <p className="text-xs text-text/60">{detailLine}</p>
                <p className="text-xs text-text/50 mt-1">
                  {player.height || "N/A"} | {player.weight || "N/A"} | EXP{" "}
                  {player.experience || "0"}
                </p>
              </div>
            </div>
          );
        })(),
      )}
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
  const [activeTab, setActiveTab] = useState<TeamTab>(initialTab);

  const [overview, setOverview] = useState<SectionState<TeamOverviewData>>({
    data: initialOverview,
    loading: !initialOverview,
    error: null,
  });

  const [stats, setStats] = useState<SectionState<TeamStatsData>>({
    data: null,
    loading: initialTab !== "roster",
    error: null,
  });
  const [roster, setRoster] = useState<SectionState<TeamRosterData>>({
    data: null,
    loading: initialTab === "roster",
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

  const syncTabToUrl = (tab: TeamTab) => {
    if (typeof window === "undefined") return;

    const currentScrollY = window.scrollY;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    window.history.replaceState(
      window.history.state,
      "",
      `/team/${teamId}?${params.toString()}`,
    );

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: currentScrollY });
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const tab = parseTab(
        new URLSearchParams(window.location.search).get("tab"),
      );
      setActiveTab(tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const fetchTeamPagePayload = async (
    include: TeamSection[],
    preserveOverview = true,
  ) => {
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
    setOverview({
      data: initialOverview,
      loading: !initialOverview,
      error: null,
    });
    setSchedule({ data: null, loading: true, error: null });
    setResults({ data: null, loading: true, error: null });
    setStats({ data: null, loading: activeTab !== "roster", error: null });
    setRoster({ data: null, loading: activeTab === "roster", error: null });

    const include: TeamSection[] = ["overview", "schedule", "results"];
    if (activeTab === "roster") {
      include.push("roster");
    } else {
      include.push("stats");
    }

    fetchTeamPagePayload(include, true);
  }, [teamId, initialOverview]);

  useEffect(() => {
    if (activeTab === "roster") {
      if (!roster.data && !roster.loading) {
        fetchTeamPagePayload(["roster"], true);
      }
      return;
    }

    if (!stats.data && !stats.loading) {
      fetchTeamPagePayload(["stats"], true);
    }
  }, [activeTab, stats.data, stats.loading, roster.data, roster.loading]);

  const handleTabChange = (tab: TeamTab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    syncTabToUrl(tab);
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
          onRetry={() =>
            fetchTeamPagePayload(["overview", "schedule", "results"], false)
          }
        />
      ) : (
        <TeamOverviewInline
          data={overview.data}
          schedule={schedule}
          results={results}
        />
      )}

      <div className="flex justify-center">
        <div className="bg-transparent rounded-xl p-1 flex gap-1 md:gap-2 relative w-full md:w-auto justify-between md:justify-center">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg font-display text-xs md:text-sm transition-colors duration-300 tracking-wide z-10 whitespace-nowrap ${
                tab.id === activeTab
                  ? "text-text"
                  : "text-text/60 hover:text-text"
              }`}
            >
              {tab.id === activeTab && (
                <motion.div
                  layoutId="activeTeamTab"
                  className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 uppercase">{tab.label}</span>
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
              onRetry={() => fetchTeamPagePayload(["stats"], true)}
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
              onRetry={() => fetchTeamPagePayload(["stats"], true)}
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
              onRetry={() => fetchTeamPagePayload(["roster"], true)}
            />
          ) : null}
          {roster.data ? <TeamRosterInline data={roster.data} /> : null}
        </>
      )}
    </div>
  );
}
