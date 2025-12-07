import React from 'react';
import type { SeasonStatPlayer } from '../types';

interface SeasonStatsProps {
    homeStats: SeasonStatPlayer[];
    awayStats: SeasonStatPlayer[];
    homeTeamName: string;
    awayTeamName: string;
}

const SeasonStats: React.FC<SeasonStatsProps> = ({ homeStats, awayStats, homeTeamName, awayTeamName }) => {
    const renderPlayerRow = (player: SeasonStatPlayer) => (
        <div key={player.personId} className="flex items-center justify-between py-2 border-b border-text/5 last:border-0">
            <div className="flex items-center gap-3">
                <img 
                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`}
                    alt={player.name}
                    className="w-8 h-8 rounded-full object-cover bg-text/10"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png' }}
                />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">{player.name}</span>
                    <span className="text-[10px] text-text/40">{player.min.toFixed(1)} MIN</span>
                </div>
            </div>
            <div className="flex gap-4 text-xs font-mono">
                <div className="flex flex-col items-end w-10">
                    <span className="text-text/80">{player.ppg.toFixed(1)}</span>
                    <span className="text-[8px] text-text/40">PPG</span>
                </div>
                <div className="flex flex-col items-end w-10">
                    <span className="text-text/80">{player.rpg.toFixed(1)}</span>
                    <span className="text-[8px] text-text/40">RPG</span>
                </div>
                <div className="flex flex-col items-end w-10">
                    <span className="text-text/80">{player.apg.toFixed(1)}</span>
                    <span className="text-[8px] text-text/40">APG</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="glass-card p-4 mb-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Season Leaders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div>
                    <h4 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider text-center border-b border-primary/20 pb-2">{homeTeamName}</h4>
                    <div className="flex flex-col gap-1">
                        {homeStats.map(renderPlayerRow)}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-secondary mb-3 uppercase tracking-wider text-center border-b border-secondary/20 pb-2">{awayTeamName}</h4>
                    <div className="flex flex-col gap-1">
                        {awayStats.map(renderPlayerRow)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeasonStats;