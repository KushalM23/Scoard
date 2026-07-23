"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import PlayerLink from "@/components/links/PlayerLink";
import TeamLink from "@/components/links/TeamLink";
import { Skeleton } from "@/components/ui/skeleton";
import StatTooltip from "@/components/ui/StatTooltip";
import Scoreboard from "@/features/game/Scoreboard";
import VirtualCourt from "@/features/game/VirtualCourt";
import StatsSection from "@/features/game/StatsSection";
import Loading from "@/components/ui/Loading";
import type {
  GameData,
  Matchup,
  PlayByPlayEvent,
  Player,
  WinProbability as WinProbType,
} from "@/types";
import { useSeason } from "@/providers/SeasonProvider";

function WinProbabilityCard({
  data,
  homeTeamName,
  awayTeamName,
}: {
  data: WinProbType;
  homeTeamName: string;
  awayTeamName: string;
}) {
  return (
    <div className="glass-card mx-auto mb-4 max-w-2xl p-4">
      <h3 className="mb-4 text-center text-lg font-bold">Win Probability</h3>

      <div className="relative flex h-8 overflow-hidden rounded-full bg-background/30">
        <div
          className="flex h-full items-center justify-start bg-primary pl-3 transition-all duration-1000 ease-out"
          style={{ width: `${data.homeWinProb}%` }}
        >
          <span className="whitespace-nowrap text-xs font-bold text-background">
            {data.homeWinProb.toFixed(1)}%
          </span>
        </div>
        <div
          className="flex h-full items-center justify-end bg-secondary pr-3 transition-all duration-1000 ease-out"
          style={{ width: `${data.awayWinProb}%` }}
        >
          <span className="whitespace-nowrap text-xs font-bold text-background">
            {data.awayWinProb.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-2 flex justify-between px-2 text-sm">
        <div className="flex flex-col">
          <span className="font-bold text-primary">{homeTeamName}</span>
          <span className="text-xs text-text/40">
            {(data.homeWinPct * 100).toFixed(1)}% Win Rate
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-bold text-secondary">{awayTeamName}</span>
          <span className="text-xs text-text/40">
            {(data.awayWinPct * 100).toFixed(1)}% Win Rate
          </span>
        </div>
      </div>
    </div>
  );
}

function PreviousMatchupCard({ matchup }: { matchup: Matchup }) {
  const router = useRouter();
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchScore = async () => {
      try {
        const res = await axios.get(`/api/games/${matchup.gameId}`);
        if (isMounted) {
          setGameData(res.data.game || res.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch previous matchup score", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchScore();

    return () => {
      isMounted = false;
    };
  }, [matchup.gameId]);

  if (loading) {
    return (
      <div className="flex h-[72px] items-center rounded-lg bg-background/30 p-3">
        <div className="w-full">
          <Skeleton className="mx-auto mb-2 h-2.5 w-20" />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-10" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        </div>
      </div>
    );
  }

  if (!gameData) {
    return null;
  }

  const { homeTeam, awayTeam } = gameData;
  const isHomeWinner = Number(homeTeam.score) > Number(awayTeam.score);

  return (
    <div
      onClick={() => router.push(`/game/${matchup.gameId}`)}
      className="flex cursor-pointer items-center justify-between rounded-lg bg-background/30 p-3 transition-colors hover:bg-background/50"
    >
      <div className="flex w-full flex-col">
        <span className="mb-1 text-center text-xs text-text/40">
          {new Date(matchup.gameDate).toLocaleDateString()}
        </span>
        <div className="flex w-full items-center justify-between px-4">
          <TeamLink
            teamId={homeTeam.teamId}
            sourceComponent="previous_matchups"
            stopPropagation
            className={`w-1/3 text-left font-display text-2xl transition-colors hover:text-accent ${
              isHomeWinner ? "text-text" : "text-text/40"
            }`}
          >
            {homeTeam.teamTricode}
          </TeamLink>

          <span
            className={`w-1/3 text-center font-mono text-4xl font-bold ${
              isHomeWinner
                ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                : "text-text/40"
            }`}
          >
            {homeTeam.score}
          </span>

          <span className="w-1/3 text-center font-mono text-4xl font-bold">
            -
          </span>

          <span
            className={`w-1/3 text-center font-mono text-4xl font-bold ${
              !isHomeWinner
                ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                : "text-text/40"
            }`}
          >
            {awayTeam.score}
          </span>

          <TeamLink
            teamId={awayTeam.teamId}
            sourceComponent="previous_matchups"
            stopPropagation
            className={`w-1/3 text-right font-display text-2xl transition-colors hover:text-accent ${
              !isHomeWinner ? "text-text" : "text-text/40"
            }`}
          >
            {awayTeam.teamTricode}
          </TeamLink>
        </div>
      </div>
    </div>
  );
}

function PreviousMatchupsSection({ matchups }: { matchups: Matchup[] }) {
  if (!matchups || matchups.length === 0) {
    return (
      <div className="glass-card mx-auto mb-4 max-w-2xl p-4">
        <h3 className="mb-2 text-lg font-bold">Previous Matchups</h3>
        <p className="text-sm text-text/40">No previous matchups this season.</p>
      </div>
    );
  }

  return (
    <div className="glass-card mx-auto mb-4 max-w-2xl p-4">
      <h3 className="mb-4 text-center text-lg font-bold">Previous Matchups</h3>
      <div className="flex flex-col gap-2">
        {matchups.map((game) => (
          <PreviousMatchupCard key={game.gameId} matchup={game} />
        ))}
      </div>
    </div>
  );
}

function TopPerformersSection({
  homeTeamName,
  awayTeamName,
  homePlayers,
  awayPlayers,
}: {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: Player[];
  awayPlayers: Player[];
}) {
  const getTopPerformers = (players: Player[]) =>
    [...players].sort((a, b) => b.points - a.points).slice(0, 2);

  const renderPerformerCard = (player: Player) => (
    <div
      key={player.personId}
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3"
    >
      <img
        src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`}
        alt={`${player.firstName} ${player.lastName}`}
        className="h-12 w-12 rounded-full bg-white/10 object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
        }}
      />
      <div className="min-w-0 flex-1">
        <PlayerLink
          playerId={player.personId}
          className="block truncate text-sm font-bold transition-colors hover:text-accent"
          sourceComponent="top_performers_card"
        >
          {player.firstName.charAt(0)}. {player.lastName}
        </PlayerLink>
        <div className="flex gap-2 text-xs text-text/60">
          <span>
            {player.points} <StatTooltip label="PTS" />
          </span>
          <span>
            {player.assists} <StatTooltip label="AST" />
          </span>
          <span>
            {player.rebounds} <StatTooltip label="REB" />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="glass-card mx-auto mb-4 max-w-2xl p-4">
      <h3 className="mb-4 text-center text-lg font-display">Top Performers</h3>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-center text-sm font-display uppercase tracking-wider text-primary">
            {homeTeamName}
          </h4>
          <div className="flex flex-col gap-2">
            {getTopPerformers(homePlayers).map(renderPerformerCard)}
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-center text-sm font-display uppercase tracking-wider text-secondary">
            {awayTeamName}
          </h4>
          <div className="flex flex-col gap-2">
            {getTopPerformers(awayPlayers).map(renderPerformerCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Game() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;

  const { setIsDropdownDisabled, setActiveSeasonContext } = useSeason();

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [pbpData, setPbpData] = useState<PlayByPlayEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    setIsDropdownDisabled(true);
    return () => {
      setIsDropdownDisabled(false);
      setActiveSeasonContext(null);
    };
  }, [gameId]);

  useEffect(() => {
    if (gameData && gameData.gameId) {
      const yrPart = gameData.gameId.substring(3, 5);
      const yrNum = Number(yrPart);
      if (!isNaN(yrNum)) {
        const startYear = yrNum >= 96 ? 1900 + yrNum : 2000 + yrNum;
        const endYear = (startYear + 1) % 100;
        const gameSeason = `${startYear}-${String(endYear).padStart(2, "0")}`;
        setActiveSeasonContext(gameSeason);
      }
    }
  }, [gameData]);

  // Initial data fetch
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      let finishedCoreLoad = false;

      if (!gameId) {
        if (isMounted) {
          setError("Invalid game id.");
          setLoading(false);
        }
        return;
      }

      try {
        const bustCache = retryTrigger > 0;
        const cacheParam = bustCache ? "?bustCache=true" : "";
        const boxRes = await axios.get(`/api/games/${gameId}${cacheParam}`, {
          timeout: 30000,
        });

        if (!isMounted) return;

        const rawGameData = boxRes.data.game || boxRes.data;

        if (rawGameData && rawGameData.gameId) {
          const game = rawGameData;

          const normalizeTeam = (team: any) => ({
            ...team,
            inBonus:
              team.inBonus === "1" ||
              team.inBonus === 1 ||
              team.inBonus === true,
            wins: team.wins || 0,
            losses: team.losses || 0,
            periods: Array.isArray(team.periods)
              ? team.periods.map((p: any) =>
                  typeof p === "object" && p !== null && "score" in p
                    ? p.score
                    : p,
                )
              : [],
            statistics: {
              ...team.statistics,
              // Ensure key metrics are available under consistent names
              fastBreakPoints:
                team.statistics?.pointsFastBreak !== undefined
                  ? team.statistics.pointsFastBreak
                  : team.statistics?.fastBreakPoints,
              benchPoints: team.statistics?.benchPoints,
              pointsFromTurnovers: team.statistics?.pointsFromTurnovers,
              reboundsOffensive: team.statistics?.reboundsOffensive,
              reboundsDefensive: team.statistics?.reboundsDefensive,
              biggestLead: team.statistics?.biggestLead,
            },
          });

          const normalizedGame = {
            ...game,
            homeTeam: normalizeTeam(game.homeTeam),
            awayTeam: normalizeTeam(game.awayTeam),
          };

          setGameData(normalizedGame);

          const allPlayers: Player[] = [];

          const mapPlayer = (p: any, teamId: number) => {
            const stats = p.statistics || p;

            return {
              personId: p.personId,
              firstName: p.firstName,
              lastName: p.familyName || p.lastName,
              jersey: p.jerseyNum || p.jersey,
              position: p.position,
              status: p.status,
              notPlayingReason: p.notPlayingDescription || p.notPlayingReason,
              points: stats.points || 0,
              rebounds: stats.reboundsTotal || stats.rebounds || 0,
              assists: stats.assists || 0,
              fouls: stats.foulsPersonal || stats.fouls || 0,
              fgPercentage:
                stats.fieldGoalsPercentage || stats.fgPercentage || 0,
              threePtPercentage:
                stats.threePointersPercentage || stats.threePtPercentage || 0,
              ftPercentage:
                stats.freeThrowsPercentage || stats.ftPercentage || 0,
              plusMinus: stats.plusMinusPoints || stats.plusMinus || 0,
              fg: stats.fieldGoalsMade
                ? `${stats.fieldGoalsMade}-${stats.fieldGoalsAttempted}`
                : stats.fg || "0-0",
              threePt: stats.threePointersMade
                ? `${stats.threePointersMade}-${stats.threePointersAttempted}`
                : stats.threePt || "0-0",
              ft: stats.freeThrowsMade
                ? `${stats.freeThrowsMade}-${stats.freeThrowsAttempted}`
                : stats.ft || "0-0",
              minutes: stats.minutes || "0",
              blocks: stats.blocks || 0,
              steals: stats.steals || 0,
              turnovers: stats.turnovers || 0,
              reboundsOffensive: stats.reboundsOffensive || 0,
              reboundsDefensive: stats.reboundsDefensive || 0,
              isOnCourt:
                p.onCourt === "1" || p.onCourt === 1 || p.isOnCourt === true,
              teamId: teamId,
            };
          };

          if (game.players && Array.isArray(game.players)) {
            allPlayers.push(
              ...game.players.map((p: any) => mapPlayer(p, p.teamId)),
            );
          } else {
            if (game.homeTeam && game.homeTeam.players) {
              allPlayers.push(
                ...game.homeTeam.players.map((p: any) =>
                  mapPlayer(p, game.homeTeam.teamId),
                ),
              );
            }
            if (game.awayTeam && game.awayTeam.players) {
              allPlayers.push(
                ...game.awayTeam.players.map((p: any) =>
                  mapPlayer(p, game.awayTeam.teamId),
                ),
              );
            }
          }

          setPlayers(allPlayers);
        }
        setError(null);

        // Render game page as soon as core game data is ready.
        finishedCoreLoad = true;
        setLoading(false);

        // Fetch PBP in the background so scheduled/slow PBP doesn't block page load.
        void axios
          .get(`/api/games/${gameId}/pbp${cacheParam}`, { timeout: 20000 })
          .then((pbpRes) => {
            if (!isMounted) return;
            if (pbpRes.data && pbpRes.data.game && pbpRes.data.game.actions) {
              setPbpData(pbpRes.data.game.actions);
            }
          })
          .catch((pbpError) => {
            console.warn("PBP fetch failed; continuing without PBP", pbpError);
          });
      } catch (error) {
        console.error("Error fetching game data:", error);
        setError("Failed to load game data. Please try again later.");
      } finally {
        if (isMounted && !finishedCoreLoad) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [gameId, retryTrigger]);

  // SSE for real-time updates
  useEffect(() => {
    if (!gameId || !gameData) return;

    // Skip SSE for finished games
    if (gameData.gameStatus === 3) {
      console.log("Game finished, skipping SSE");
      return;
    }

    console.log("Connecting to SSE for game:", gameId);
    const eventSource = new EventSource(`/api/games/${gameId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        console.log("SSE update received for game:", gameId);

        const normalizeTeam = (team: any) => ({
          ...team,
          inBonus:
            team.inBonus === "1" || team.inBonus === 1 || team.inBonus === true,
          wins: team.wins || 0,
          losses: team.losses || 0,
          periods: Array.isArray(team.periods)
            ? team.periods.map((p: any) =>
                typeof p === "object" && p !== null && "score" in p
                  ? p.score
                  : p,
              )
            : [],
          statistics: team.statistics,
        });

        const normalizedGame = {
          ...newData,
          homeTeam: normalizeTeam(newData.homeTeam),
          awayTeam: normalizeTeam(newData.awayTeam),
        };

        setGameData(normalizedGame);
        if (Array.isArray(newData.pbpActions)) {
          setPbpData(newData.pbpActions);
        }

        // Update players if available
        if (newData.players && Array.isArray(newData.players)) {
          const mapPlayer = (p: any, teamId: number) => {
            const stats = p.statistics || p;

            return {
              personId: p.personId,
              firstName: p.firstName,
              lastName: p.familyName || p.lastName,
              jersey: p.jerseyNum || p.jersey,
              position: p.position,
              status: p.status,
              notPlayingReason: p.notPlayingDescription || p.notPlayingReason,
              points: stats.points || 0,
              rebounds: stats.reboundsTotal || stats.rebounds || 0,
              assists: stats.assists || 0,
              fouls: stats.foulsPersonal || stats.fouls || 0,
              fgPercentage:
                stats.fieldGoalsPercentage || stats.fgPercentage || 0,
              threePtPercentage:
                stats.threePointersPercentage || stats.threePtPercentage || 0,
              ftPercentage:
                stats.freeThrowsPercentage || stats.ftPercentage || 0,
              plusMinus: stats.plusMinusPoints || stats.plusMinus || 0,
              fg: stats.fieldGoalsMade
                ? `${stats.fieldGoalsMade}-${stats.fieldGoalsAttempted}`
                : stats.fg || "0-0",
              threePt: stats.threePointersMade
                ? `${stats.threePointersMade}-${stats.threePointersAttempted}`
                : stats.threePt || "0-0",
              ft: stats.freeThrowsMade
                ? `${stats.freeThrowsMade}-${stats.freeThrowsAttempted}`
                : stats.ft || "0-0",
              minutes: stats.minutes || "0",
              blocks: stats.blocks || 0,
              steals: stats.steals || 0,
              turnovers: stats.turnovers || 0,
              reboundsOffensive: stats.reboundsOffensive || 0,
              reboundsDefensive: stats.reboundsDefensive || 0,
              isOnCourt:
                p.onCourt === "1" || p.onCourt === 1 || p.isOnCourt === true,
              teamId: teamId,
            };
          };

          setPlayers(newData.players.map((p: any) => mapPlayer(p, p.teamId)));
        }
      } catch (error) {
        console.error("Failed to parse SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();

      // Fallback to manual retry after SSE failure
      setTimeout(() => {
        console.log("SSE failed, triggering retry");
        setRetryTrigger((prev) => prev + 1);
      }, 5000);
    };

    eventSource.onopen = () => {
      console.log("SSE connection opened for game:", gameId);
    };

    return () => {
      console.log("Closing SSE connection for game:", gameId);
      eventSource.close();
    };
  }, [gameId, gameData?.gameStatus]);

  // PBP now delivered via SSE stream; no separate polling.

  if (loading && !gameData) {
    return (
      <Layout>
        <Header />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (error || !gameData) {
    return (
      <Layout>
        <Header />
        <div className="flex justify-center items-center h-[calc(100vh-80px)]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">
              Something went wrong
            </h2>
            <p className="text-text/60 max-w-md mx-auto">
              {error || "We couldn't find the game you're looking for."}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setRetryTrigger((prev) => prev + 1);
                }}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Back to Games
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto px-6 md:px-4 py-8 md:py-6"
      >
        <button
          onClick={() => {
            const fromDate = searchParams.get("fromDate");

            if (fromDate) {
              router.push(`/?date=${fromDate}`);
            } else {
              router.push("/");
            }
          }}
          className="flex items-center gap-2 text-text/60 hover:text-text mb-6 md:mb-4 transition-colors text-base md:text-sm"
        >
          <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
        </button>

        <Scoreboard gameData={gameData} />

        <div className="flex flex-col gap-8 md:gap-6">
          <div className="w-full">
            {gameData.gameStatus === 2 || gameData.gameStatus === 3 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <VirtualCourt
                  actions={pbpData}
                  gameStatus={gameData.gameStatus}
                  homeTeam={gameData.homeTeam}
                  awayTeam={gameData.awayTeam}
                  players={players}
                />
              </motion.div>
            ) : (
              <div className="space-y-6">
                {gameData.winProbability && (
                  <WinProbabilityCard
                    data={gameData.winProbability}
                    homeTeamName={gameData.homeTeam.teamName}
                    awayTeamName={gameData.awayTeam.teamName}
                  />
                )}

                {gameData.previousMatchups && (
                  <PreviousMatchupsSection matchups={gameData.previousMatchups} />
                )}
              </div>
            )}
          </div>

          {/* Top Performers for Finished Games */}
          {gameData.gameStatus === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <TopPerformersSection
                homeTeamName={gameData.homeTeam.teamTricode}
                awayTeamName={gameData.awayTeam.teamTricode}
                homePlayers={players.filter(
                  (p) => p.teamId === gameData.homeTeam.teamId,
                )}
                awayPlayers={players.filter(
                  (p) => p.teamId === gameData.awayTeam.teamId,
                )}
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <StatsSection
              gameData={gameData}
              players={players}
              actions={pbpData}
            />
          </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
