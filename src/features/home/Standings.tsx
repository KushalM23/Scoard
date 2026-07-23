"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import TeamLink from "@/components/links/TeamLink";
import { Skeleton } from "@/components/ui/skeleton";
import StatTooltip from "@/components/ui/StatTooltip";
import { useSeason } from "@/providers/SeasonProvider";

const TEAM_CODES: Record<number, string> = {
  1610612737: "ATL",
  1610612738: "BOS",
  1610612751: "BKN",
  1610612766: "CHA",
  1610612741: "CHI",
  1610612739: "CLE",
  1610612742: "DAL",
  1610612743: "DEN",
  1610612765: "DET",
  1610612744: "GSW",
  1610612745: "HOU",
  1610612754: "IND",
  1610612746: "LAC",
  1610612747: "LAL",
  1610612763: "MEM",
  1610612748: "MIA",
  1610612749: "MIL",
  1610612750: "MIN",
  1610612740: "NOP",
  1610612752: "NYK",
  1610612760: "OKC",
  1610612753: "ORL",
  1610612755: "PHI",
  1610612756: "PHX",
  1610612757: "POR",
  1610612758: "SAC",
  1610612759: "SAS",
  1610612761: "TOR",
  1610612762: "UTA",
  1610612764: "WAS",
};

interface TeamStanding {
  teamId: number;
  teamCity: string;
  teamName: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  winPct: number;
  homeRecord: string;
  roadRecord: string;
  l10: string;
  streak: string;
  plusminus: string;
  pointsPg: number;
  oppPointsPg: number;
  diffPointsPg: number;
  conferenceRank: number;
  divisionRank: number;
  divgamesback: number;
  leagueGamesBack: number;
  conferenceGamesBack: number;
}

