"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { GameData, Player, PlayByPlayEvent } from "../types";
import TeamLink from "./TeamLink";
import PlayerLink from "./PlayerLink";

interface StatsSectionProps {
  gameData: GameData;
  players: Player[];
  actions?: PlayByPlayEvent[];
}

type SortKey = keyof Player | "minutes";
type SortDirection = "asc" | "desc";

const StatsSection: React.FC<StatsSectionProps> = ({
  gameData,
  players,
  actions = [],
}) => {
  const [activeTab, setActiveTab] = useState<"home" | "away" | "team" | "pbp">(
    "home",
  );
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "isOnCourt",
    direction: "desc",
  });

  const isScheduled = gameData.gameStatus === 1;

  const homePlayers = players.filter(
    (p) => String(p.teamId) === String(gameData.homeTeam.teamId),
  );
  const awayPlayers = players.filter(
    (p) => String(p.teamId) === String(gameData.awayTeam.teamId),
  );

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const sortPlayers = (teamPlayers: Player[]) => {
    return [...teamPlayers].sort((a, b) => {
      const getSeconds = (s: string) => {
        if (!s || !s.startsWith("PT")) return 0;
        const m = s.match(/PT(\d+)M/);
        const sec = s.match(/(\d+(\.\d+)?)S/);
        let total = 0;
        if (m) total += parseInt(m[1]) * 60;
        if (sec) total += parseFloat(sec[1]);
        return total;
      };

      // Default View: On Court First
      if (sortConfig.key === "isOnCourt") {
        if (a.isOnCourt !== b.isOnCourt) {
          return a.isOnCourt ? -1 : 1;
        }
        // Secondary sort by minutes desc
        return getSeconds(b.minutes) - getSeconds(a.minutes);
      }

      // Explicit Minutes Sort
      if (sortConfig.key === "minutes") {
        return sortConfig.direction === "asc"
          ? getSeconds(a.minutes) - getSeconds(b.minutes)
          : getSeconds(b.minutes) - getSeconds(a.minutes);
      }

      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle string comparisons (like minutes "PT12M")
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // Handle numeric comparisons
      const valA = aValue ?? 0;
      const valB = bValue ?? 0;
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const sortedHomePlayers = sortPlayers(homePlayers);
  const sortedAwayPlayers = sortPlayers(awayPlayers);

  const formatPercentage = (val: number) => `${(val * 100).toFixed(1)}%`;

  const renderSortHeader = (label: string, key: SortKey) => (
    <th
      className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap cursor-pointer hover:text-text transition-colors group min-w-[60px]"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center justify-center gap-1">
        {label}
        <span
          className={`text-sm ${
            sortConfig.key === key
              ? "text-accent"
              : "text-text/40 group-hover:text-text"
          }`}
        >
          {sortConfig.key === key
            ? sortConfig.direction === "asc"
              ? "↑"
              : "↓"
            : "↕"}
        </span>
      </div>
    </th>
  );

  const renderRosterTable = (teamPlayers: Player[]) => (
    <div className="glass-card overflow-auto max-h-[400px] rounded-2xl">
      <table className="w-full text-left min-w-[600px]">
        <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
          <tr>
            <th className="px-4 py-3 whitespace-nowrap text-left text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
              Jersey
            </th>
            <th className="px-4 py-3 whitespace-nowrap text-left w-full text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
              PLAYER
            </th>
            <th className="px-4 py-3 whitespace-nowrap text-center text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
              Pos
            </th>
            <th className="px-4 py-3 whitespace-nowrap text-center text-sm md:text-base font-semibold font-mono tracking-[0.05em]">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {teamPlayers.map((player) => (
            <tr
              key={player.personId}
              className="border-t border-white/10 hover:bg-white/5 transition-colors"
            >
              <td className="px-4 py-3 text-text/90 font-semibold whitespace-nowrap">
                {player.jersey}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="w-8 h-8 object-cover rounded-full bg-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
                    }}
                  />
                  <PlayerLink
                    playerId={player.personId}
                    className="font-bold text-text hover:text-accent transition-colors"
                    sourceComponent="stats_section_roster_table"
                  >
                    {player.firstName} {player.lastName}
                  </PlayerLink>
                </div>
              </td>
              <td className="px-4 py-3 text-text/90 font-semibold text-center whitespace-nowrap">
                {player.position}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold ${player.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                >
                  {player.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPlayerTable = (teamPlayers: Player[]) => (
    <div className="glass-card overflow-auto max-h-[400px] rounded-2xl">
      <table className="w-full text-left min-w-[1000px]">
        <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
          <tr>
            <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-left w-[140px] md:w-[220px]">
              PLAYER
            </th>
            {renderSortHeader("MIN", "minutes")}
            {renderSortHeader("PTS", "points")}
            {renderSortHeader("REB", "rebounds")}
            {renderSortHeader("AST", "assists")}
            {renderSortHeader("STL", "steals")}
            {renderSortHeader("BLK", "blocks")}
            {renderSortHeader("TO", "turnovers")}
            {renderSortHeader("PF", "fouls")}
            {renderSortHeader("FG%", "fgPercentage")}
            {renderSortHeader("3P%", "threePtPercentage")}
            {renderSortHeader("FT%", "ftPercentage")}
            {renderSortHeader("+/-", "plusMinus")}
            <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center min-w-[60px]">
              FG
            </th>
            <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center min-w-[60px]">
              3PT
            </th>
            <th className="px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap text-center min-w-[60px]">
              FT
            </th>
            {renderSortHeader("OREB", "reboundsOffensive")}
            {renderSortHeader("DREB", "reboundsDefensive")}
          </tr>
        </thead>
        <tbody>
          {teamPlayers.map((player) => (
            <tr
              key={player.personId}
              className={`border-t border-white/10 ${player.isOnCourt ? "bg-text/5" : ""} hover:bg-white/5 transition-colors`}
            >
              <td className="px-4 py-3 whitespace-nowrap text-left max-w-[140px] md:max-w-[220px] overflow-hidden text-ellipsis">
                <div className="flex items-center gap-2">
                  {player.isOnCourt && (
                    <div
                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse shrink-0"
                      title="On Court"
                    />
                  )}
                  <PlayerLink
                    playerId={player.personId}
                    className="font-bold text-text truncate hover:text-accent transition-colors"
                    sourceComponent="stats_section_player_table"
                  >
                    {player.firstName.charAt(0)}. {player.lastName}
                  </PlayerLink>
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {
                  player.minutes
                    .replace("PT", "")
                    .replace("M", ":")
                    .replace("S", "")
                    .split(".")[0]
                }
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.points}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.rebounds}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.assists}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.steals}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.blocks}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.turnovers}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.fouls}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {formatPercentage(player.fgPercentage)}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {formatPercentage(player.threePtPercentage)}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {formatPercentage(player.ftPercentage)}
              </td>
              <td
                className={`px-4 py-3 text-center font-semibold whitespace-nowrap ${player.plusMinus > 0 ? "text-green-400" : player.plusMinus < 0 ? "text-red-400" : "text-text/90"}`}
              >
                {player.plusMinus > 0
                  ? `+${player.plusMinus}`
                  : player.plusMinus}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.fg}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.threePt}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.ft}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.reboundsOffensive}
              </td>
              <td className="px-4 py-3 font-semibold text-text/90 whitespace-nowrap text-center">
                {player.reboundsDefensive}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTeamStats = () => {
    const homeStats = gameData.homeTeam.statistics;
    const awayStats = gameData.awayTeam.statistics;

    if (!homeStats || !awayStats)
      return (
        <div className="p-4 text-center text-text/40">
          Team stats unavailable
        </div>
      );

    const formatWithAttempts = (
      pct: number,
      made: number | undefined,
      att: number | undefined,
      isAway: boolean = false,
    ) => {
      const pctStr = formatPercentage(pct);
      if (made !== undefined && att !== undefined) {
        return isAway
          ? `(${made}/${att}) ${pctStr}`
          : `${pctStr} (${made}/${att})`;
      }
      return pctStr;
    };

    const statsList = [
      {
        label: "Field Goal",
        home: homeStats.fieldGoalsPercentage,
        away: awayStats.fieldGoalsPercentage,
        homeDisplay: formatWithAttempts(
          homeStats.fieldGoalsPercentage,
          homeStats.fieldGoalsMade,
          homeStats.fieldGoalsAttempted,
          false,
        ),
        awayDisplay: formatWithAttempts(
          awayStats.fieldGoalsPercentage,
          awayStats.fieldGoalsMade,
          awayStats.fieldGoalsAttempted,
          true,
        ),
      },
      {
        label: "3PT",
        home: homeStats.threePointersPercentage,
        away: awayStats.threePointersPercentage,
        homeDisplay: formatWithAttempts(
          homeStats.threePointersPercentage,
          homeStats.threePointersMade,
          homeStats.threePointersAttempted,
          false,
        ),
        awayDisplay: formatWithAttempts(
          awayStats.threePointersPercentage,
          awayStats.threePointersMade,
          awayStats.threePointersAttempted,
          true,
        ),
      },
      {
        label: "Free Throw",
        home: homeStats.freeThrowsPercentage,
        away: awayStats.freeThrowsPercentage,
        homeDisplay: formatWithAttempts(
          homeStats.freeThrowsPercentage,
          homeStats.freeThrowsMade,
          homeStats.freeThrowsAttempted,
          false,
        ),
        awayDisplay: formatWithAttempts(
          awayStats.freeThrowsPercentage,
          awayStats.freeThrowsMade,
          awayStats.freeThrowsAttempted,
          true,
        ),
      },
      {
        label: "Rebounds (Total)",
        home: homeStats.reboundsTotal,
        away: awayStats.reboundsTotal,
      },
      {
        label: "Offensive Rebounds",
        home:
          homeStats.reboundsTeamOffensive || homeStats.reboundsOffensive || 0,
        away:
          awayStats.reboundsTeamOffensive || awayStats.reboundsOffensive || 0,
      },
      {
        label: "Defensive Rebounds",
        home:
          homeStats.reboundsTeamDefensive || homeStats.reboundsDefensive || 0,
        away:
          awayStats.reboundsTeamDefensive || awayStats.reboundsDefensive || 0,
      },
      { label: "Assists", home: homeStats.assists, away: awayStats.assists },
      { label: "Steals", home: homeStats.steals, away: awayStats.steals },
      { label: "Blocks", home: homeStats.blocks, away: awayStats.blocks },
      {
        label: "Turnovers",
        home: homeStats.turnovers,
        away: awayStats.turnovers,
      },
      {
        label: "PTS Off Turnovers",
        home: homeStats.pointsFromTurnovers || 0,
        away: awayStats.pointsFromTurnovers || 0,
      },
      {
        label: "Points in Paint",
        home: homeStats.pointsInThePaint,
        away: awayStats.pointsInThePaint,
      },
      {
        label: "Fast Break PTS",
        home: homeStats.pointsFastBreak || homeStats.fastBreakPoints || 0,
        away: awayStats.pointsFastBreak || awayStats.fastBreakPoints || 0,
      },
      {
        label: "Bench Points",
        home: homeStats.benchPoints || 0,
        away: awayStats.benchPoints || 0,
      },
    ];

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {statsList.map((stat, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-bold text-primary min-w-[3rem] text-left whitespace-nowrap">
                {(stat as any).homeDisplay ||
                  ((stat as any).format
                    ? (stat as any).format(stat.home)
                    : stat.home)}
              </span>
              <span className="text-text/40 font-medium uppercase tracking-wider text-xs px-2 truncate">
                {stat.label}
              </span>
              <span className="font-bold text-secondary min-w-[3rem] text-right whitespace-nowrap">
                {(stat as any).awayDisplay ||
                  ((stat as any).format
                    ? (stat as any).format(stat.away)
                    : stat.away)}
              </span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-text/10">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{
                  width: `${(stat.home / (stat.home + stat.away)) * 100}%`,
                }}
              />
              <div
                className="bg-secondary h-full transition-all duration-500"
                style={{
                  width: `${(stat.away / (stat.home + stat.away)) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    {
      id: "home",
      label: gameData.homeTeam.teamTricode,
      shortLabel: gameData.homeTeam.teamTricode,
    },
    {
      id: "away",
      label: gameData.awayTeam.teamTricode,
      shortLabel: gameData.awayTeam.teamTricode,
    },
    !isScheduled && { id: "team", label: "Team Stats", shortLabel: "Team" },
    !isScheduled && { id: "pbp", label: "Play by Play", shortLabel: "Plays" },
  ].filter(Boolean) as { id: string; label: string; shortLabel: string }[];

  return (
    <div className="rounded-2xl p-4 md:p-6 h-full">
      <div className="flex justify-center mb-6">
        <div className="bg-transparent rounded-xl p-1 flex gap-1 md:gap-2 relative w-full md:w-auto justify-between md:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex-1 md:flex-none px-2 md:px-6 py-2 rounded-lg font-display text-xs md:text-sm transition-colors duration-300 tracking-wide z-10 whitespace-nowrap ${activeTab === tab.id ? "text-text" : "text-text/60 hover:text-text"}`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeGameTab"
                  className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 uppercase hidden md:inline">
                {tab.label}
              </span>
              <span className="relative z-10 uppercase md:hidden">
                {tab.shortLabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-full">
        {activeTab === "home" &&
          (isScheduled
            ? renderRosterTable(homePlayers)
            : renderPlayerTable(sortedHomePlayers))}
        {activeTab === "away" &&
          (isScheduled
            ? renderRosterTable(awayPlayers)
            : renderPlayerTable(sortedAwayPlayers))}
        {activeTab === "team" && renderTeamStats()}
        {activeTab === "pbp" && (
          <div className="glass-card overflow-auto max-h-[400px] rounded-2xl p-4 space-y-2">
            {actions
              .slice()
              .reverse()
              .map((action) => {
                // Format clock from PT12M00.00S to 12:00
                let formattedClock = action.clock;
                if (action.clock.startsWith("PT")) {
                  const match = action.clock.match(/PT(\d+)M(\d+(\.\d+)?)S/);
                  if (match) {
                    const minutes = match[1];
                    const seconds = Math.floor(parseFloat(match[2]))
                      .toString()
                      .padStart(2, "0");
                    formattedClock = `${minutes}:${seconds}`;
                  }
                }

                return (
                  <div
                    key={action.actionNumber}
                    className="flex items-start gap-3 p-3"
                  >
                    <div className="text-xl font-mono text-text/40 mt-1 min-w-[60px] font-bold">
                      Q{action.period} {formattedClock}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-bold text-sm ${action.teamId === gameData.homeTeam.teamId ? "text-primary" : "text-secondary"}`}
                        >
                          {action.teamTricode}
                        </span>
                        <span className="text-xs text-text/60 uppercase tracking-wider border border-text/10 px-1.5 rounded">
                          {action.actionType}
                        </span>
                      </div>
                      <p className="text-sm text-text/90">
                        {action.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            {actions.length === 0 && (
              <div className="text-center text-text/40 py-10">
                No plays available yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsSection;
