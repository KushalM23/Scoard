"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { motion } from "framer-motion";
import Loading from "@/app/components/Loading";
import PlayerLink from "@/app/components/PlayerLink";
import TeamLink from "@/app/components/TeamLink";
import { parsePlayerTab } from "@/app/lib/players";
import { trackEvent } from "@/app/lib/analytics";
import type {
  PlayerApiError,
  PlayerGameLogData,
  PlayerHeaderData,
  PlayerOverviewData,
  PlayerPagePayload,
  PlayerSection,
  PlayerStatsData,
  PlayerTab,
} from "@/app/types/player";

interface PlayerPageClientProps {
  playerId: number;
  initialTab: PlayerTab;
  initialHeader: PlayerHeaderData | null;
}

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const TABS: Array<{ id: PlayerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Stats" },
  { id: "game-log", label: "Game Log" },
];

const isSectionError = (payload: unknown): payload is PlayerApiError => {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    "message" in payload &&
    "section" in payload,
  );
};

function includeForTab(tab: PlayerTab): PlayerSection[] {
  if (tab === "stats") return ["header", "stats"];
  if (tab === "game-log") return ["header", "gameLog"];
  return ["header", "overview"];
}

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

function buildTeamTimeline(data: PlayerHeaderData) {
  const grouped = new Map<
    number,
    {
      teamId: number;
      teamName: string;
      teamTricode: string;
      firstSeason: string;
      lastSeason: string;
      seasons: string[];
    }
  >();

  for (const row of data.seasonTeamHistory) {
    if (row.teamId <= 0 || row.isTotalRow) continue;

    const existing = grouped.get(row.teamId);
    if (!existing) {
      grouped.set(row.teamId, {
        teamId: row.teamId,
        teamName: row.teamName,
        teamTricode: row.teamTricode,
        firstSeason: row.seasonId,
        lastSeason: row.seasonId,
        seasons: [row.seasonId],
      });
      continue;
    }

    existing.seasons.push(row.seasonId);
    if (row.seasonId < existing.firstSeason) {
      existing.firstSeason = row.seasonId;
    }
    if (row.seasonId > existing.lastSeason) {
      existing.lastSeason = row.seasonId;
    }
  }

  return [...grouped.values()].sort((a, b) => {
    if (a.firstSeason !== b.firstSeason) {
      return a.firstSeason.localeCompare(b.firstSeason);
    }
    return a.teamTricode.localeCompare(b.teamTricode);
  });
}

function toOrdinal(value: number) {
  const remainder10 = value % 10;
  const remainder100 = value % 100;

  if (remainder10 === 1 && remainder100 !== 11) return `${value}st`;
  if (remainder10 === 2 && remainder100 !== 12) return `${value}nd`;
  if (remainder10 === 3 && remainder100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function formatDraftDisplay(data: PlayerHeaderData) {
  const year = Number(data.draft.year);
  const round = Number(data.draft.round);
  const pick = Number(data.draft.pick);

  if (
    Number.isFinite(year) &&
    year > 0 &&
    Number.isFinite(round) &&
    round > 0 &&
    Number.isFinite(pick) &&
    pick > 0
  ) {
    return `#${pick} pick in ${toOrdinal(round)} round (${year})`;
  }

  return data.draft.display || "N/A";
}

function formatCareerSpan(fromYear: string, toYear: string) {
  const toSeasonLabel = (year: string) => {
    const trimmed = year.trim();
    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber) || asNumber <= 0) return trimmed;

    const end = ((asNumber + 1) % 100).toString().padStart(2, "0");
    return `${trimmed}-${end}`;
  };

  const from = fromYear?.trim();
  const to = toYear?.trim();

  if (from && to) {
    const fromSeason = toSeasonLabel(from);
    const toSeason = toSeasonLabel(to);
    return fromSeason === toSeason
      ? fromSeason
      : `${fromSeason} to ${toSeason}`;
  }

  if (from) return toSeasonLabel(from);
  if (to) return toSeasonLabel(to);
  return "--";
}

function parseSeasonStart(value: string): number {
  const match = value.match(/^\d{4}/);
  return match ? Number(match[0]) : 0;
}

function getSortDirectionLabel(direction: "asc" | "desc") {
  return direction === "asc" ? "ascending" : "descending";
}

