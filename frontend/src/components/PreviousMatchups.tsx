import React from 'react';
import type { Matchup } from '../types';

interface PreviousMatchupsProps {
    matchups: Matchup[];
}

const PreviousMatchups: React.FC<PreviousMatchupsProps> = ({ matchups }) => {
    if (!matchups || matchups.length === 0) {
        return (
            <div className="glass-card p-4 mb-4 max-w-2xl mx-auto">
                <h3 className="text-lg font-bold mb-2">Previous Matchups</h3>
                <p className="text-text/40 text-sm">No previous matchups this season.</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-4 mb-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Previous Matchups</h3>
            <div className="flex flex-col gap-2">
                {matchups.map((game) => (
                    <div key={game.gameId} className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                        <div className="flex flex-col">
                            <span className="text-xs text-text/40 mb-1">{new Date(game.gameDate).toLocaleDateString()}</span>
                            <span className="font-bold text-sm">{game.matchup}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`px-2 py-1 rounded text-xs font-bold ${game.wl === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {game.wl}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="font-mono font-bold">{game.pts} PTS</span>
                                <span className={`text-xs ${game.plusMinus > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {game.plusMinus > 0 ? '+' : ''}{game.plusMinus}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PreviousMatchups;