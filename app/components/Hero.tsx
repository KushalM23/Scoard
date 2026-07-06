"use client";

import React, { useState, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import GameCard from "./GameCard";
import Standings from "./Standings";
import CalendarPicker from "./CalendarPicker";
import { Skeleton } from "./skeleton";
import PlayoffsBracketView from "./PlayoffsBracketView";
import { useSeason } from "./SeasonContext";
import { CURRENT_SEASON, getSeasonFromDate, shiftDateToSeason } from "@/app/lib/teams";

interface HeroProps {
  onGameSelect: (gameId: string) => void;
}

type HomeTab = "scores" | "standings" | "playoffs";

const Hero: React.FC<HeroProps> = ({ onGameSelect }) => {
  const { season: globalSeason, setSeason } = useSeason();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const pollIdRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize date from URL or default to today (as string to avoid Date reference issues)
  const selectedDateString = React.useMemo(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      return dateParam;
    }
    return format(new Date(), "yyyy-MM-dd");
  }, [searchParams]);

  const selectedDate = React.useMemo(() => {
    const [year, month, day] = selectedDateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateString]);

  const setSelectedDate = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTab>("scores");

  useEffect(() => {
    if (activeTab === "scores") {
      setSeason(getSeasonFromDate(selectedDate));
    } else {
      setSeason(CURRENT_SEASON);
    }
  }, [activeTab, setSeason, selectedDate]);

  // Sync global season when selectedDate changes (tandem: calendar -> season dropdown)
  useEffect(() => {
    if (activeTab !== "scores") return;
    const computedSeason = getSeasonFromDate(selectedDate);
    if (computedSeason !== globalSeason) {
      setSeason(computedSeason);
    }
  }, [selectedDate, activeTab, globalSeason, setSeason]);

  // Sync selectedDate when global season changes (tandem: season dropdown -> calendar)
  useEffect(() => {
    if (activeTab !== "scores") return;
    const computedSeason = getSeasonFromDate(selectedDate);
    if (computedSeason !== globalSeason) {
      const shifted = shiftDateToSeason(selectedDate, globalSeason);
      setSelectedDate(shifted);
    }
  }, [globalSeason, activeTab, selectedDate]);

  useEffect(() => {
    if (activeTab !== "scores") return;

    let isMounted = true;
    console.log(
      "[Hero] useEffect triggered - selectedDateString:",
      selectedDateString,
      "activeTab:",
      activeTab,
    );

    const fetchGames = async (isPoll = false) => {
      console.log(
        "[Hero] fetchGames called - isPoll:",
        isPoll,
        "date:",
        selectedDateString,
      );
      try {
        if (isMounted && !isPoll) setLoading(true);

        const [year, month, day] = selectedDateString.split("-").map(Number);
        const dateForApi = new Date(year, month - 1, day);
        const apiDate = subDays(dateForApi, 1);
        const formattedDate = format(apiDate, "yyyy-MM-dd");

        const endpoint = `/api/games/date/${formattedDate}`;
        const response = await axios.get(endpoint);
        const fetchedGames = response.data.scoreboard.games;

        const sortedGames = fetchedGames.sort((a: any, b: any) => {
          if (a.gameStatus === 2 && b.gameStatus !== 2) return -1;
          if (b.gameStatus === 2 && a.gameStatus !== 2) return 1;
          return new Date(a.gameEt).getTime() - new Date(b.gameEt).getTime();
        });

        if (isMounted) setGames(sortedGames);

        const hasLive = fetchedGames.some((g: any) => g.gameStatus === 2);
        if (hasLive && !pollIdRef.current) {
          pollIdRef.current = setInterval(() => {
            fetchGames(true);
          }, 10000);
        }
        if (!hasLive && pollIdRef.current) {
          clearInterval(pollIdRef.current);
          pollIdRef.current = null;
        }
      } catch (error) {
        if (isMounted) {
          console.error("Failed to fetch games", error);
          setGames([]);
        }
      } finally {
        if (isMounted && !isPoll) setLoading(false);
      }
    };

    fetchGames();

    return () => {
      isMounted = false;
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current);
        pollIdRef.current = null;
      }
    };
  }, [selectedDateString, activeTab]);
  const calendarDays = [-3, -2, -1, 0, 1, 2, 3].map((offset) =>
    addDays(selectedDate, offset),
  );

  return (
    <div className="w-full md:w-full mx-auto px-2 py-4 md:px-8 md:py-6 pb-32 md:pb-24">
      {/* Tabs */}
      <div className="flex justify-center mb-6 md:mb-4">
        <div className="glass rounded-xl p-1 flex gap-2 md:gap-1.5 relative">
          {(["scores", "standings", "playoffs"] as HomeTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-2 md:px-8 md:py-2.5 rounded-lg font-display text-sm md:text-base transition-colors duration-300 tracking-wide z-10 ${activeTab === tab ? "text-text" : "text-text/60 hover:text-text"}`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 uppercase">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "scores" ? (
          <motion.div
            key="scores"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div className="grid grid-cols-1 mt-4 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-12">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`game-skeleton-${index}`}
                    className="glass-card rounded-2xl p-4 md:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-6 w-10" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <Skeleton className="h-6 w-10" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <p className="text-text/40 font-mono">NO GAMES SCHEDULED</p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-12"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
              >
                {games.map((game) => (
                  <GameCard
                    key={game.gameId}
                    game={game}
                    onClick={() => onGameSelect(game.gameId)}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        ) : activeTab === "standings" ? (
          <motion.div
            key="standings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Standings />
          </motion.div>
        ) : (
          <motion.div
            key="playoffs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PlayoffsBracketView showTitle={false} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Picker (Bottom) */}
      <AnimatePresence>
        {activeTab === "scores" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 pointer-events-none w-full justify-center">
            <motion.div
              key="datepicker"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="glass rounded-2xl px-2 py-2 flex items-center gap-1 shadow-2xl shadow-black/50 overflow-x-auto max-w-[calc(100vw-80px)] md:max-w-[85vw] no-scrollbar pointer-events-auto"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors group shrink-0"
              >
                <ChevronLeft className="w-6 h-6 lg:w-8 lg:h-8 text-text/60 group-hover:text-text" />
              </motion.button>

              <div className="flex items-center gap-1">
                {calendarDays.map((date, index) => {
                  const isSelected = index === 3;
                  const isHiddenOnMobile = index < 2 || index > 4;

                  return (
                    <motion.button
                      key={date.toISOString()}
                      layout
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center justify-center w-12 h-12 lg:w-20 lg:h-20 rounded-xl transition-colors duration-300 shrink-0 ${isHiddenOnMobile ? "hidden md:flex" : "flex"} ${
                        isSelected
                          ? "bg-accent text-text shadow-lg shadow-accent/20"
                          : "hover:bg-white/5 text-text/60 hover:text-text"
                      }`}
                      animate={{
                        scale: isSelected ? 1.1 : 1,
                        opacity: isSelected ? 1 : 0.7,
                      }}
                    >
                      <span className="text-[10px] lg:text-lg font-mono uppercase tracking-wider">
                        {format(date, "EEE")}
                      </span>
                      <span
                        className={`font-mono font-bold ${isSelected ? "text-xl lg:text-4xl" : "text-base lg:text-2xl"}`}
                      >
                        {format(date, "d")}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors group shrink-0"
              >
                <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 text-text/60 group-hover:text-text" />
              </motion.button>
            </motion.div>

            {/* Calendar Picker */}
            <motion.div
              key="calendarpicker"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 100,
                delay: 0.05,
              }}
              className="glass rounded-2xl shadow-2xl shadow-black/50 p-1 pointer-events-auto"
            >
              <CalendarPicker
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Hero;
