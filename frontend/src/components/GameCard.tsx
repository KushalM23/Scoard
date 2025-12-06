import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

interface Team {
    teamId: number;
    teamTricode: string;
    score: number;
    wins: number;
    losses: number;
}

interface Game {
    gameId: string;
    gameStatus: number; // 1=Scheduled, 2=Live, 3=Final
    gameStatusText: string;
    gameEt: string; // Added gameEt
    homeTeam: Team;
    awayTeam: Team;
}

interface GameCardProps {
    game: Game;
    onClick: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
    // Simplify Status Logic
    // Status 1: Scheduled, 2: Live, 3: Final
    // Sometimes API might return 1 but have scores if it just started or data is quirky, 
    // but generally trusting the status ID is safest.

    const homeScore = Number(game.homeTeam.score);
    const awayScore = Number(game.awayTeam.score);
    const hasScores = homeScore > 0 || awayScore > 0;

    // Trust the scores: If we have scores, it's not "Scheduled" for display purposes.
    const isScheduled = game.gameStatus === 1 && !hasScores;
    const isLive = game.gameStatus === 2 || (hasScores && game.gameStatus !== 3);
    // const isFinal = game.gameStatus === 3; // Unused

    // Highlight logic
    const showScore = !isScheduled;
    const homeHigh = showScore && homeScore > awayScore;
    const awayHigh = showScore && awayScore > homeScore;

    // Base opacity/styles for leading vs trailing
    // If scheduled, both are full opacity.
    // If live/final, loser/trailer is faded.
    const getTeamOpacity = (isHigh: boolean) => {
        if (isScheduled) return "opacity-100";
        if (homeScore === awayScore) return "opacity-100"; // Tie
        return isHigh ? "opacity-100" : "opacity-30";
    };

    // Format time to IST
    const formatToIST = (dateString: string, statusText: string) => {
        try {
            // If statusText contains a time (e.g. "7:00 pm ET"), parse it
            const timeMatch = statusText.match(/(\d+):(\d+)\s*(am|pm)\s*ET/i);
            if (timeMatch) {
                let [_, hours, minutes, period] = timeMatch;
                let hour = parseInt(hours);
                if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
                if (period.toLowerCase() === 'am' && hour === 12) hour = 0;

                // Construct date from dateString (YYYY-MM-DD)
                const datePart = dateString.split('T')[0];
                const etDate = new Date(`${datePart}T${hour.toString().padStart(2, '0')}:${minutes}:00-05:00`);

                return etDate.toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'Asia/Kolkata'
                });
            }

            // Fallback to dateString parsing if no time in status text
            const date = new Date(dateString.endsWith('Z') ? dateString : `${dateString}-05:00`);
            return date.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            });
        } catch (e) {
            return statusText;
        }
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={twMerge(
                "glass-card game-card-custom cursor-pointer hover:bg-white/10 transition-colors duration-300 group relative overflow-hidden flex flex-col justify-center",
                isLive && "border-accent/50 shadow-[0_0_30px_rgba(69,126,172,0.15)]"
            )}
        >
            {isLive && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent animate-pulse" />
            )}

            <div className="flex justify-between items-center w-full">
                {/* Home Team (Left) */}
                <div className={clsx("flex flex-col items-center gap-2 flex-1 transition-all duration-300", getTeamOpacity(homeHigh))}>
                    <div className="relative">
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            src={`https://cdn.nba.com/logos/nba/${game.homeTeam.teamId}/primary/L/logo.svg`}
                            alt={game.homeTeam.teamTricode}
                            className="team-logo-custom object-contain drop-shadow-xl transition-transform duration-300"
                        />
                    </div>
                    <div className="text-center">
                        <span className={clsx("team-name-custom font-display tracking-wider block leading-none", homeHigh ? "text-text font-bold" : "text-text/80")}>
                            {game.homeTeam.teamTricode}
                        </span>
                        <span className="text-[10px] md:text-sm text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-1.5 py-0.5 rounded-full">
                            {game.homeTeam.wins}-{game.homeTeam.losses}
                        </span>
                    </div>
                </div>

                {/* Center Info */}
                <div className="flex flex-col items-center justify-center game-card-center-custom">
                    {isScheduled ? (
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] md:text-xs font-bold text-text/50 tracking-widest uppercase">TIPOFF (IST)</span>
                            <div className="bg-white/5 rounded-lg px-1.5 py-0.5 border border-white/5">
                                <span className="text-sm md:text-xl font-mono font-bold text-text whitespace-nowrap">
                                    {formatToIST(game.gameEt, game.gameStatusText)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1">
                            <span className={clsx(
                                "text-[8px] md:text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border transition-colors",
                                isLive
                                    ? "bg-accent/20 border-accent/30 text-accent animate-pulse shadow-[0_0_10px_rgba(69,126,172,0.2)]"
                                    : "bg-white/5 border-white/5 text-text/40"
                            )}>
                                {game.gameStatusText}
                            </span>
                            <div className="flex items-center gap-1 md:gap-3">
                                <span className={clsx(
                                    "score-text-custom font-mono font-bold transition-colors duration-300",
                                    homeHigh ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-text/30"
                                )}>{game.homeTeam.score}</span>
                                <span className="text-text/10 text-lg md:text-2xl font-light">/</span>
                                <span className={clsx(
                                    "score-text-custom font-mono font-bold transition-colors duration-300",
                                    awayHigh ? "text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "text-text/30"
                                )}>{game.awayTeam.score}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Away Team (Right) */}
                <div className={clsx("flex flex-col items-center gap-2 flex-1 transition-all duration-300", getTeamOpacity(awayHigh))}>
                    <div className="relative">
                        <motion.img
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            src={`https://cdn.nba.com/logos/nba/${game.awayTeam.teamId}/primary/L/logo.svg`}
                            alt={game.awayTeam.teamTricode}
                            className="team-logo-custom object-contain drop-shadow-xl transition-transform duration-300"
                        />
                    </div>
                    <div className="text-center">
                        <span className={clsx("team-name-custom font-display tracking-wider block leading-none", awayHigh ? "text-text font-bold" : "text-text/80")}>
                            {game.awayTeam.teamTricode}
                        </span>
                        <span className="text-[10px] md:text-sm text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-1.5 py-0.5 rounded-full">
                            {game.awayTeam.wins}-{game.awayTeam.losses}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default GameCard;