function renderSortIndicator(active: boolean, direction: "asc" | "desc") {
  if (!active) {
    return <span className="ml-1 text-text/40">↕</span>;
  }
  return (
    <span className="ml-1 text-accent">{direction === "asc" ? "↑" : "↓"}</span>
  );
}

function formatAwardYears(years: string[]) {
  if (!years.length) return "Year data unavailable";
  return years.join(", ");
}

function formatCareerHighContext(
  gameDate: string | null,
  opponentTricode: string | null,
) {
  if (!gameDate && !opponentTricode) return null;

  let formattedDate = gameDate ?? "";
  if (gameDate) {
    const parsed = new Date(gameDate);
    if (!Number.isNaN(parsed.getTime())) {
      formattedDate = parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } else {
      const match = gameDate.match(/^([A-Za-z]{3})\s(\d{2})\s(\d{4})$/);
      if (match) {
        formattedDate = `${match[1]} ${match[2]}, ${match[3]}`;
      }
    }
  }

  if (formattedDate && opponentTricode) {
    return `${formattedDate} vs ${opponentTricode}`;
  }

  return formattedDate || (opponentTricode ? `vs ${opponentTricode}` : null);
}

function compareNullable(a: unknown, b: unknown) {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return null;
}

function normalizeStatSortValue(column: string, value: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  if (column === "Season") return parseSeasonStart(String(value));
  if (typeof value === "number") return value;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const pctMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (pctMatch) {
    return Number(pctMatch[1]);
  }

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }

  return trimmed.toLowerCase();
}

