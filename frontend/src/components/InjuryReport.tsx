import React from 'react';
import type { Player } from '../types';

interface InjuryReportProps {
    homeTeamName: string;
    awayTeamName: string;
    homePlayers: Player[];
    awayPlayers: Player[];
}

const InjuryReport: React.FC<InjuryReportProps> = ({ homeTeamName, awayTeamName, homePlayers, awayPlayers }) => {
    // Filter for inactive players
    // Note: The API parsing in Game.tsx needs to ensure 'status' or 'notPlayingReason' is captured if available.
    // Based on the current Player interface, we might need to check 'isOnCourt' or add a 'status' field.
    // For now, let's assume we filter by players who have 0 minutes AND a reason if we had it, 
    // but since we don't have the reason in the Player interface yet, we'll rely on the Game.tsx to pass 
    // "Inactive" players correctly or update the interface.
    
    // Actually, let's update the Player interface in types/index.ts first to include 'status' and 'notPlayingReason'.
    // Assuming that's done, we filter here.
    
    const getInjuredPlayers = (players: Player[]) => {
        return players.filter(p => p.status === 'INACTIVE');
    };

    const homeInjured = getInjuredPlayers(homePlayers);
    const awayInjured = getInjuredPlayers(awayPlayers);

    const renderInjuryList = (players: Player[], teamName: string) => (
        <div className="flex-1">
            <h4 className="text-sm font-bold text-text/60 mb-2 uppercase tracking-wider">{teamName}</h4>
            {players.length === 0 ? (
                <p className="text-sm text-text/40 italic">No injuries reported</p>
            ) : (
                <div className="space-y-2">
                    {players.map(p => (
                        <div key={p.personId} className="flex items-start gap-2 text-sm">
                            <span className="font-bold text-text whitespace-nowrap">{p.firstName.charAt(0)}. {p.lastName}</span>
                            <span className="text-red-400 text-xs bg-red-400/10 px-1.5 py-0.5 rounded">
                                {p.notPlayingReason || 'Out'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full bg-background p-4 rounded-lg border border-text/10">
            <h3 className="text-lg font-bold mb-4">Injury Report</h3>
            <div className="flex flex-col md:flex-row gap-6">
                {renderInjuryList(homeInjured, homeTeamName)}
                <div className="w-px bg-text/10 hidden md:block"></div>
                {renderInjuryList(awayInjured, awayTeamName)}
            </div>
        </div>
    );
};

export default InjuryReport;
