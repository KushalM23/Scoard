"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/layout/AppShell";
import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import GameCard from "@/features/home/GameCard";
import Standings from "@/features/home/Standings";
import PlayoffsBracketView from "@/features/playoffs/PlayoffsBracketView";
import { useSeason } from "@/providers/SeasonProvider";
import { getSeasonFromDate, shiftDateToSeason } from "@/lib/teams";
import type { PlayoffBracketPayload } from "@/types/playoffs";

type HomeTab = "scores" | "standings" | "playoffs";

function CalendarPicker({
  selectedDate,
  onDateSelect,
}: {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(selectedDate);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setViewMonth(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        (!modalRef.current || !modalRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={() => setIsOpen((value) => !value)}
        className={`p-1.5 sm:p-2 lg:p-6 rounded-xl transition-colors ${
          isOpen ? "bg-accent text-text" : "text-text/60 hover:text-text"
        }`}
      >
        <Calendar className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
      </motion.button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                exit={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-24 left-1/2 z-40 w-[min(100vw-2rem,340px)] rounded-2xl border border-white/10 bg-background p-3.5 shadow-2xl shadow-black/50 sm:p-5 md:w-[400px] lg:bottom-40"
              >
                <div className="mb-4 flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="group rounded-xl p-2 transition-colors hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5 text-text/60 group-hover:text-text" />
                  </motion.button>

                  <motion.h3
                    key={format(viewMonth, "yyyy-MM")}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-base font-bold tracking-wide text-text sm:text-xl"
                  >
                    {format(viewMonth, "MMMM yyyy")}
                  </motion.h3>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="group rounded-xl p-2 transition-colors hover:bg-white/10"
                  >
                    <ChevronRight className="h-5 w-5 text-text/60 group-hover:text-text" />
                  </motion.button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="py-1 text-center font-mono text-md uppercase tracking-wider text-text/40"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <motion.div
                  key={format(viewMonth, "yyyy-MM")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-7 gap-1"
                >
                  {calendarDays.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isCurrentMonth = isSameMonth(date, viewMonth);
                    const isToday = isSameDay(date, new Date());

                    return (
                      <motion.button
                        key={date.toISOString()}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                          opacity: isCurrentMonth ? 1 : 0.3,
                          scale: 1,
                        }}
                        transition={{ delay: index * 0.005 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDateClick(date)}
                        className={[
                          "relative flex h-9 w-9 items-center justify-center rounded-lg font-sans text-xs font-bold transition-colors duration-200 md:h-12 md:w-12 md:text-sm",
                          isSelected
                            ? "bg-accent text-text shadow-lg shadow-accent/30"
                            : isCurrentMonth
                              ? "text-text/80 hover:bg-white/10 hover:text-text"
                              : "text-text/20 hover:bg-white/5",
                        ].join(" ")}
                      >
                        {format(date, "d")}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                        )}
                      </motion.button>
                    );
                  })}
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const today = new Date();
                    setViewMonth(today);
                    onDateSelect(today);
                    setIsOpen(false);
                  }}
                  className="mt-3 w-full rounded-xl bg-white/5 py-2 font-mono text-sm uppercase tracking-wider text-text/60 transition-colors hover:bg-white/10 hover:text-text sm:mt-4 sm:py-2.5 sm:text-xl"
                >
                  Today
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

