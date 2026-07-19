"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowUpDown, Award, RefreshCw, X, ChevronRight } from "lucide-react";
import Layout from "@/app/components/Layout";
import Header from "@/app/components/Header";
import { useSeason } from "@/app/components/SeasonContext";
import { Skeleton } from "@/app/components/skeleton";
import PlayerLink from "@/app/components/PlayerLink";
import TeamLink from "@/app/components/TeamLink";

// Tab types
type ActiveTab = "transactions" | "trades" | "draft";
type TransactionFilter = "all" | "signings" | "trades" | "waivers";

interface TransactionRow {
  Transaction_Type: string;
  TRANSACTION_DATE: string;
  TRANSACTION_DESCRIPTION: string;
  TEAM_ID: number;
  TEAM_SLUG: string;
  PLAYER_ID: number;
  PLAYER_SLUG: string;
  GroupSort: string;
}

interface DraftPick {
  personId: number;
  playerName: string;
  season: string;
  roundNumber: number;
  roundPick: number;
  overallPick: number;
  teamId: number;
  teamCity: string;
  teamName: string;
  teamAbbreviation: string;
  organization: string;
}

const PLAYER_HEADSHOT_FALLBACK = "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";

export default function TransactionsClient() {
  const { season: globalSeason } = useSeason();
  const [activeTab, setActiveTab] = useState<ActiveTab>("transactions");
  const [txFilter, setTxFilter] = useState<TransactionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [draftPicks, setDraftPicks] = useState<DraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions and draft history for the active global season
  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [txRes, draftRes] = await Promise.all([
          fetch(`/api/transactions?season=${globalSeason}`),
          fetch(`/api/draft?season=${globalSeason}`),
        ]);

        if (!txRes.ok || !draftRes.ok) {
          throw new Error("Failed to load transactions or draft data.");
        }

        const txData = await txRes.json();
        const draftData = await draftRes.json();

        if (!isActive) return;
        setTransactions(txData.transactions || []);
        setDraftPicks(draftData.picks || []);
      } catch (err: any) {
        if (!isActive) return;
        setError(err?.message || "Failed to load player moves feed.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      isActive = false;
    };
  }, [globalSeason]);

  // Determine dynamic title based on the active global season
  const isOffseason = useMemo(() => {
    // Current date check or global season start check
    // Let's label July-September as offseason
    const month = new Date().getMonth();
    return month >= 6 && month <= 8;
  }, []);

  const pageTitle = useMemo(() => {
    if (activeTab === "draft") return "NBA Draft History";
    return isOffseason ? "Offseason Hub" : "Transactions Board";
  }, [activeTab, isOffseason]);

  // Filtered & searched transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter by transaction type
      if (txFilter === "signings" && tx.Transaction_Type !== "Signing" && tx.Transaction_Type !== "ContractConverted") {
        return false;
      }
      if (txFilter === "trades" && tx.Transaction_Type !== "Trade") {
        return false;
      }
      if (txFilter === "waivers" && tx.Transaction_Type !== "Waive" && tx.Transaction_Type !== "AwardOnWaivers") {
        return false;
      }

      // 2. Filter by search query (player name or description)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const playerMatch = tx.PLAYER_SLUG?.replace(/-/g, " ").toLowerCase().includes(query);
        const descMatch = tx.TRANSACTION_DESCRIPTION?.toLowerCase().includes(query);
        return playerMatch || descMatch;
      }

      return true;
    });
  }, [transactions, txFilter, searchQuery]);

  // Filtered & searched draft picks list
  const filteredDraftPicks = useMemo(() => {
    if (!searchQuery.trim()) return draftPicks;
    const query = searchQuery.toLowerCase();
    return draftPicks.filter((pick) => {
      return (
        pick.playerName?.toLowerCase().includes(query) ||
        pick.teamName?.toLowerCase().includes(query) ||
        pick.organization?.toLowerCase().includes(query)
      );
    });
  }, [draftPicks, searchQuery]);

  // Split draft picks by round for structured rendering
  const draftRounds = useMemo(() => {
    const round1 = filteredDraftPicks.filter((pick) => pick.roundNumber === 1);
    const round2 = filteredDraftPicks.filter((pick) => pick.roundNumber === 2);
    return { round1, round2 };
  }, [filteredDraftPicks]);

  // Helper to format dates cleanly
  const formatTxDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  // Helper for transaction badge styles
  const getBadgeStyle = (type: string) => {
    const norm = type.toLowerCase();
    if (norm === "signing" || norm === "contractconverted") {
      return "bg-[#0b5c16]/30 text-[#40c057] border-[#0b5c16]/70";
    }
    if (norm === "trade") {
      return "bg-[#0c5980]/30 text-[#339af0] border-[#0c5980]/70";
    }
    if (norm === "waive") {
      return "bg-[#801b0c]/30 text-[#ff6b6b] border-[#801b0c]/70";
    }
    return "bg-[#5c400b]/30 text-[#fcc419] border-[#5c400b]/70";
  };

  return (
    <Layout>
      <Header />
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {/* Title Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono tracking-wide text-primary uppercase">
              {pageTitle}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-text/60 font-sans">
              Draft selections, trades, extensions, and roster moves for the {globalSeason} season.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === "draft" ? "Search draft..." : "Search players or teams..."}
              className="w-full h-10 md:h-11 pl-10 pr-9 rounded-xl glass bg-white/5 border border-white/10 focus:outline-none text-sm text-text placeholder:text-text/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#352e2e] mb-6">
          {(["transactions", "trades", "draft"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setTxFilter(tab === "trades" ? "trades" : "all");
              }}
              className={`relative px-5 py-3 text-sm md:text-base font-bold tracking-wide uppercase transition-colors duration-200 ${
                activeTab === tab ? "text-text" : "text-text/50 hover:text-text"
              }`}
            >
              {tab === "transactions" && "All Moves"}
              {tab === "trades" && "Trades"}
              {tab === "draft" && "NBA Draft"}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTransactionsTab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                  transition={{ duration: 0.25 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Dynamic Filters for All Moves Tab */}
        {activeTab === "transactions" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(["all", "signings", "trades", "waivers"] as TransactionFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTxFilter(filter)}
                className={`px-4 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-200 capitalize ${
                  txFilter === filter
                    ? "bg-white/10 border-accent text-text"
                    : "bg-white/[0.02] border-white/5 text-text/60 hover:bg-white/5 hover:text-text"
                }`}
              >
                {filter === "all" ? "All Types" : filter}
              </button>
            ))}
          </div>
        )}

        {/* Content Section */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`tx-skeleton-${idx}`}
                className="h-[120px] rounded-2xl border border-white/5 bg-white/[0.02] p-5 flex gap-4 items-center"
              >
                <Skeleton className="w-16 h-16 rounded-full bg-white/10 shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-1/4 bg-white/10" />
                  <Skeleton className="h-3.5 w-2/3 bg-white/10" />
                  <Skeleton className="h-3 w-1/2 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-6 text-center text-text/80">
            {error}
          </div>
        ) : activeTab === "draft" ? (
          // DRAFT BOARD TAB VIEW
          <div className="space-y-10">
            {filteredDraftPicks.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-text/50 font-sans">
                No draft selections found matching your search.
              </div>
            ) : (
              <>
                {/* Round 1 Picks */}
                {draftRounds.round1.length > 0 && (
                  <section className="rounded-2xl bg-[#27272b]/82 p-5 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-text mb-5 border-b border-[#3c3434] pb-2 uppercase">
                      Round 1 Picks
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm sm:text-base border-collapse">
                        <thead>
                          <tr className="border-b border-[#3c3434] text-text/40 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                            <th className="py-3 px-2">Pick</th>
                            <th className="py-3 px-2">Player</th>
                            <th className="py-3 px-2">Drafted By</th>
                            <th className="py-3 px-2">College/Organization</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3c3434]/40">
                          {draftRounds.round1.map((pick) => (
                            <tr key={`pick-r1-${pick.overallPick}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-primary">#{pick.overallPick}</td>
                              <td className="py-3 px-2 font-semibold">
                                <PlayerLink playerId={pick.personId} className="hover:text-primary transition-colors">
                                  {pick.playerName}
                                </PlayerLink>
                              </td>
                              <td className="py-3 px-2">
                                <TeamLink teamId={pick.teamId} className="flex items-center gap-2.5 hover:text-primary transition-colors">
                                  <img
                                    src={`https://cdn.nba.com/logos/nba/${pick.teamId}/primary/L/logo.svg`}
                                    alt={pick.teamName}
                                    className="w-7 h-7 object-contain bg-white/5 rounded-full p-0.5"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                  <span>{pick.teamCity} {pick.teamName}</span>
                                </TeamLink>
                              </td>
                              <td className="py-3 px-2 text-text/70">{pick.organization || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Round 2 Picks */}
                {draftRounds.round2.length > 0 && (
                  <section className="rounded-2xl bg-[#27272b]/82 p-5 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-text mb-5 border-b border-[#3c3434] pb-2 uppercase">
                      Round 2 Picks
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm sm:text-base border-collapse">
                        <thead>
                          <tr className="border-b border-[#3c3434] text-text/40 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                            <th className="py-3 px-2">Pick</th>
                            <th className="py-3 px-2">Player</th>
                            <th className="py-3 px-2">Drafted By</th>
                            <th className="py-3 px-2">College/Organization</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3c3434]/40">
                          {draftRounds.round2.map((pick) => (
                            <tr key={`pick-r2-${pick.overallPick}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-primary">#{pick.overallPick}</td>
                              <td className="py-3 px-2 font-semibold">
                                <PlayerLink playerId={pick.personId} className="hover:text-primary transition-colors">
                                  {pick.playerName}
                                </PlayerLink>
                              </td>
                              <td className="py-3 px-2">
                                <TeamLink teamId={pick.teamId} className="flex items-center gap-2.5 hover:text-primary transition-colors">
                                  <img
                                    src={`https://cdn.nba.com/logos/nba/${pick.teamId}/primary/L/logo.svg`}
                                    alt={pick.teamName}
                                    className="w-7 h-7 object-contain bg-white/5 rounded-full p-0.5"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                  <span>{pick.teamCity} {pick.teamName}</span>
                                </TeamLink>
                              </td>
                              <td className="py-3 px-2 text-text/70">{pick.organization || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          // TRANSACTIONS / TRADES TAB VIEW
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-text/50 font-sans">
                No roster moves found matching your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTransactions.map((tx, idx) => {
                  const hasPlayer = tx.PLAYER_ID && tx.PLAYER_ID > 0;
                  const hasTeam = tx.TEAM_ID && tx.TEAM_ID > 0;

                  return (
                    <motion.div
                      key={`tx-card-${tx.GroupSort || idx}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                      className="rounded-2xl border border-[#352e2e] bg-[#222226]/80 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative hover:border-[#4d4242] transition-colors"
                    >
                      {/* Player Image or Team Logo */}
                      <div className="relative shrink-0 w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                        {hasPlayer ? (
                          <img
                            src={`https://cdn.nba.com/headshots/nba/latest/260x190/${tx.PLAYER_ID}.png`}
                            alt={tx.PLAYER_SLUG}
                            className="w-16 h-16 object-cover translate-y-1 scale-110"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = PLAYER_HEADSHOT_FALLBACK;
                            }}
                          />
                        ) : hasTeam ? (
                          <img
                            src={`https://cdn.nba.com/logos/nba/${tx.TEAM_ID}/primary/L/logo.svg`}
                            alt={tx.TEAM_SLUG}
                            className="w-11 h-11 object-contain"
                          />
                        ) : (
                          <Award className="w-7 h-7 text-text/40" />
                        )}
                      </div>

                      {/* Transaction details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border ${getBadgeStyle(tx.Transaction_Type)}`}>
                            {tx.Transaction_Type}
                          </span>
                          <span className="text-xs text-text/50 font-mono">
                            {formatTxDate(tx.TRANSACTION_DATE)}
                          </span>
                        </div>
                        <p className="text-sm sm:text-base text-text/90 leading-relaxed pr-2 font-sans font-medium">
                          {tx.TRANSACTION_DESCRIPTION}
                        </p>
                      </div>

                      {/* Quick Navigation Links */}
                      <div className="flex gap-2 sm:flex-col shrink-0 w-full sm:w-auto sm:border-l border-[#352e2e]/60 sm:pl-4 pt-3 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0">
                        {hasPlayer && (
                          <PlayerLink
                            playerId={tx.PLAYER_ID}
                            className="flex-1 sm:flex-none text-center sm:text-left px-3 py-1 rounded-lg bg-white/5 hover:bg-[#339af0]/20 hover:text-[#339af0] transition-all text-xs font-bold tracking-wide flex items-center justify-center sm:justify-start gap-1 w-full"
                          >
                            <span>Player Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </PlayerLink>
                        )}
                        {hasTeam && (
                          <TeamLink
                            teamId={tx.TEAM_ID}
                            className="flex-1 sm:flex-none text-center sm:text-left px-3 py-1 rounded-lg bg-white/5 hover:bg-[#40c057]/20 hover:text-[#40c057] transition-all text-xs font-bold tracking-wide flex items-center justify-center sm:justify-start gap-1 w-full"
                          >
                            <span>Team Page</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </TeamLink>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
