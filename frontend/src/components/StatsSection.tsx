import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import type { GameData, Player, PlayByPlayEvent } from '../types';

interface StatsSectionProps {
    gameData: GameData;
    players: Player[];
    actions?: PlayByPlayEvent[];
}

type SortKey = keyof Player | 'minutes';
type SortDirection = 'asc' | 'desc';

const StatsSection: React.FC<StatsSectionProps> = ({ gameData, players, actions = [] }) => {
    const [activeTab, setActiveTab] = useState<'home' | 'away' | 'team' | 'pbp'>('home');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'isOnCourt', 
        direction: 'desc'
    });

    const isScheduled = gameData.gameStatus === 1;

    const homePlayers = players.filter(p => String(p.teamId) === String(gameData.homeTeam.teamId));
    const awayPlayers = players.filter(p => String(p.teamId) === String(gameData.awayTeam.teamId));

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortPlayers = (teamPlayers: Player[]) => {
        return [...teamPlayers].sort((a, b) => {
            // Always put active players first if sorting by default logic
            if (sortConfig.key === 'minutes' && a.isOnCourt !== b.isOnCourt) {
                return a.isOnCourt ? -1 : 1;
            }

            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            // Handle string comparisons (like minutes "PT12M")
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' 
                    ? aValue.localeCompare(bValue) 
                    : bValue.localeCompare(aValue);
            }

            // Handle numeric comparisons
            const valA = aValue ?? 0;
            const valB = bValue ?? 0;
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedHomePlayers = sortPlayers(homePlayers);
    const sortedAwayPlayers = sortPlayers(awayPlayers);

    const formatPercentage = (val: number) => `${(val * 100).toFixed(1)}%`;

    const renderSortHeader = (label: string, key: SortKey) => (
        <th className="px-2 py-3 whitespace-nowrap cursor-pointer hover:text-text transition-colors group min-w-[60px]" onClick={() => handleSort(key)}>
            <div className="flex items-center justify-center gap-1">
                {label}
                <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === key ? 'text-primary' : 'text-text/20 group-hover:text-text/40'}`} />
            </div>
        </th>
    );

    const renderRosterTable = (teamPlayers: Player[]) => (
        <div className="overflow-auto max-h-[400px] rounded-xl border border-text/10">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 bg-background z-20">
                    <tr className="text-text/40 text-xs md:text-sm border-b border-text/10">
                        <th className="px-4 py-3 whitespace-nowrap text-left">JERSEY</th>
                        <th className="px-4 py-3 whitespace-nowrap text-left w-full">PLAYER</th>
                        <th className="px-4 py-3 whitespace-nowrap text-center">POS</th>
                        <th className="px-4 py-3 whitespace-nowrap text-center">STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    {teamPlayers.map((player) => (
                        <tr key={player.personId} className="border-b border-text/5 text-xs md:text-sm hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-text/60 font-mono">{player.jersey}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.personId}.png`}
                                        alt={`${player.firstName} ${player.lastName}`}
                                        className="w-8 h-8 object-cover rounded-full bg-white/10"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png';
                                        }}
                                    />
                                    <div className="font-bold text-text">{player.firstName} {player.lastName}</div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-text/80 text-center">{player.position}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${player.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {player.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderPlayerTable = (teamPlayers: Player[]) => (
        <div className="overflow-auto max-h-[400px] rounded-xl border border-text/10">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-background z-20">
                    <tr className="text-text/40 text-xs md:text-sm border-b border-text/10">
                        <th className="px-2 py-3 whitespace-nowrap text-left sticky left-0 bg-background z-30 w-[120px] md:w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">PLAYER</th>
                        {renderSortHeader('MIN', 'minutes')}
                            {renderSortHeader('PTS', 'points')}
                            {renderSortHeader('REB', 'rebounds')}
                            {renderSortHeader('AST', 'assists')}
                            {renderSortHeader('STL', 'steals')}
                            {renderSortHeader('BLK', 'blocks')}
                            {renderSortHeader('TO', 'turnovers')}
                            {renderSortHeader('PF', 'fouls')}
                            {renderSortHeader('FG%', 'fgPercentage')}
                            {renderSortHeader('3P%', 'threePtPercentage')}
                            {renderSortHeader('FT%', 'ftPercentage')}
                            {renderSortHeader('+/-', 'plusMinus')}
                            <th className="px-2 py-3 whitespace-nowrap text-center min-w-[60px]">FG</th>
                            <th className="px-2 py-3 whitespace-nowrap text-center min-w-[60px]">3PT</th>
                            <th className="px-2 py-3 whitespace-nowrap text-center min-w-[60px]">FT</th>
                            {renderSortHeader('OREB', 'reboundsOffensive')}
                            {renderSortHeader('DREB', 'reboundsDefensive')}
                        </tr>
                    </thead>
                    <tbody>
                        {teamPlayers.map((player) => (
                            <tr key={player.personId} className={`border-b border-text/5 ${player.isOnCourt ? 'bg-text/5' : ''} text-xs md:text-sm hover:bg-white/5 transition-colors`}>
                                <td className="px-2 py-3 whitespace-nowrap text-left sticky left-0 bg-background z-10 border-r border-text/5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] max-w-[120px] md:max-w-[180px] overflow-hidden text-ellipsis">
                                    <div className="flex items-center gap-2">
                                        {player.isOnCourt && (
                                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse shrink-0" title="On Court" />
                                        )}
                                        <div className="font-bold text-text truncate">{player.firstName.charAt(0)}. {player.lastName}</div>
                                    </div>
                                </td>
                                <td className="px-2 py-3 text-text/80 font-mono text-center">{player.minutes.replace('PT', '').replace('M', ':').replace('S', '').split('.')[0]}</td>
                                <td className="px-2 py-3 text-text font-bold text-center">{player.points}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.rebounds}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.assists}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.steals}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.blocks}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.turnovers}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{player.fouls}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{formatPercentage(player.fgPercentage)}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{formatPercentage(player.threePtPercentage)}</td>
                                <td className="px-2 py-3 text-text/80 text-center">{formatPercentage(player.ftPercentage)}</td>
                                <td className={`px-2 py-3 text-center ${player.plusMinus > 0 ? 'text-green-400' : player.plusMinus < 0 ? 'text-red-400' : 'text-text/60'}`}>
                                    {player.plusMinus > 0 ? `+${player.plusMinus}` : player.plusMinus}
                                </td>
                                <td className="px-2 py-3 text-text/60 text-center">{player.fg}</td>
                                <td className="px-2 py-3 text-text/60 text-center">{player.threePt}</td>
                                <td className="px-2 py-3 text-text/60 text-center">{player.ft}</td>
                                <td className="px-2 py-3 text-text/60 text-center">{player.reboundsOffensive}</td>
                                <td className="px-2 py-3 text-text/60 text-center">{player.reboundsDefensive}</td>
                            </tr>
                        ))}
                </tbody>
            </table>
        </div>
    );

    const renderTeamStats = () => {
        const homeStats = gameData.homeTeam.statistics;
        const awayStats = gameData.awayTeam.statistics;

        if (!homeStats || !awayStats) return <div className="p-4 text-center text-text/40">Team stats unavailable</div>;

        const statsList = [
            { label: 'Field Goal %', home: homeStats.fieldGoalsPercentage, away: awayStats.fieldGoalsPercentage, format: formatPercentage },
            { label: '3PT %', home: homeStats.threePointersPercentage, away: awayStats.threePointersPercentage, format: formatPercentage },
            { label: 'Free Throw %', home: homeStats.freeThrowsPercentage, away: awayStats.freeThrowsPercentage, format: formatPercentage },
            { label: 'Rebounds', home: homeStats.reboundsTotal, away: awayStats.reboundsTotal },
            { label: 'Assists', home: homeStats.assists, away: awayStats.assists },
            { label: 'Steals', home: homeStats.steals, away: awayStats.steals },
            { label: 'Blocks', home: homeStats.blocks, away: awayStats.blocks },
            { label: 'Turnovers', home: homeStats.turnovers, away: awayStats.turnovers },
            { label: 'Points in Paint', home: homeStats.pointsInThePaint, away: awayStats.pointsInThePaint },
            { label: 'Fast Break PTS', home: homeStats.fastBreakPoints, away: awayStats.fastBreakPoints },
        ];

        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                {statsList.map((stat, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-primary w-16 text-left">
                                {stat.format ? stat.format(stat.home) : stat.home}
                            </span>
                            <span className="text-text/40 font-medium uppercase tracking-wider text-xs">{stat.label}</span>
                            <span className="font-bold text-secondary w-16 text-right">
                                {stat.format ? stat.format(stat.away) : stat.away}
                            </span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-text/10">
                            <div 
                                className="bg-primary h-full transition-all duration-500" 
                                style={{ width: `${(stat.home / (stat.home + stat.away)) * 100}%` }}
                            />
                            <div 
                                className="bg-secondary h-full transition-all duration-500" 
                                style={{ width: `${(stat.away / (stat.home + stat.away)) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const tabs = [
        { id: 'home', label: gameData.homeTeam.teamTricode, shortLabel: gameData.homeTeam.teamTricode },
        { id: 'away', label: gameData.awayTeam.teamTricode, shortLabel: gameData.awayTeam.teamTricode },
        !isScheduled && { id: 'team', label: 'Team Stats', shortLabel: 'Team' },
        !isScheduled && { id: 'pbp', label: 'Play by Play', shortLabel: 'Plays' },
    ].filter(Boolean) as { id: string; label: string; shortLabel: string }[];

    return (
        <div className="glass rounded-2xl shadow-2xl shadow-black/50 p-4 md:p-6 h-full">
            <div className="flex justify-center mb-6">
                <div className="bg-transparent rounded-xl p-1 flex gap-1 md:gap-2 relative w-full md:w-auto justify-between md:justify-center">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`relative flex-1 md:flex-none px-2 md:px-6 py-2 rounded-lg font-bold text-xs md:text-sm transition-colors duration-300 font-sans tracking-wide z-10 whitespace-nowrap ${activeTab === tab.id ? 'text-text' : 'text-text/60 hover:text-text'}`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeGameTab"
                                    className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 uppercase hidden md:inline">{tab.label}</span>
                            <span className="relative z-10 uppercase md:hidden">{tab.shortLabel}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-full">
                {activeTab === 'home' && (isScheduled ? renderRosterTable(homePlayers) : renderPlayerTable(sortedHomePlayers))}
                {activeTab === 'away' && (isScheduled ? renderRosterTable(awayPlayers) : renderPlayerTable(sortedAwayPlayers))}
                {activeTab === 'team' && renderTeamStats()}
                {activeTab === 'pbp' && (
                    <div className="overflow-auto max-h-[400px] rounded-xl border border-text/10 p-4 space-y-2">
                        {actions.slice().reverse().map((action) => {
                            // Format clock from PT12M00.00S to 12:00
                            let formattedClock = action.clock;
                            if (action.clock.startsWith('PT')) {
                                const match = action.clock.match(/PT(\d+)M(\d+(\.\d+)?)S/);
                                if (match) {
                                    const minutes = match[1];
                                    const seconds = Math.floor(parseFloat(match[2])).toString().padStart(2, '0');
                                    formattedClock = `${minutes}:${seconds}`;
                                }
                            }
                            
                            return (
                                <div key={action.actionNumber} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-text/5">
                                    <div className="text-xl font-mono text-text/40 mt-1 min-w-[60px] font-bold">
                                        Q{action.period} {formattedClock}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-bold text-sm ${action.teamId === gameData.homeTeam.teamId ? 'text-primary' : 'text-secondary'}`}>
                                                {action.teamTricode}
                                            </span>
                                            <span className="text-xs text-text/60 uppercase tracking-wider border border-text/10 px-1.5 rounded">
                                                {action.actionType}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text/90">{action.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {actions.length === 0 && (
                            <div className="text-center text-text/40 py-10">No plays available yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsSection;