export default function HomeScreen() {
  const { season: globalSeason, setSeason } = useSeason();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [hasPlayoffSeries, setHasPlayoffSeries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTab>("scores");
  const pollIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDateString = useMemo(() => {
    return searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");
  }, [searchParams]);

  const selectedDate = useMemo(() => {
    const [year, month, day] = selectedDateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [selectedDateString]);

  const setSelectedDate = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (activeTab !== "scores") return;

    const computedSeason = getSeasonFromDate(selectedDate);
    if (computedSeason !== globalSeason) {
      setSeason(computedSeason);
    }
  }, [activeTab, globalSeason, selectedDate, setSeason]);

  useEffect(() => {
    if (activeTab !== "scores") return;

    const computedSeason = getSeasonFromDate(selectedDate);
    if (computedSeason !== globalSeason) {
      setSelectedDate(shiftDateToSeason(selectedDate, globalSeason));
    }
  }, [activeTab, globalSeason, selectedDate]);

  useEffect(() => {
    let isMounted = true;

    const loadPlayoffAvailability = async () => {
      try {
        const response = await axios.get<PlayoffBracketPayload>(
          `/api/playoffs/bracket?season=${globalSeason}`,
        );
        if (!isMounted) return;
        setHasPlayoffSeries(response.data.meta.availableSeriesPages > 0);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch playoff availability", error);
        setHasPlayoffSeries(false);
      }
    };

    void loadPlayoffAvailability();

    return () => {
      isMounted = false;
    };
  }, [globalSeason]);

  useEffect(() => {
    if (activeTab === "playoffs" && !hasPlayoffSeries) {
      setActiveTab("scores");
    }
  }, [activeTab, hasPlayoffSeries]);

  useEffect(() => {
    if (activeTab !== "scores") return;

    let isMounted = true;

    const fetchGames = async (isPoll = false) => {
      try {
        if (isMounted && !isPoll) setLoading(true);

        const response = await axios.get(`/api/games/date/${selectedDateString}`);
        const fetchedGames = response.data.scoreboard.games;
        const sortedGames = fetchedGames.sort((a: any, b: any) => {
          if (a.gameStatus === 2 && b.gameStatus !== 2) return -1;
          if (b.gameStatus === 2 && a.gameStatus !== 2) return 1;
          return new Date(a.gameEt).getTime() - new Date(b.gameEt).getTime();
        });

        if (isMounted) {
          setGames(sortedGames);
        }

        const hasLive = fetchedGames.some((game: any) => game.gameStatus === 2);
        if (hasLive && !pollIdRef.current) {
          pollIdRef.current = setInterval(() => {
            void fetchGames(true);
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

    void fetchGames();

    return () => {
      isMounted = false;
      if (pollIdRef.current) {
        clearInterval(pollIdRef.current);
        pollIdRef.current = null;
      }
    };
  }, [activeTab, selectedDateString]);

  const calendarDays = [-3, -2, -1, 0, 1, 2, 3].map((offset) =>
    addDays(selectedDate, offset),
  );

  const handleGameSelect = (gameId: string) => {
    const fromDate = searchParams.get("date");
    router.push(fromDate ? `/game/${gameId}?fromDate=${fromDate}` : `/game/${gameId}`);
  };

  const tabs: HomeTab[] = hasPlayoffSeries
    ? ["scores", "standings", "playoffs"]
    : ["scores", "standings"];

  return (
    <Layout>
      <Header />
      <div className="mx-auto w-full px-4 py-3 pb-32 sm:px-5 sm:py-4 md:px-8 md:py-6 md:pb-24">
        <div className="mb-4 flex justify-center md:mb-4">
          <div className="bg-white/5 border border-white/10 flex min-w-64 max-w-full gap-0.5 rounded-xl p-1 sm:w-auto sm:gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative z-10 flex-1 rounded-xs px-2 py-2 font-display text-[12px] tracking-wide transition-colors duration-300 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm md:px-8 md:text-base ${
                  activeTab === tab
                    ? "text-text"
                    : "text-text/60 hover:text-text"
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-accent shadow-lg"
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
                <div className="mb-12 mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`game-skeleton-${index}`}
                      className="bg-white/5 border border-white/10 rounded-lg space-y-4 rounded-2xl p-4 md:p-5"
                    >
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <div className="space-y-3">
                        {Array.from({ length: 2 }).map((__, teamIndex) => (
                          <div
                            key={`team-skeleton-${teamIndex}`}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-6 w-10" />
                          </div>
                        ))}
                      </div>
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : games.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-5 py-40"
                >
                  <div className="text-center">
                    <p className="font-display text-base uppercase tracking-widest text-text/60">
                      No Games Scheduled
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      href="/teams"
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-display uppercase tracking-wide transition-all hover:text-accent"
                    >
                      Teams
                    </Link>
                    <Link
                      href="/players"
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-display uppercase tracking-wide transition-all hover:text-accent"
                    >
                      Players
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                className="mb-12 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                >
                  {games.map((game) => (
                    <GameCard
                      key={game.gameId}
                      game={game}
                      onClick={() => handleGameSelect(game.gameId)}
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

        <AnimatePresence>
          {activeTab === "scores" && (
            <div className="pointer-events-none fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-full -translate-x-1/2 items-center justify-center gap-2">
              <motion.div
                key="datepicker"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 pointer-events-auto no-scrollbar flex max-w-[calc(100vw-1rem)] items-center gap-0 overflow-x-auto rounded-xl md:rounded-2xl px-2 py-2 shadow-2xl shadow-black/50 sm:gap-1 sm:px-2 sm:py-2 md:max-w-[85vw]"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="group shrink-0 rounded-xl p-1.5 transition-colors hover:bg-white/10 sm:p-2"
                >
                  <ChevronLeft className="h-5 w-5 text-text/60 group-hover:text-text sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                </motion.button>

                <div className="flex items-center gap-2">
                  {calendarDays.map((date, index) => {
                    const isSelected = index === 3;
                    const isHiddenOnMobile = index < 2 || index > 4;

                    return (
                      <motion.button
                        key={date.toISOString()}
                        layout
                        onClick={() => setSelectedDate(date)}
                        className={`${
                          isHiddenOnMobile ? "hidden md:flex" : "flex"
                        } h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg transition-colors duration-300 sm:h-12 sm:w-12 lg:h-20 lg:w-20 ${
                          isSelected
                            ? "bg-accent text-text shadow-lg shadow-accent/20"
                            : "text-text/60 hover:bg-white/5 hover:text-text"
                        }`}
                        animate={{
                          scale: isSelected ? 1.1 : 1,
                          opacity: isSelected ? 1 : 0.7,
                        }}
                      >
                          <span className="font-mono text-[9px] uppercase tracking-wider lg:text-lg">
                          {format(date, "EEE")}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isSelected
                              ? "text-base sm:text-xl lg:text-4xl"
                              : "text-sm sm:text-base lg:text-2xl"
                          }`}
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
                  className="group shrink-0 rounded-xl p-1.5 transition-colors hover:bg-white/10 sm:p-2"
                >
                  <ChevronRight className="h-5 w-5 text-text/60 group-hover:text-text sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
                </motion.button>
              </motion.div>

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
                className="bg-white/5 backdrop-blur-xl border border-white/10 pointer-events-auto rounded-xl md:rounded-2xl p-1 shadow-2xl shadow-black/50"
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
    </Layout>
  );
}