const Standings: React.FC = () => {
  const { season: globalSeason } = useSeason();
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<
    "Conference" | "Division" | "League"
  >("Conference");
  const [activeTab, setActiveTab] = useState("East");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TeamStanding | "gb" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const handleSort = (key: keyof TeamStanding | "gb") => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedTeams = (teams: TeamStanding[]) => {
    const filteredTeams = teams.filter((t) => {
      const tab = currentTabs.find((tab) => tab.id === activeTab);
      if (viewMode === "League") return true;
      if (tab?.type === "conference") return t.conference === tab.value;
      return t.division === tab?.value;
    });

    if (!sortConfig.key) {
      return filteredTeams.sort((a, b) => {
        const tab = currentTabs.find((tab) => tab.id === activeTab);
        if (viewMode === "League") return a.winPct > b.winPct ? -1 : 1;
        if (tab?.type === "conference")
          return a.conferenceRank - b.conferenceRank;
        return a.divisionRank - b.divisionRank;
      });
    }

    return filteredTeams.sort((a, b) => {
      let aValue: any =
        sortConfig.key === "gb"
          ? viewMode === "Conference"
            ? a.conferenceGamesBack
            : viewMode === "Division"
              ? a.divgamesback
              : a.leagueGamesBack
          : a[sortConfig.key as keyof TeamStanding];

      let bValue: any =
        sortConfig.key === "gb"
          ? viewMode === "Conference"
            ? b.conferenceGamesBack
            : viewMode === "Division"
              ? b.divgamesback
              : b.leagueGamesBack
          : b[sortConfig.key as keyof TeamStanding];

      // Handle special cases
      if (
        ["homeRecord", "roadRecord", "l10"].includes(sortConfig.key as string)
      ) {
        // Parse "W-L" to win percentage
        const parseRecord = (rec: string) => {
          if (typeof rec !== "string") return 0;
          const parts = rec.split("-");
          if (parts.length !== 2) return 0;
          const w = parseInt(parts[0]);
          const l = parseInt(parts[1]);
          return w / (w + l || 1);
        };
        aValue = parseRecord(aValue as string);
        bValue = parseRecord(bValue as string);
      } else if (sortConfig.key === "streak") {
        // Parse "Won 5" or "Lost 2" to number (positive for W, negative for L)
        const parseStreak = (str: string) => {
          if (typeof str !== "string") return 0;
          const val = parseInt(str.replace(/[^0-9]/g, ""));
          return str.includes("L") || str.includes("Lost") ? -val : val;
        };
        aValue = parseStreak(aValue as string);
        bValue = parseStreak(bValue as string);
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  const conferenceTabs = [
    { id: "East", label: "East", type: "conference", value: "East" },
    { id: "West", label: "West", type: "conference", value: "West" },
  ];

  const divisionTabs = [
    { id: "Atl", label: "Atl", type: "division", value: "Atlantic" },
    { id: "Cen", label: "Cen", type: "division", value: "Central" },
    { id: "SE", label: "SE", type: "division", value: "Southeast" },
    { id: "NW", label: "NW", type: "division", value: "Northwest" },
    { id: "Pac", label: "Pac", type: "division", value: "Pacific" },
    { id: "SW", label: "SW", type: "division", value: "Southwest" },
  ];

  const leagueTabs = [
    { id: "All", label: "League", type: "league", value: "All" },
  ];

  const currentTabs =
    viewMode === "Conference"
      ? conferenceTabs
      : viewMode === "Division"
        ? divisionTabs
        : leagueTabs;

  useEffect(() => {
    if (viewMode === "Conference") {
      setActiveTab("East");
    } else if (viewMode === "Division") {
      setActiveTab("Atl");
    } else {
      setActiveTab("All");
    }
  }, [viewMode]);

  const fetchStandings = async (bustCache = false) => {
    try {
      setLoading(true);
      const url = `/api/standings?season=${globalSeason}${
        bustCache ? "&bustCache=true" : ""
      }`;
      const response = await axios.get(url);

      if (Array.isArray(response.data) && response.data.length > 0) {
        setStandings(response.data);
        setError(null);
      } else {
        setError("No standings data found");
      }
    } catch (err: any) {
      console.error("Error fetching standings:", err);
      setError(err.message || "Failed to load standings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [globalSeason]);

  const renderSortableHeader = (
    label: string,
    key: keyof TeamStanding | "gb",
    align: "left" | "center" | "right" = "center",
  ) => {
    const alignClass =
      align === "left"
        ? "text-left"
        : align === "right"
          ? "text-right"
          : "text-center";

    return (
      <th
        className={`px-4 py-3 text-sm md:text-base font-semibold font-mono tracking-[0.05em] whitespace-nowrap ${alignClass} cursor-pointer hover:text-text transition-colors group select-none`}
        onClick={() => handleSort(key)}
      >
        <div
          className={`flex items-center gap-1 ${align === "center" ? "justify-center" : ""}`}
        >
          <StatTooltip label={label} />
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
  };

  const renderTable = (teams: TeamStanding[]) => (
    <div className="mb-8 bg-white/5 overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-center whitespace-nowrap">
          <thead className="text-[13px] md:text-sm uppercase text-text/70 bg-white/[0.03]">
            <tr>
              <th className="p-0 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)] min-w-[140px] md:min-w-[200px]">
                <div className="px-4 py-3 text-md md:text-base font-semibold font-mono tracking-[0.05em] text-center">
                  Team
                </div>
              </th>
              {renderSortableHeader("W", "wins")}
              {renderSortableHeader("L", "losses")}
              {renderSortableHeader("GB", "gb")}
              {renderSortableHeader("Pct", "winPct")}
              {renderSortableHeader("Home", "homeRecord")}
              {renderSortableHeader("Road", "roadRecord")}
              {renderSortableHeader("L10", "l10")}
              {renderSortableHeader("Strk", "streak")}
              {renderSortableHeader("PPG", "pointsPg")}
              {renderSortableHeader("OPPG", "oppPointsPg")}
              {renderSortableHeader("+/-", "diffPointsPg")}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr
                key={team.teamId}
                className="border-t border-white/10 hover:bg-white/5 transition-colors duration-200"
              >
                <td className="px-5 py-4 font-semibold text-text/90 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.3)] text-left whitespace-nowrap">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-text/50 w-4 text-right font-mono text-sm">
                      {/* Rank Logic: If sorted, show order index. If default sort, show official rank. */}
                      {sortConfig.key
                        ? teams.findIndex((t) => t.teamId === team.teamId) + 1
                        : viewMode === "Conference"
                          ? team.conferenceRank
                          : viewMode === "Division"
                            ? team.divisionRank
                            : teams.findIndex((t) => t.teamId === team.teamId) +
                              1}
                    </span>
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={`https://cdn.nba.com/logos/nba/${team.teamId}/primary/L/logo.svg`}
                        alt={team.teamName}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <TeamLink
                        teamId={team.teamId}
                        sourceComponent="standings"
                        className="hidden sm:inline hover:text-accent transition-colors"
                      >
                        {team.teamCity} {team.teamName}
                      </TeamLink>
                      <TeamLink
                        teamId={team.teamId}
                        sourceComponent="standings"
                        className="sm:hidden font-mono tracking-wider text-xs hover:text-accent transition-colors"
                      >
                        {TEAM_CODES[team.teamId] || team.teamName}
                      </TeamLink>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.wins}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.losses}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {viewMode === "Conference"
                    ? team.conferenceGamesBack
                    : viewMode === "Division"
                      ? team.divgamesback
                      : team.leagueGamesBack}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {(team.winPct * 100).toFixed(1)}%
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.homeRecord}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.roadRecord}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.l10}
                </td>
                <td
                  className={`px-5 py-4 text-center font-semibold whitespace-nowrap ${team.streak.startsWith("W") ? "text-green-400" : "text-red-400"}`}
                >
                  {team.streak}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.pointsPg}
                </td>
                <td className="px-5 py-4 text-center font-semibold text-text/90 whitespace-nowrap">
                  {team.oppPointsPg}
                </td>
                <td
                  className={`px-5 py-4 text-center font-semibold whitespace-nowrap ${team.diffPointsPg > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {team.diffPointsPg > 0 ? "+" : ""}
                  {team.diffPointsPg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="mb-8 glass-card overflow-hidden rounded-2xl p-4 md:p-6 space-y-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          {Array.from({ length: 12 }).map((_, index) => (
            <Skeleton key={`standings-row-skeleton-${index}`} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="glass-card p-6 flex flex-col items-center gap-4 max-w-md mx-4">
          <p className="text-red-400 font-mono text-center">
            {error.toUpperCase()}
          </p>
          <button
            onClick={() => fetchStandings(true)}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-display transition-all hover:scale-105"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-bold text-text font-mono tracking-wide">
          Standings
        </h2>

        <div className="relative">
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-accent/50 group"
          >
            <span className="font-medium text-sm font-display group-hover:text-accent transition-colors">
              {viewMode}
            </span>
            <motion.div
              animate={{ rotate: isDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-text/60" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute top-full right-0 mt-2 w-48 bg-background border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden ring-1 ring-white/5"
              >
                <button
                  onClick={() => {
                    setViewMode("Conference");
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors hover:bg-white/5 border-l-2 border-transparent hover:border-accent"
                >
                  <span
                    className={`font-medium text-sm font-display transition-colors ${viewMode === "Conference" ? "text-accent" : "text-text/70 group-hover:text-text"}`}
                  >
                    Conference
                  </span>
                  {viewMode === "Conference" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setViewMode("Division");
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors hover:bg-white/5 border-l-2 border-transparent hover:border-accent"
                >
                  <span
                    className={`font-medium text-sm font-display transition-colors ${viewMode === "Division" ? "text-accent" : "text-text/70 group-hover:text-text"}`}
                  >
                    Division
                  </span>
                  {viewMode === "Division" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setViewMode("League");
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors hover:bg-white/5 border-l-2 border-transparent hover:border-accent"
                >
                  <span
                    className={`font-medium text-sm font-display transition-colors ${viewMode === "League" ? "text-accent" : "text-text/70 group-hover:text-text"}`}
                  >
                    League
                  </span>
                  {viewMode === "League" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {standings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py- gap-4">
          <p className="text-text/40 font-mono">NO STANDINGS DATA AVAILABLE</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {viewMode !== "League" && (
            <div className="flex justify-center w-full">
              <div
                className={`glass rounded-xl p-1 grid ${viewMode === "Conference" ? "grid-cols-2 w-full md:w-auto" : "grid-cols-6 w-full md:w-auto"} gap-1 relative`}
              >
                {currentTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-1 md:px-6 py-2 rounded-lg font-bold text-[10px] md:text-sm transition-colors duration-300 font-display tracking-wide z-10 ${activeTab === tab.id ? "text-text" : "text-text/60 hover:text-text"}`}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeStandingsTab"
                        className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <span className="relative z-10 uppercase whitespace-nowrap">
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderTable(getSortedTeams(standings))}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default Standings;
