import React from 'react';
import type { GameData } from '../types';

interface ScoreboardProps {
    gameData: GameData;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ gameData }) => {
    const { homeTeam, awayTeam, period, gameStatusText } = gameData;

    const isHomeLeading = homeTeam.score > awayTeam.score;
    const isAwayLeading = awayTeam.score > homeTeam.score;

    const renderTimeouts = (count: number) => (
        <div className="flex gap-0.5">
            {[...Array(7)].map((_, i) => (
                <div
                    key={i}
                    className={`w-1 h-1 rounded-full ${i < count ? 'bg-primary' : 'bg-text/20'}`}
                />
            ))}
        </div>
    );

    return (
        <div className="glass-card p-3 mb-4 max-w-2xl mx-auto">
            {/* Main Scoreboard */}
            <div className="flex justify-center items-center gap-8 md:gap-12">
                {/* Home Team */}
                <div className="flex flex-col items-center relative">
                    <div className="relative">
                        <img 
                            src={`https://cdn.nba.com/logos/nba/${homeTeam.teamId}/primary/L/logo.svg`} 
                            alt={homeTeam.teamTricode} 
                            className="w-12 h-12 md:w-12 md:h-12 object-contain mb-1"
                        />
                        {homeTeam.inBonus && (
                            <div className="absolute -top-1 -right-3 bg-primary text-text text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background">
                                BONUS
                            </div>
                        )}
                    </div>
                    <h2 className={`text-lg md:text-lg font-bold ${isHomeLeading ? 'text-primary' : 'text-text'}`}>
                        {homeTeam.teamTricode}
                    </h2>
                    <div className="mt-1 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        {renderTimeouts(homeTeam.timeoutsRemaining)}
                    </div>
                </div>

                {/* Center Info (Time/Period & Score) */}
                <div className="flex flex-col items-center min-w-[120px]">
                    {/* Time & Period */}
                    <div className="flex flex-col items-center mb-2">
                        <div className="text-sm md:text-sm font-bold text-primary bg-primary/10 px-3 py-0.5 rounded-full">
                            {gameStatusText}
                        </div>
                        <div className="text-[10px] text-text/40 mt-0.5">Period {period}</div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-4">
                        <span className={`text-3xl md:text-4xl font-mono font-bold tracking-tighter ${isHomeLeading ? 'text-primary' : 'text-text'}`}>
                            {homeTeam.score}
                        </span>
                        <span className="text-text/10 text-2xl font-light">-</span>
                        <span className={`text-3xl md:text-4xl font-mono font-bold tracking-tighter ${isAwayLeading ? 'text-primary' : 'text-text'}`}>
                            {awayTeam.score}
                        </span>
                    </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center relative">
                    <div className="relative">
                        <img 
                            src={`https://cdn.nba.com/logos/nba/${awayTeam.teamId}/primary/L/logo.svg`} 
                            alt={awayTeam.teamTricode} 
                            className="w-12 h-12 md:w-12 md:h-12 object-contain mb-1"
                        />
                        {awayTeam.inBonus && (
                            <div className="absolute -top-1 -right-3 bg-primary text-text text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background">
                                BONUS
                            </div>
                        )}
                    </div>
                    <h2 className={`text-lg md:text-lg font-bold ${isAwayLeading ? 'text-primary' : 'text-text'}`}>
                        {awayTeam.teamTricode}
                    </h2>
                    <div className="mt-1 flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                        {renderTimeouts(awayTeam.timeoutsRemaining)}
                    </div>
                </div>
            </div>

            {/* Scoring Grid - Hidden on small mobile, visible on larger screens */}
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
        </div>
    );
};

export default Scoreboard;
