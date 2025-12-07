import React from 'react';
import type { WinProbability as WinProbType } from '../types';

interface WinProbabilityProps {
    data: WinProbType;
    homeTeamName: string;
    awayTeamName: string;
}

const WinProbability: React.FC<WinProbabilityProps> = ({ data, homeTeamName, awayTeamName }) => {
    return (
        <div className="glass-card p-4 mb-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Win Probability</h3>
            
            <div className="relative h-8 bg-background/30 rounded-full overflow-hidden flex">
                <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out flex items-center justify-start pl-3"
                    style={{ width: `${data.homeWinProb}%` }}
                >
                    <span className="text-xs font-bold text-background whitespace-nowrap">
                        {data.homeWinProb.toFixed(1)}%
                    </span>
                </div>
                <div 
                    className="h-full bg-secondary transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                    style={{ width: `${data.awayWinProb}%` }}
                >
                    <span className="text-xs font-bold text-background whitespace-nowrap">
                        {data.awayWinProb.toFixed(1)}%
                    </span>
                </div>
            </div>

            <div className="flex justify-between mt-2 text-sm px-2">
                <div className="flex flex-col">
                    <span className="font-bold text-primary">{homeTeamName}</span>
                    <span className="text-xs text-text/40">{(data.homeWinPct * 100).toFixed(1)}% Win Rate</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-bold text-secondary">{awayTeamName}</span>
                    <span className="text-xs text-text/40">{(data.awayWinPct * 100).toFixed(1)}% Win Rate</span>
                </div>
            </div>
        </div>
    );
};

export default WinProbability;