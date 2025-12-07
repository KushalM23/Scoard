import React from 'react';
import type { GameData } from '../types';

interface ScoreboardProps {
    gameData: GameData;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ gameData }) => {
    const { homeTeam, awayTeam, period, gameStatusText, gameStatus, gameEt } = gameData;

    const isScheduled = gameStatus === 1;
    const isHomeLeading = !isScheduled && homeTeam.score > awayTeam.score;
    const isAwayLeading = !isScheduled && awayTeam.score > homeTeam.score;

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

    const renderTimeouts = (count: number, isHome: boolean) => (
        <div className="flex gap-0.5">
            {[...Array(7)].map((_, i) => (
                <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${i < count ? (isHome ? 'bg-primary' : 'bg-secondary') : 'bg-text/20'}`}
                />
            ))}
        </div>
    );

    return (
        <div className="glass-card p-4 mb-4 max-w-2xl mx-auto">
            {/* Main Scoreboard */}
            <div className={`flex justify-center items-center ${isScheduled ? 'gap-4 md:gap-24 py-4' : 'gap-8 md:gap-12'}`}>
                {/* Home Team */}
                <div className="flex flex-col items-center relative">
                    <div className="relative">
                        <img 
                            src={`https://cdn.nba.com/logos/nba/${homeTeam.teamId}/primary/L/logo.svg`} 
                            alt={homeTeam.teamTricode} 
                            className={`${isScheduled ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12 md:w-12 md:h-12'} object-contain mb-2 transition-all duration-300`}
                        />
                        {homeTeam.inBonus && !isScheduled && (
                            <div className="absolute -top-1 -right-3 bg-primary text-text text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background">
                                BONUS
                            </div>
                        )}
                    </div>
                    <h2 className={`text-xl md:text-2xl font-bold ${isHomeLeading ? 'text-primary' : 'text-text'}`}>
                        {homeTeam.teamTricode}
                    </h2>
                    {isScheduled ? (
                        <span className="text-xs text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-2 py-0.5 rounded-full mt-1">
                            {homeTeam.wins}-{homeTeam.losses}
                        </span>
                    ) : (
                        <div className="mt-1 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            {renderTimeouts(homeTeam.timeoutsRemaining, true)}
                        </div>
                    )}
                </div>

                {/* Center Info (Time/Period & Score) */}
                <div className="flex flex-col items-center min-w-[120px]">
                    {/* Time & Period */}
                    <div className="flex flex-col items-center mb-2">
                        {isScheduled ? (
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-bold text-text/50 tracking-widest uppercase">TIPOFF (IST)</span>
                                <div className="bg-white/5 rounded-lg px-3 py-1 border border-white/5">
                                    <span className="text-xl font-mono font-medium text-text whitespace-nowrap">
                                        {formatToIST(gameEt || new Date().toISOString(), gameStatusText)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm md:text-sm font-bold text-primary bg-primary/10 px-3 py-0.5 rounded-full">
                                    {gameStatusText}
                                </div>
                                <div className="text-[10px] text-text/40 mt-0.5">Period {period}</div>
                            </>
                        )}
                    </div>

                    {/* Score */}
                    {!isScheduled && (
                        <div className="flex items-center gap-4">
                            <span className={`text-3xl md:text-4xl font-mono font-medium tracking-tighter ${isHomeLeading ? 'text-primary' : 'text-text'}`}>
                                {homeTeam.score}
                            </span>
                            <span className="text-text/10 text-2xl font-light">-</span>
                            <span className={`text-3xl md:text-4xl font-mono font-medium tracking-tighter ${isAwayLeading ? 'text-secondary' : 'text-text'}`}>
                                {awayTeam.score}
                            </span>
                        </div>
                    )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center relative">
                    <div className="relative">
                        <img 
                            src={`https://cdn.nba.com/logos/nba/${awayTeam.teamId}/primary/L/logo.svg`} 
                            alt={awayTeam.teamTricode} 
                            className={`${isScheduled ? 'w-16 h-16 md:w-20 md:h-20' : 'w-12 h-12 md:w-12 md:h-12'} object-contain mb-2 transition-all duration-300`}
                        />
                        {awayTeam.inBonus && !isScheduled && (
                            <div className="absolute -top-1 -right-3 bg-secondary text-text text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background">
                                BONUS
                            </div>
                        )}
                    </div>
                    <h2 className={`text-xl md:text-2xl font-bold ${isAwayLeading ? 'text-secondary' : 'text-text'}`}>
                        {awayTeam.teamTricode}
                    </h2>
                    {isScheduled ? (
                        <span className="text-xs text-secondary font-sans font-medium tracking-wide bg-secondary/10 px-2 py-0.5 rounded-full mt-1">
                            {awayTeam.wins}-{awayTeam.losses}
                        </span>
                    ) : (
                        <div className="mt-1 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                            {renderTimeouts(awayTeam.timeoutsRemaining, false)}
                        </div>
                    )}
                </div>
            </div>

            {/* Scoring Grid - Hidden on small mobile, visible on larger screens */}
            {!isScheduled && (
                <div className="hidden sm:block overflow-x-auto mt-4 border-t border-text/10 pt-2">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="text-text/40">
                                <th className="p-1 text-left text-xs">TEAM</th>
                                {homeTeam.periods.map((_, i) => (
                                    <th key={i} className="p-1 text-xs">Q{i + 1}</th>
                                ))}
                                <th className="p-1 font-bold text-text text-xs">T</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="p-1 text-left font-bold text-text text-sm">{homeTeam.teamTricode}</td>
                                {homeTeam.periods.map((score, i) => (
                                    <td key={i} className={`p-1 text-sm ${score > awayTeam.periods[i] ? 'text-primary font-bold' : 'text-text/80'}`}>
                                        {score}
                                    </td>
                                ))}
                                <td className="p-1 font-bold text-sm text-text">{homeTeam.score}</td>
                            </tr>
                            <tr>
                                <td className="p-1 text-left font-bold text-text text-sm">{awayTeam.teamTricode}</td>
                                {awayTeam.periods.map((score, i) => (
                                    <td key={i} className={`p-1 text-sm ${score > homeTeam.periods[i] ? 'text-primary font-bold' : 'text-text/80'}`}>
                                        {score}
                                    </td>
                                ))}
                                <td className="p-1 font-bold text-sm text-text">{awayTeam.score}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Scoreboard;