function PlayerHeaderSection({ data }: { data: PlayerHeaderData }) {
  const detailsRows = [
    { label: "Age", value: data.age ?? "N/A" },
    { label: "Height", value: data.height || "N/A" },
    { label: "Weight", value: data.weight || "N/A" },
    { label: "Experience", value: data.experience || "0" },
    { label: "Draft", value: formatDraftDisplay(data) },
    {
      label: "Career Span",
      value: formatCareerSpan(data.fromYear, data.toYear),
    },
  ];

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="glass-card p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] items-start gap-4 lg:gap-7">
          <div className="w-full max-w-[160px] sm:max-w-[220px] mx-auto lg:mx-0">
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/260x190/${data.playerId}.png`}
              alt={data.displayName}
              className="w-full h-[210px] sm:h-[280px] rounded-2xl object-cover bg-white/10 border border-white/10"
              onError={(event) => {
                (event.target as HTMLImageElement).src =
                  "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
              }}
            />
          </div>

          <div className="space-y-3 md:space-y-4 min-w-0">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display leading-tight break-words">
                {data.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text/80 mt-2">
                <TeamLink
                  teamId={data.teamId}
                  className="px-2.5 py-1 rounded-md bg-background/40 border border-white/10 hover:text-accent transition-colors"
                  sourceComponent="player_page_header"
                >
                  {data.teamName}
                </TeamLink>
                <span className="px-2.5 py-1 rounded-md bg-background/40 border border-white/10">
                  {data.position || "N/A"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-background/40 border border-white/10">
                  #{data.jersey || "--"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-background/40 border border-white/10">
                  {data.school || "N/A"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {detailsRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-white/10 bg-background/20 px-3 py-2.5 min-h-[64px]"
                >
                  <p className="text-[10px] uppercase tracking-wider text-text/60">
                    {row.label}
                  </p>
                  <p className="text-sm sm:text-base font-semibold mt-1 break-words text-text/95 leading-snug">
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayerOverviewTab({
  data,
  header,
}: {
  data: PlayerOverviewData;
  header: PlayerHeaderData | null;
}) {
  const teamTimeline = header ? buildTeamTimeline(header) : [];

  const currentSeasonRows = [
    { label: "GP", value: data.currentSeasonBasic.gamesPlayed },
    { label: "W", value: data.currentSeasonBasic.wins },
    { label: "L", value: data.currentSeasonBasic.losses },
    { label: "MIN", value: data.currentSeasonBasic.minutes.toFixed(1) },
    { label: "PTS", value: data.currentSeasonBasic.points.toFixed(1) },
    { label: "REB", value: data.currentSeasonBasic.rebounds.toFixed(1) },
    { label: "AST", value: data.currentSeasonBasic.assists.toFixed(1) },
    { label: "STL", value: data.currentSeasonBasic.steals.toFixed(1) },
    { label: "BLK", value: data.currentSeasonBasic.blocks.toFixed(1) },
    { label: "TOV", value: data.currentSeasonBasic.turnovers.toFixed(1) },
    { label: "FGM", value: data.currentSeasonBasic.fgm.toFixed(1) },
    { label: "FGA", value: data.currentSeasonBasic.fga.toFixed(1) },
    { label: "3PM", value: data.currentSeasonBasic.threePtMade.toFixed(1) },
    {
      label: "3PA",
      value: data.currentSeasonBasic.threePtAttempted.toFixed(1),
    },
    { label: "FTM", value: data.currentSeasonBasic.ftm.toFixed(1) },
    { label: "FTA", value: data.currentSeasonBasic.fta.toFixed(1) },
    {
      label: "FG%",
      value: `${(data.currentSeasonBasic.fgPct * 100).toFixed(1)}%`,
    },
    {
      label: "3P%",
      value: `${(data.currentSeasonBasic.threePtPct * 100).toFixed(1)}%`,
    },
    {
      label: "FT%",
      value: `${(data.currentSeasonBasic.ftPct * 100).toFixed(1)}%`,
    },
  ];

  const careerRows = data.careerBasic
    ? [
        { label: "GP", value: data.careerBasic.gamesPlayed },
        { label: "MIN", value: data.careerBasic.minutes.toFixed(1) },
        { label: "PTS", value: data.careerBasic.points.toFixed(1) },
        { label: "REB", value: data.careerBasic.rebounds.toFixed(1) },
        { label: "AST", value: data.careerBasic.assists.toFixed(1) },
        { label: "STL", value: data.careerBasic.steals.toFixed(1) },
        { label: "BLK", value: data.careerBasic.blocks.toFixed(1) },
        { label: "TOV", value: data.careerBasic.turnovers.toFixed(1) },
        { label: "FGM", value: data.careerBasic.fgm.toFixed(1) },
        { label: "FGA", value: data.careerBasic.fga.toFixed(1) },
        { label: "3PM", value: data.careerBasic.threePtMade.toFixed(1) },
        {
          label: "3PA",
          value: data.careerBasic.threePtAttempted.toFixed(1),
        },
        { label: "FTM", value: data.careerBasic.ftm.toFixed(1) },
        { label: "FTA", value: data.careerBasic.fta.toFixed(1) },
        {
          label: "FG%",
          value: `${(data.careerBasic.fgPct * 100).toFixed(1)}%`,
        },
        {
          label: "3P%",
          value: `${(data.careerBasic.threePtPct * 100).toFixed(1)}%`,
        },
        {
          label: "FT%",
          value: `${(data.careerBasic.ftPct * 100).toFixed(1)}%`,
        },
      ]
    : [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Season
        </h3>
        <div className="glass-card overflow-auto rounded-2xl">
          <table className="w-full min-w-[1200px] text-center">
            <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
              <tr>
                {currentSeasonRows.map((row) => (
                  <th
                    key={row.label}
                    className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap"
                  >
                    {row.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10 hover:bg-white/5">
                {currentSeasonRows.map((row) => (
                  <td
                    key={row.label}
                    className="px-4 py-3 text-sm font-semibold text-text/90 whitespace-nowrap"
                  >
                    {row.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Career
        </h3>
        {careerRows.length ? (
          <div className="glass-card overflow-auto rounded-2xl">
            <table className="w-full min-w-[1100px] text-center">
              <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
                <tr>
                  {careerRows.map((row) => (
                    <th
                      key={row.label}
                      className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap"
                    >
                      {row.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10 hover:bg-white/5">
                  {careerRows.map((row) => (
                    <td
                      key={row.label}
                      className="px-4 py-3 text-sm font-semibold text-text/90 whitespace-nowrap"
                    >
                      {row.value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No career basic stats"
            subtitle="Career totals are not available for this player right now."
          />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Career Highs
        </h3>
        {data.careerHighs.length ? (
          <div className="glass-card overflow-hidden rounded-2xl p-3 md:p-4">
            <ul className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {data.careerHighs.map((entry) => {
                const context = formatCareerHighContext(
                  entry.gameDate,
                  entry.opponentTricode,
                );

                return (
                  <li
                    key={`${entry.label}-${entry.gameDate ?? "no-date"}-${entry.opponentTricode ?? "no-opp"}`}
                    className="rounded-xl border border-white/10 bg-background/20 px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-background/35 transition-colors"
                  >
                    <div>
                      <span className="text-sm text-text/75 uppercase tracking-wide">
                        {entry.label}
                      </span>
                      {context ? (
                        <p className="text-[11px] text-text/55 mt-0.5">
                          {context}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-sm font-semibold text-text/90">
                      {entry.value}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <EmptyState
            title="No career highs"
            subtitle="Career highs are not available for this player right now."
          />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Teams
        </h3>
        {teamTimeline.length ? (
          <div className="glass-card overflow-auto rounded-2xl">
            <table className="w-full min-w-[680px] text-left">
              <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
                    Team
                  </th>
                  <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
                    Years
                  </th>
                  <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
                    Seasons
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamTimeline.map((team) => (
                  <tr
                    key={team.teamId}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-base">
                      <TeamLink
                        teamId={team.teamId}
                        sourceComponent="player_overview_team_history_table"
                        className="font-semibold hover:text-accent transition-colors"
                      >
                        {team.teamName} ({team.teamTricode})
                      </TeamLink>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-text/90">
                      {team.firstSeason === team.lastSeason
                        ? team.firstSeason
                        : `${team.firstSeason} to ${team.lastSeason}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-text/75">
                      {team.seasons.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No team history"
            subtitle="Team history is not available for this player right now."
          />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
          Awards ({data.awards.total})
        </h3>
        {data.awards.grouped.length ? (
          <div className="glass-card rounded-2xl divide-y divide-white/10 overflow-hidden">
            {data.awards.grouped.map((award) => (
              <div
                key={award.label}
                className="px-4 md:px-5 py-3 md:py-4 flex items-start sm:items-center justify-between gap-3 hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm md:text-base text-text/95 leading-relaxed font-medium">
                    {award.label}
                  </p>
                  <p className="text-xs text-text/60 mt-1 break-words">
                    {formatAwardYears(award.years)}
                  </p>
                </div>
                <span className="inline-flex min-w-10 justify-center rounded-full bg-accent/20 border border-accent/30 px-3 py-1 text-sm font-semibold text-text shrink-0">
                  {award.count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No awards"
            subtitle="No awards rows were returned for this player."
          />
        )}
      </div>
    </div>
  );
}

function renderStatCell(value: string | number | null) {
  if (value === null || value === undefined) return "--";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return value;
}

function SeasonStatsTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
}) {
  const [sortColumn, setSortColumn] = useState<string>("Season");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const activeSortColumn = columns.includes(sortColumn)
    ? sortColumn
    : columns[0];

  const sortedRows = useMemo(() => {
    if (!activeSortColumn) return rows;

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      const aRaw = a[activeSortColumn] ?? null;
      const bRaw = b[activeSortColumn] ?? null;

      const nullableOrder = compareNullable(aRaw, bRaw);
      if (nullableOrder !== null) return nullableOrder;

      const aValue = normalizeStatSortValue(activeSortColumn, aRaw);
      const bValue = normalizeStatSortValue(activeSortColumn, bRaw);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * directionMultiplier;
      }

      const aText = String(aValue ?? "");
      const bText = String(bValue ?? "");
      return aText.localeCompare(bText) * directionMultiplier;
    });
  }, [rows, activeSortColumn, sortDirection]);

  const onSortColumn = (column: string) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === "Season" ? "desc" : "asc");
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
        {title}
      </h3>
      {!rows.length ? (
        <EmptyState
          title={`No ${title.toLowerCase()} data`}
          subtitle="No rows available."
        />
      ) : (
        <div className="glass-card overflow-auto rounded-2xl">
          <table className="w-full min-w-[1160px] text-center">
            <thead className="text-sm uppercase text-text/70 bg-white/[0.03]">
              <tr>
                {columns.map((column) => {
                  const active = column === activeSortColumn;
                  return (
                    <th
                      key={column}
                      className={`px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap ${
                        column === "Season" ? "text-left" : "text-center"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSortColumn(column)}
                        className="inline-flex items-center hover:text-text transition-colors"
                        aria-label={`Sort by ${column} (${getSortDirectionLabel(active ? sortDirection : "asc")})`}
                      >
                        {column}
                        {renderSortIndicator(active, sortDirection)}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row, index) => (
                <tr
                  key={`${row.Season ?? "season"}-${index}`}
                  className="border-t border-white/10 hover:bg-white/5"
                >
                  {columns.map((column) => (
                    <td
                      key={`${index}-${column}`}
                      className={`px-5 py-4 font-semibold text-text/90 whitespace-nowrap ${
                        column === "Season" ? "text-left" : "text-center"
                      }`}
                    >
                      {renderStatCell(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlayerStatsTab({ data }: { data: PlayerStatsData }) {
  return (
    <div className="space-y-6">
      <SeasonStatsTable
        title="Season Stats"
        columns={data.basic.columns}
        rows={data.basic.rows}
      />
      <SeasonStatsTable
        title="Advanced Stats"
        columns={data.advanced.columns}
        rows={data.advanced.rows}
      />
      <SeasonStatsTable
        title="Per-36 Stats"
        columns={data.per36.columns}
        rows={data.per36.rows}
      />
    </div>
  );
}

function PlayerGameLogTab({ data }: { data: PlayerGameLogData }) {
  const [sortKey, setSortKey] =
    useState<keyof PlayerGameLogData["games"][number]>("gameDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const columns: Array<{
    key: keyof PlayerGameLogData["games"][number];
    label: string;
    align?: "left" | "center";
  }> = [
    { key: "gameDate", label: "Date", align: "left" },
    { key: "matchup", label: "Matchup", align: "left" },
    { key: "result", label: "WL" },
    { key: "minutes", label: "MIN" },
    { key: "points", label: "PTS" },
    { key: "rebounds", label: "REB" },
    { key: "assists", label: "AST" },
    { key: "steals", label: "STL" },
    { key: "blocks", label: "BLK" },
    { key: "turnovers", label: "TOV" },
    { key: "fgm", label: "FGM" },
    { key: "fga", label: "FGA" },
    { key: "threePtMade", label: "3PM" },
    { key: "threePtAttempted", label: "3PA" },
    { key: "ftm", label: "FTM" },
    { key: "fta", label: "FTA" },
    { key: "fgPct", label: "FG%" },
    { key: "threePtPct", label: "3P%" },
    { key: "ftPct", label: "FT%" },
  ];

  const sortedGames = useMemo(() => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...data.games].sort((a, b) => {
      const aRaw = a[sortKey];
      const bRaw = b[sortKey];

      if (sortKey === "gameDate") {
        const aDate = new Date(String(aRaw)).getTime();
        const bDate = new Date(String(bRaw)).getTime();
        if (Number.isFinite(aDate) && Number.isFinite(bDate)) {
          return (aDate - bDate) * directionMultiplier;
        }
      }

      if (sortKey === "result") {
        const resultOrder: Record<string, number> = { W: 2, L: 1, "": 0 };
        return (
          ((resultOrder[String(aRaw)] ?? 0) -
            (resultOrder[String(bRaw)] ?? 0)) *
          directionMultiplier
        );
      }

      if (typeof aRaw === "number" && typeof bRaw === "number") {
        return (aRaw - bRaw) * directionMultiplier;
      }

      return (
        String(aRaw ?? "")
          .toLowerCase()
          .localeCompare(String(bRaw ?? "").toLowerCase()) * directionMultiplier
      );
    });
  }, [data.games, sortDirection, sortKey]);

  const onSort = (key: keyof PlayerGameLogData["games"][number]) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "gameDate" ? "desc" : "asc");
  };

  const renderGameLogCell = (
    game: PlayerGameLogData["games"][number],
    key: keyof PlayerGameLogData["games"][number],
  ) => {
    if (key === "matchup") {
      if (game.gameId) {
        return (
          <Link
            href={`/game/${game.gameId}`}
            className="hover:text-accent transition-colors"
          >
            {game.matchup}
          </Link>
        );
      }
      return game.matchup;
    }

    if (key === "result") {
      return game.result || "-";
    }

    if (key === "fgPct" || key === "threePtPct" || key === "ftPct") {
      return `${(game[key] * 100).toFixed(1)}%`;
    }

    const value = game[key];
    if (typeof value === "number") {
      return value.toFixed(1);
    }

    return value || "--";
  };

  if (!data.games.length) {
    return (
      <EmptyState
        title="No game log entries"
        subtitle="No regular season played games were found for this player."
      />
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
        Game Log
      </h3>
      <div className="glass-card overflow-auto rounded-2xl">
        <table className="w-full min-w-[1620px] text-center">
          <thead className="text-sm uppercase text-text/70 bg-white/[0.03]">
            <tr>
              {columns.map((column) => {
                const isActive = sortKey === column.key;
                return (
                  <th
                    key={column.label}
                    className={`px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap ${
                      column.align === "left" ? "text-left" : "text-center"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className="inline-flex items-center hover:text-text transition-colors"
                      aria-label={`Sort by ${column.label} (${getSortDirectionLabel(isActive ? sortDirection : "asc")})`}
                    >
                      {column.label}
                      {renderSortIndicator(isActive, sortDirection)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedGames.map((game) => (
              <tr
                key={`${game.gameId}-${game.gameDate}`}
                className="border-t border-white/10 hover:bg-white/5"
              >
                {columns.map((column) => (
                  <td
                    key={`${game.gameId}-${game.gameDate}-${String(column.key)}`}
                    className={`px-5 py-4 font-semibold whitespace-nowrap ${
                      column.align === "left" ? "text-left" : "text-center"
                    } ${
                      column.key === "result"
                        ? game.result === "W"
                          ? "text-green-300"
                          : game.result === "L"
                            ? "text-red-400"
                            : "text-text/90"
                        : "text-text/90"
                    }`}
                  >
                    {renderGameLogCell(game, column.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlayerPageClient({
  playerId,
  initialTab,
  initialHeader,
}: PlayerPageClientProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>(initialTab);

  const [header, setHeader] = useState<SectionState<PlayerHeaderData>>({
    data: initialHeader,
    loading: !initialHeader,
    error: null,
  });
  const [overview, setOverview] = useState<SectionState<PlayerOverviewData>>({
    data: null,
    loading: initialTab === "overview",
    error: null,
  });
  const [stats, setStats] = useState<SectionState<PlayerStatsData>>({
    data: null,
    loading: initialTab === "stats",
    error: null,
  });
  const [gameLog, setGameLog] = useState<SectionState<PlayerGameLogData>>({
    data: null,
    loading: initialTab === "game-log",
    error: null,
  });

  const syncTabToUrl = (tab: PlayerTab) => {
    if (typeof window === "undefined") return;

    const currentScrollY = window.scrollY;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);

    window.history.replaceState(
      window.history.state,
      "",
      `/player/${playerId}?${params.toString()}`,
    );

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: currentScrollY });
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const tab = parsePlayerTab(
        new URLSearchParams(window.location.search).get("tab"),
      );
      setActiveTab(tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setSectionFromPayload = <T,>(
    setState: React.Dispatch<React.SetStateAction<SectionState<T>>>,
    sectionPayload: T | PlayerApiError,
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

  const fetchPlayerPayload = async (
    include: PlayerSection[],
    tabForRequest: PlayerTab,
    preserveHeader = true,
  ) => {
    const includeSet = new Set<PlayerSection>(include);

    setHeader((prev) => ({
      data: preserveHeader ? prev.data : null,
      loading: includeSet.has("header"),
      error: null,
    }));
    setOverview((prev) => ({
      data: prev.data,
      loading: includeSet.has("overview"),
      error: null,
    }));
    setStats((prev) => ({
      data: prev.data,
      loading: includeSet.has("stats"),
      error: null,
    }));
    setGameLog((prev) => ({
      data: prev.data,
      loading: includeSet.has("gameLog"),
      error: null,
    }));

    try {
      const response = await axios.get<PlayerPagePayload>(
        `/api/players/${playerId}?tab=${tabForRequest}&include=${include.join(",")}`,
      );

      const payload = response.data;

      if (payload.header) {
        setSectionFromPayload(setHeader, payload.header, true);
      } else {
        setHeader((prev) => ({ ...prev, loading: false }));
      }

      if (payload.overview) {
        setSectionFromPayload(setOverview, payload.overview);
      } else {
        setOverview((prev) => ({ ...prev, loading: false }));
      }

      if (payload.stats) {
        setSectionFromPayload(setStats, payload.stats);
      } else {
        setStats((prev) => ({ ...prev, loading: false }));
      }

      if (payload.gameLog) {
        setSectionFromPayload(setGameLog, payload.gameLog);
      } else {
        setGameLog((prev) => ({ ...prev, loading: false }));
      }
    } catch (_error) {
      const message =
        "We could not load this player page right now. Please try again in a moment.";

      setHeader((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
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
      setGameLog((prev) => ({
        data: prev.data,
        loading: false,
        error: prev.data ? null : message,
      }));
    }
  };

  useEffect(() => {
    trackEvent("player_page_view", { playerId, tab: activeTab });
  }, [playerId]);

  useEffect(() => {
    setActiveTab(initialTab);
    setHeader({
      data: initialHeader,
      loading: !initialHeader,
      error: null,
    });
    setOverview({
      data: null,
      loading: initialTab === "overview",
      error: null,
    });
    setStats({ data: null, loading: initialTab === "stats", error: null });
    setGameLog({ data: null, loading: initialTab === "game-log", error: null });

    fetchPlayerPayload(includeForTab(initialTab), initialTab, true);
  }, [playerId, initialTab, initialHeader]);

  useEffect(() => {
    if (activeTab === "overview") {
      if (!overview.data && !overview.loading) {
        fetchPlayerPayload(["overview"], activeTab, true);
      }
      return;
    }

    if (activeTab === "stats") {
      if (!stats.data && !stats.loading) {
        fetchPlayerPayload(["stats"], activeTab, true);
      }
      return;
    }

    if (!gameLog.data && !gameLog.loading) {
      fetchPlayerPayload(["gameLog"], activeTab, true);
    }
  }, [
    activeTab,
    overview.data,
    overview.loading,
    stats.data,
    stats.loading,
    gameLog.data,
    gameLog.loading,
  ]);

  const onTabChange = (tab: PlayerTab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    syncTabToUrl(tab);
    trackEvent("player_tab_change", { playerId, tab });
  };

  return (
    <div className="space-y-3 md:space-y-4 pb-4 md:pb-6">
      {header.loading && !header.data ? (
        <div className="py-10">
          <Loading text="Loading player details..." />
        </div>
      ) : header.error || !header.data ? (
        <SectionError
          title="Player details unavailable"
          message={header.error ?? "Player details failed to load."}
          onRetry={() => fetchPlayerPayload(["header"], activeTab, false)}
        />
      ) : (
        <PlayerHeaderSection data={header.data} />
      )}

      <div className="flex justify-center">
        <div className="bg-transparent rounded-xl p-1 flex gap-1 md:gap-2 relative w-full md:w-auto justify-between md:justify-center">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg font-display text-xs md:text-sm transition-colors duration-300 tracking-wide z-10 whitespace-nowrap ${
                tab.id === activeTab
                  ? "text-text"
                  : "text-text/60 hover:text-text"
              }`}
            >
              {tab.id === activeTab && (
                <motion.div
                  layoutId="activePlayerTab"
                  className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <>
          {overview.loading && !overview.data ? (
            <Loading text="Loading overview..." />
          ) : null}
          {overview.error ? (
            <SectionError
              title="Overview unavailable"
              message={overview.error}
              onRetry={() => fetchPlayerPayload(["overview"], activeTab, true)}
            />
          ) : null}
          {overview.data ? (
            <PlayerOverviewTab data={overview.data} header={header.data} />
          ) : null}
        </>
      )}

      {activeTab === "stats" && (
        <>
          {stats.loading && !stats.data ? (
            <Loading text="Loading stats..." />
          ) : null}
          {stats.error ? (
            <SectionError
              title="Stats unavailable"
              message={stats.error}
              onRetry={() => fetchPlayerPayload(["stats"], activeTab, true)}
            />
          ) : null}
          {stats.data ? <PlayerStatsTab data={stats.data} /> : null}
        </>
      )}

      {activeTab === "game-log" && (
        <>
          {gameLog.loading && !gameLog.data ? (
            <Loading text="Loading game log..." />
          ) : null}
          {gameLog.error ? (
            <SectionError
              title="Game log unavailable"
              message={gameLog.error}
              onRetry={() => fetchPlayerPayload(["gameLog"], activeTab, true)}
            />
          ) : null}
          {gameLog.data ? <PlayerGameLogTab data={gameLog.data} /> : null}
        </>
      )}
    </div>
  );
}
