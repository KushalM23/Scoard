"use client";

import {
  useRef,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import axios from "axios";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Trophy } from "lucide-react";
import PlayerLink from "@/app/components/PlayerLink";
import TeamLink from "@/app/components/TeamLink";
import StatTooltip from "@/app/components/StatTooltip";
import { Skeleton } from "@/app/components/skeleton";
import { trackEvent } from "@/app/lib/analytics";
import {
  CURRENT_SEASON,
  getTeamSeasonOptions,
  parseSeason,
  parseTab,
} from "@/app/lib/teams";
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
  initialSeason: string;
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

const NBA_CHAMPIONS_BY_SEASON: Record<string, number> = {
  "2024-25": 1610612760,
  "2023-24": 1610612738,
  "2022-23": 1610612743,
  "2021-22": 1610612744,
  "2020-21": 1610612749,
  "2019-20": 1610612747,
  "2018-19": 1610612761,
  "2017-18": 1610612744,
  "2016-17": 1610612744,
  "2015-16": 1610612739,
};

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

function TeamOverviewSkeleton() {
  return (
    <section className="mb-4 md:mb-6">
      <div className="glass-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 sm:w-48" />
              <Skeleton className="h-7 w-44 sm:w-56" />
            </div>
          </div>
          <div className="hidden md:block w-full md:w-auto md:min-w-[320px] lg:min-w-[360px] space-y-2">
            <Skeleton className="h-5 w-56 ml-auto" />
            <Skeleton className="h-5 w-56 ml-auto" />
          </div>
        </div>

        <div className="md:hidden grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`team-overview-mobile-skeleton-${index}`}
              className="rounded-xl border border-white/10 bg-background/30 px-3 py-2.5 space-y-2"
            >
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mt-3 md:mt-4">
          {Array.from({ length: 3 }).map((_, panelIndex) => (
            <div
              key={`team-overview-panel-skeleton-${panelIndex}`}
              className="rounded-2xl border border-white/10 bg-background/20 p-4 h-[292px] md:h-[372px]"
            >
              <Skeleton className="h-4 w-36 mb-3" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div
                    key={`team-overview-panel-row-skeleton-${panelIndex}-${rowIndex}`}
                    className="rounded-xl border border-white/10 bg-background/35 p-3 md:p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-3 w-28 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamStatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`team-stat-metric-skeleton-${index}`}
            className="glass-card p-4 text-center rounded-xl space-y-2"
          >
            <Skeleton className="h-3 w-14 mx-auto" />
            <Skeleton className="h-7 w-16 mx-auto" />
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl p-4 md:p-5 space-y-3">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton
            key={`team-stat-row-skeleton-${index}`}
            className="h-10 w-full rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}

function TeamRosterSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`team-roster-skeleton-${index}`}
          className="glass-card p-2.5 md:p-3 flex items-center gap-2.5 md:gap-3 min-w-0"
        >
          <Skeleton className="w-12 h-12 md:w-14 md:h-14 rounded-full shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamOverviewInline({
  data,
  schedule,
  results,
  snapshotLoading,
  selectedSeason,
  seasonOptions,
  onSeasonChange,
  seasonLoading,
}: {
  data: TeamOverviewData;
  schedule: SectionState<TeamScheduleData>;
  results: SectionState<TeamResultsData>;
  snapshotLoading: boolean;
  selectedSeason: string;
  seasonOptions: string[];
  onSeasonChange: (season: string) => void;
  seasonLoading: boolean;
}) {
  const panelHeightClass = "h-[210px] md:h-[372px]";
  const snapshotPanelHeightClass = "h-[292px] md:h-[372px]";
  const [isSeasonMenuOpen, setIsSeasonMenuOpen] = useState(false);
  const seasonMenuRef = useRef<HTMLDivElement | null>(null);

  const renderGamesPanelSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`team-games-panel-skeleton-${index}`}
          className="rounded-xl border border-white/10 bg-background/35 p-3 md:p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-28 mx-auto" />
        </div>
      ))}
    </div>
  );

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
  const isChampion = NBA_CHAMPIONS_BY_SEASON[selectedSeason] === data.teamId;
  const overviewStats = [
    { label: "Record", value: `${data.record.wins}-${data.record.losses}` },
    { label: "Streak", value: data.streak, valueClassName: streakClass },
    { label: "Conference", value: `#${data.ranks.conferenceRank}` },
    { label: "Division", value: `#${data.ranks.divisionRank}` },
  ];

  useEffect(() => {
    if (!isSeasonMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        seasonMenuRef.current &&
        !seasonMenuRef.current.contains(event.target as Node)
      ) {
        setIsSeasonMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSeasonMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSeasonMenuOpen]);

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
        {snapshotLoading && !rows.length ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`${title}-snapshot-skeleton-${index}`}
              className={`${index > 4 ? "hidden md:flex" : "flex"} items-center justify-between rounded-lg px-2.5 py-2 md:py-1.5 border border-white/10 bg-background/30`}
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-4" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
          ))
        ) : !rows.length ? (
          <p className="text-text/60 text-sm">Snapshot is unavailable.</p>
        ) : (
          rows.map((row, index) => (
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
          ))
        )}
      </div>
    </div>
  );

  const renderScheduleContent = () => {
    if (schedule.loading && !schedule.data) {
      return renderGamesPanelSkeleton();
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
            className="rounded-xl border border-white/10 bg-background/35 p-3 md:p-4 hover:bg-background/50 transition-colors block"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-text/95 w-1/3 text-sm sm:text-base md:text-xl font-display">
                {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
              </span>
              <span className="text-text/60 text-sm uppercase tracking-wide w-1/3 text-center">
                vs
              </span>
              <span className="text-text/95 text-right w-1/3 text-sm sm:text-base md:text-xl font-display">
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
      return renderGamesPanelSkeleton();
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
              className="rounded-xl border border-white/10 bg-background/35 p-3 md:p-4 hover:bg-background/50 transition-colors block"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`${tone.homeTeamTone} w-1/3 text-sm sm:text-base md:text-xl font-display`}
                >
                  {game.homeTeamTricode ?? game.homeTeamName ?? "Home"}
                </span>
                <div className="w-1/3 flex items-center justify-center gap-2 md:gap-3 leading-none font-mono text-xl sm:text-2xl md:text-3xl font-bold">
                  <span className={tone.homeScoreTone}>{scores.home}</span>
                  <span className="text-text/50">-</span>
                  <span className={tone.awayScoreTone}>{scores.away}</span>
                </div>
                <span
                  className={`${tone.awayTeamTone} text-right w-1/3 text-sm sm:text-base md:text-xl font-display`}
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
    <section className="mb-4 md:mb-6">
      <div className="glass-card p-4 md:p-5 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3 md:gap-5">
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-[116px_minmax(0,1fr)] md:grid-cols-[128px_minmax(0,1fr)] gap-3 sm:gap-4 items-start">
              <div className="shrink-0 rounded-2xl border border-white/10 bg-background/25 w-[116px] h-[116px] md:w-[128px] md:h-[128px] flex items-center justify-center">
                <img
                  src={
                    data.logoUrl ??
                    `https://cdn.nba.com/logos/nba/${data.teamId}/primary/L/logo.svg`
                  }
                  alt={`${data.city} ${data.name}`}
                  className="w-[82px] h-[82px] md:w-[94px] md:h-[94px] object-contain"
                />
              </div>

              <div className="min-w-0 self-center">
                <h1 className="text-xs sm:text-base md:text-lg font-display leading-tight text-text/70 truncate uppercase tracking-[0.12em]">
                  {data.city}
                </h1>
                <div className="mt-1 flex items-center gap-2.5 min-w-0">
                  <h2 className="text-3xl sm:text-5xl md:text-[3.6rem] font-display leading-none truncate uppercase">
                    {data.name}
                  </h2>
                  {isChampion ? (
                    <span title={`${selectedSeason} NBA Champions`}>
                      <Trophy className="h-5 w-5 md:h-6 md:w-6 shrink-0 text-amber-200" />
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                className="w-full max-w-[420px] sm:col-span-2 md:col-span-2"
                ref={seasonMenuRef}
              >
                <span className="text-[10px] uppercase tracking-[0.28em] text-text/50">
                  Season
                </span>
                <div className="relative mt-2">
                  <motion.button
                    type="button"
                    onClick={() => setIsSeasonMenuOpen((prev) => !prev)}
                    whileTap={{ scale: 0.985 }}
                    disabled={seasonLoading}
                    className="flex w-full items-center justify-between gap-3 rounded-xl hover:bg-white/5 hover:text-accent transition-all duration-300 border border-white/10 group px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="text-base font-display tracking-wide text-text group-hover:text-accent transition-colors">
                      {selectedSeason}
                    </span>
                    <motion.div
                      animate={{ rotate: isSeasonMenuOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-text/55" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {isSeasonMenuOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="absolute left-0 right-0 top-full z-40 mt-3 overflow-hidden rounded-xl bg-background border border-white/10 shadow-2xl ring-1 ring-white/5 origin-top"
                      >
                        <div className="max-h-[20rem] overflow-y-auto py-2">
                          {seasonOptions.map((season) => {
                            const isActive = season === selectedSeason;

                            return (
                              <button
                                key={season}
                                type="button"
                                onClick={() => {
                                  onSeasonChange(season);
                                  setIsSeasonMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                  isActive
                                    ? "bg-white/5 border-l-2 border-accent text-text"
                                    : "text-text/72 hover:bg-white/5 hover:text-text border-l-2 border-transparent hover:border-accent"
                                }`}
                              >
                                <span className="text-base font-display tracking-wide">
                                  {season}
                                </span>
                                {isActive ? (
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.45)]" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 md:gap-3">
            {overviewStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-background/24 px-3 py-3 md:px-4 min-h-[72px] flex flex-col justify-center"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-text/55">
                  {stat.label}
                </p>
                <p
                  className={`mt-2 text-base md:text-lg font-display leading-none ${
                    stat.valueClassName ?? "text-text/90"
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mt-3 md:mt-4">
          <div
            className={`rounded-2xl border border-white/10 bg-background/20 p-4 ${panelHeightClass} flex flex-col`}
          >
            <h3 className="text-sm uppercase tracking-wider text-text/70 mb-3 font-semibold">
              Results
            </h3>
            <div className="overflow-y-auto pr-0 md:pr-1">
              {renderResultsContent()}
            </div>
          </div>
          <div
            className={`rounded-2xl border border-white/10 bg-background/20 p-4 ${panelHeightClass} flex flex-col`}
          >
            <h3 className="text-sm uppercase tracking-wider text-text/70 mb-3 font-semibold">
              Schedule
            </h3>
            <div className="overflow-y-auto pr-0 md:pr-1">
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
  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-text/70 px-1 font-semibold">
        {title}
      </h3>
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-max min-w-full text-center whitespace-nowrap">
            <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center"
                  >
                    <StatTooltip label={column.label} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-white/10 hover:bg-white/5">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-5 py-4 font-semibold text-text/90 whitespace-nowrap text-center"
                  >
                    {row[column.key] ?? "--"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
              <StatTooltip label={metric.label} />
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
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-max min-w-full text-center whitespace-nowrap">
              <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
                <tr>
                  <th className="px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-left">
                    Player
                  </th>
                  <th className="px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center">
                    <StatTooltip label="GP" />
                  </th>
                  <th className="px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center">
                    <StatTooltip label="MIN" />
                  </th>
                  {statColumns.map((column) => (
                    <th
                      key={column.key}
                      className="px-5 py-4 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center cursor-pointer"
                      onClick={() => handleSort(column.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        <StatTooltip label={column.label} />
                        <span
                          className={`text-sm ${
                            sortBy === column.key
                              ? "text-accent"
                              : "text-text/40"
                          }`}
                        >
                          {sortBy === column.key
                            ? sortDirection === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
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
                    <td className="px-5 py-4 text-left font-semibold text-text/90 whitespace-nowrap">
                      <PlayerLink
                        playerId={row.playerId}
                        className="hover:text-accent transition-colors"
                        sourceComponent="team_player_stats_table"
                      >
                        {row.playerName}
                      </PlayerLink>
                    </td>
                    <td className="px-5 py-4 font-semibold text-text/90 whitespace-nowrap text-center">
                      {row.gamesPlayed}
                    </td>
                    <td className="px-5 py-4 font-semibold text-text/90 whitespace-nowrap text-center">
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
                          className="px-5 py-4 font-semibold text-text/90 whitespace-nowrap text-center"
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
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
              className="glass-card p-2.5 md:p-3 flex items-center gap-2.5 md:gap-3 min-w-0"
            >
              <img
                src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.playerId}.png`}
                alt={player.playerName}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover bg-white/10"
                onError={(event) => {
                  (event.target as HTMLImageElement).src =
                    "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
                }}
              />
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  <PlayerLink
                    playerId={player.playerId}
                    className="hover:text-accent transition-colors"
                    sourceComponent="team_roster_card"
                  >
                    {player.playerName}
                  </PlayerLink>
                </p>
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
  initialSeason,
  initialOverview,
}: TeamPageClientProps) {
  const [activeTab, setActiveTab] = useState<TeamTab>(initialTab);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const seasonOptions = useMemo(
    () => getTeamSeasonOptions(selectedSeason),
    [selectedSeason],
  );

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

  const syncStateToUrl = (tab: TeamTab, season: string) => {
    if (typeof window === "undefined") return;

    const currentScrollY = window.scrollY;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    if (season === CURRENT_SEASON) {
      params.delete("season");
    } else {
      params.set("season", season);
    }
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
      const params = new URLSearchParams(window.location.search);
      const tab = parseTab(params.get("tab"));
      const season = parseSeason(params.get("season"));
      setActiveTab(tab);
      setSelectedSeason(season);
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
    preserveSectionData = true,
  ) => {
    const includeSet = new Set<TeamSection>(include);

    setOverview((prev) => ({
      data: preserveOverview ? prev.data : null,
      loading: includeSet.has("overview"),
      error: null,
    }));
    setStats((prev) => ({
      data: preserveSectionData ? prev.data : null,
      loading: includeSet.has("stats"),
      error: null,
    }));
    setRoster((prev) => ({
      data: preserveSectionData ? prev.data : null,
      loading: includeSet.has("roster"),
      error: null,
    }));
    setSchedule((prev) => ({
      data: preserveSectionData ? prev.data : null,
      loading: includeSet.has("schedule"),
      error: null,
    }));
    setResults((prev) => ({
      data: preserveSectionData ? prev.data : null,
      loading: includeSet.has("results"),
      error: null,
    }));

    try {
      const response = await axios.get<TeamPagePayload>(
        `/api/teams/${teamId}?tab=${activeTab}&season=${selectedSeason}&include=${include.join(",")}`,
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
    setActiveTab(initialTab);
    setSelectedSeason(initialSeason);
  }, [teamId, initialSeason, initialTab]);

  useEffect(() => {
    trackEvent("team_page_view", {
      teamId,
      season: selectedSeason,
    });
  }, [selectedSeason, teamId]);

  useEffect(() => {
    const seededOverview =
      selectedSeason === initialSeason ? initialOverview : null;

    setOverview({
      data: seededOverview,
      loading: !seededOverview,
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

    fetchTeamPagePayload(include, Boolean(seededOverview), false);
  }, [teamId, initialOverview, initialSeason, selectedSeason]);

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

  const seasonLoading =
    overview.loading ||
    stats.loading ||
    roster.loading ||
    schedule.loading ||
    results.loading;

  const handleTabChange = (tab: TeamTab) => {
    if (tab === activeTab) return;

    setActiveTab(tab);
    syncStateToUrl(tab, selectedSeason);
    trackEvent("team_tab_change", { teamId, tab, season: selectedSeason });
  };

  const handleSeasonChange = (season: string) => {
    if (season === selectedSeason) return;

    setSelectedSeason(season);
    syncStateToUrl(activeTab, season);
    trackEvent("team_season_change", { teamId, tab: activeTab, season });
  };

  return (
    <div className="space-y-3 md:space-y-4 pb-4 md:pb-6">
      {overview.loading && !overview.data ? (
        <TeamOverviewSkeleton />
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
          snapshotLoading={overview.loading}
          selectedSeason={selectedSeason}
          seasonOptions={seasonOptions}
          onSeasonChange={handleSeasonChange}
          seasonLoading={seasonLoading}
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
          {stats.loading && !stats.data ? <TeamStatsSkeleton /> : null}
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
          {stats.loading && !stats.data ? <TeamStatsSkeleton /> : null}
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
          {roster.loading && !roster.data ? <TeamRosterSkeleton /> : null}
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
