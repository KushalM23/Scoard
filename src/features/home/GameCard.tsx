"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import TeamLink from "@/components/links/TeamLink";

interface Team {
  teamId: number;
  teamTricode: string;
  score: number;
  wins: number;
  losses: number;
}

interface Game {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  gameEt: string;
  homeTeam: Team;
  awayTeam: Team;
}

interface GameCardProps {
  game: Game;
  onClick: () => void;
  scheduledDisplay?: {
    label?: string;
    value?: string;
    dateText?: string;
    timeText?: string;
  };
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  onClick,
  scheduledDisplay,
}) => {
  const homeScore = Number(game.homeTeam.score);
  const awayScore = Number(game.awayTeam.score);
  const hasScores = homeScore > 0 || awayScore > 0;

  const isScheduled = game.gameStatus === 1 && !hasScores;
  const isLive = game.gameStatus === 2 || (hasScores && game.gameStatus !== 3);

  const showScore = !isScheduled;
  const homeHigh = showScore && homeScore > awayScore;
  const awayHigh = showScore && awayScore > homeScore;

  const getTeamOpacity = (isHigh: boolean) => {
    if (isScheduled) return "opacity-100";
    if (homeScore === awayScore) return "opacity-100";
    return isHigh ? "opacity-100" : "opacity-30";
  };

  const formatToIST = (dateString: string, statusText: string) => {
    try {
      const timeMatch = statusText.match(/(\d+):(\d+)\s*(am|pm)\s*ET/i);
      if (timeMatch) {
        let [_, hours, minutes, period] = timeMatch;
        let hour = parseInt(hours);
        if (period.toLowerCase() === "pm" && hour !== 12) hour += 12;
        if (period.toLowerCase() === "am" && hour === 12) hour = 0;

        const datePart = dateString.split("T")[0];
        const etDate = new Date(
          `${datePart}T${hour.toString().padStart(2, "0")}:${minutes}:00-05:00`,
        );

        return etDate.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });
      }

      const date = new Date(
        dateString.endsWith("Z") ? dateString : `${dateString}-05:00`,
      );
      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    } catch (e) {
      return statusText;
    }
  };

  const scheduledLabel = scheduledDisplay?.label ?? "TIPOFF (IST)";
  const scheduledValue =
    scheduledDisplay?.value ?? formatToIST(game.gameEt, game.gameStatusText);
  const scheduledDateText = scheduledDisplay?.dateText;
  const scheduledTimeText = scheduledDisplay?.timeText ?? scheduledValue;
  const hasDateTimeSplit =
    typeof scheduledDateText === "string" ||
    typeof scheduledDisplay?.timeText === "string";

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={twMerge(
        "bg-white/5 border border-white/10 rounded-lg game-card-custom cursor-pointer hover:bg-white/10 transition-colors duration-300 group relative overflow-hidden flex flex-col justify-center p-2.5 sm:p-3 md:p-4",
        isLive && "border-accent/50 shadow-[0_0_30px_rgba(69,126,172,0.15)]",
      )}
    >
      {isLive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" />
      )}

      <div className="flex justify-between items-center w-full">
        <div
          className={clsx(
            "flex min-w-0 flex-col items-center gap-1.5 sm:gap-2 md:gap-1.5 flex-1 transition-all duration-300",
            getTeamOpacity(homeHigh),
          )}
        >
          <div className="relative">
            <motion.img
              whileHover={{ scale: 1.1, rotate: -5 }}
              src={`https://cdn.nba.com/logos/nba/${game.homeTeam.teamId}/primary/L/logo.svg`}
              alt={game.homeTeam.teamTricode}
            className="h-10 w-10 object-contain drop-shadow-xl transition-transform duration-300 sm:h-12 sm:w-12 md:h-14 md:w-14"
            />
          </div>
          <div className="text-center">
            <TeamLink
              teamId={game.homeTeam.teamId}
              sourceComponent="game_card"
              stopPropagation
              className={clsx(
                "text-xs sm:text-base md:text-lg font-display tracking-wider block leading-none hover:text-accent transition-colors",
                homeHigh ? "text-text font-bold" : "text-text/80",
              )}
            >
              {game.homeTeam.teamTricode}
            </TeamLink>
            <span className="text-[10px] md:text-xs text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-1.5 py-0.5 rounded-full">
              {game.homeTeam.wins}-{game.homeTeam.losses}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[76px] sm:min-w-[100px]">
          {isScheduled ? (
            <div className="flex flex-col items-center gap-1">
              {hasDateTimeSplit ? (
                <span className="text-[10px] md:text-xs font-medium text-text/70 whitespace-nowrap">
                  {scheduledDateText}
                </span>
              ) : (
                <span className="text-[8px] md:text-[10px] font-bold text-text/50 tracking-widest uppercase">
                  {scheduledLabel}
                </span>
              )}
              <div className="bg-white/5 rounded-lg px-1.5 py-0.5 border border-white/5">
                <span className="text-xl md:text-base font-mono font-medium text-text whitespace-nowrap">
                  {scheduledTimeText}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  "text-[8px] md:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors",
                  isLive
                    ? "bg-accent/20 border-accent/30 text-accent animate-pulse shadow-[0_0_10px_rgba(69,126,172,0.2)]"
                    : "bg-white/5 border-white/5 text-text/40",
                )}
              >
                {game.gameStatusText}
              </span>
              <div className="flex items-center gap-2 md:gap-2">
                <span
                  className={clsx(
                    "text-2xl sm:text-3xl md:text-3xl font-mono font-medium transition-colors duration-300",
                    homeHigh
                      ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      : "text-text/30",
                  )}
                >
                  {game.homeTeam.score}
                </span>
                <span className="text-text/10 text-xl md:text-xl font-light">
                  /
                </span>
                <span
                  className={clsx(
                    "text-2xl sm:text-3xl md:text-3xl font-mono font-medium transition-colors duration-300",
                    awayHigh
                      ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      : "text-text/30",
                  )}
                >
                  {game.awayTeam.score}
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          className={clsx(
            "flex min-w-0 flex-col items-center gap-1.5 sm:gap-2 md:gap-1.5 flex-1 transition-all duration-300",
            getTeamOpacity(awayHigh),
          )}
        >
          <div className="relative">
            <motion.img
              whileHover={{ scale: 1.1, rotate: 5 }}
              src={`https://cdn.nba.com/logos/nba/${game.awayTeam.teamId}/primary/L/logo.svg`}
              alt={game.awayTeam.teamTricode}
            className="h-10 w-10 object-contain drop-shadow-xl transition-transform duration-300 sm:h-12 sm:w-12 md:h-14 md:w-14"
            />
          </div>
          <div className="text-center">
            <TeamLink
              teamId={game.awayTeam.teamId}
              sourceComponent="game_card"
              stopPropagation
              className={clsx(
                "text-xs sm:text-base md:text-lg font-display tracking-wider block leading-none hover:text-accent transition-colors",
                awayHigh ? "text-text font-bold" : "text-text/80",
              )}
            >
              {game.awayTeam.teamTricode}
            </TeamLink>
            <span className="text-[10px] md:text-xs text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-1.5 py-0.5 rounded-full">
              {game.awayTeam.wins}-{game.awayTeam.losses}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GameCard;
