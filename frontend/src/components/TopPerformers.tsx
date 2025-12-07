import React from 'react';
import type { Player } from '../types';

interface TopPerformersProps {
    homeTeamName: string;
    awayTeamName: string;
    homePlayers: Player[];
    awayPlayers: Player[];
}

const TopPerformers: React.FC<TopPerformersProps> = ({ homeTeamName, awayTeamName, homePlayers, awayPlayers }) => {
    // Sort by points (descending) to find top performers
    // In a real app, you might use a "Game Score" formula or efficiency rating
    const getTopPerformers = (players: Player[]) => {
        return [...players]
            .sort((a, b) => b.points - a.points)
            .slice(0, 2);
    };

    const homeTop = getTopPerformers(homePlayers);
    const awayTop = getTopPerformers(awayPlayers);

    const renderPerformerCard = (player: Player, rank: number) => (
        <div key={player.personId} className="bg-white/5 rounded-lg p-3 flex items-center gap-3 border border-white/5">
            <div className="relative">
                <img 
                    src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="w-12 h-12 object-cover rounded-full bg-white/10"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
                    }}
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-text text-[10px] font-bold flex items-center justify-center rounded-full border border-background">
                    #{rank}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{player.firstName.charAt(0)}. {player.lastName}</div>
                <div className="text-xs text-text/60 flex gap-2">
                    <span>{player.points} PTS</span>
                    <span>{player.assists} AST</span>
                    <span>{player.rebounds} REB</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full bg-background p-4 rounded-lg border border-text/10">
            <h3 className="text-lg font-bold mb-4">Top Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home Team */}
                <div>
                    <h4 className="text-sm font-bold text-text/60 mb-2 uppercase tracking-wider">{homeTeamName}</h4>
                    <div className="flex flex-col gap-2">
                        {homeTop.map((p, i) => renderPerformerCard(p, i + 1))}
                    </div>
                </div>

                {/* Away Team */}
                <div>
                    <h4 className="text-sm font-bold text-text/60 mb-2 uppercase tracking-wider">{awayTeamName}</h4>
                    <div className="flex flex-col gap-2">
                        {awayTop.map((p, i) => renderPerformerCard(p, i + 1))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopPerformers;
