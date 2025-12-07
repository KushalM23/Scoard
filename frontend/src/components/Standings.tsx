import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import axios from 'axios';

interface TeamStanding {
    teamId: number;
    teamCity: string;
    teamName: string;
    conference: string;
    division: string;
    wins: number;
    losses: number;
    winPct: number;
    homeRecord: string;
    roadRecord: string;
    l10: string;
    streak: string;
    pointsPg: number;
    oppPointsPg: number;
    diffPointsPg: number;
    conferenceRank: number;
    divisionRank: number;
}

const Standings: React.FC = () => {
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'Conference' | 'Division'>('Conference');
    const [activeTab, setActiveTab] = useState('East');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const conferenceTabs = [
        { id: 'East', label: 'East', type: 'conference', value: 'East' },
        { id: 'West', label: 'West', type: 'conference', value: 'West' },
    ];

    const divisionTabs = [
        { id: 'Atl', label: 'Atl', type: 'division', value: 'Atlantic' },
        { id: 'Cen', label: 'Cen', type: 'division', value: 'Central' },
        { id: 'SE', label: 'SE', type: 'division', value: 'Southeast' },
        { id: 'NW', label: 'NW', type: 'division', value: 'Northwest' },
        { id: 'Pac', label: 'Pac', type: 'division', value: 'Pacific' },
        { id: 'SW', label: 'SW', type: 'division', value: 'Southwest' },
    ];

    const currentTabs = viewMode === 'Conference' ? conferenceTabs : divisionTabs;

    // Reset active tab when view mode changes
    useEffect(() => {
        if (viewMode === 'Conference') {
            setActiveTab('East');
        } else {
            setActiveTab('Atl');
        }
    }, [viewMode]);

    useEffect(() => {
        const fetchStandings = async () => {
            try {
                setLoading(true);
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await axios.get(`${API_URL}/api/standings`);
                
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setStandings(response.data);
                    setError(null);
                } else {
                    setError('No standings data found');
                }
            } catch (err: any) {
                console.error('Error fetching standings:', err);
                setError(err.message || 'Failed to load standings');
            } finally {
                setLoading(false);
            }
        };

        fetchStandings();
    }, []);

    const renderTable = (teams: TeamStanding[]) => (
        <div className="mb-8 glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-text/80 whitespace-nowrap">
                    <thead className="text-xs text-text/60 uppercase bg-white/5 font-sans tracking-wider">
                        <tr>
                            <th className="p-0 w-16 sticky left-0 bg-background z-10">
                                <div className="px-4 py-3 w-full h-full flex items-center">Rank</div>
                            </th>
                            <th className="p-0 sticky left-16 bg-background z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                <div className="px-4 py-3 w-full h-full flex items-center">Team</div>
                            </th>
                            <th className="px-4 py-3 text-center bg-background">W</th>
                            <th className="px-4 py-3 text-center bg-background">L</th>
                            <th className="px-4 py-3 text-center bg-background">Pct</th>
                            <th className="px-4 py-3 text-center bg-background">GB</th>
                            <th className="px-4 py-3 text-center bg-background">Home</th>
                            <th className="px-4 py-3 text-center bg-background">Road</th>
                            <th className="px-4 py-3 text-center bg-background">Div</th>
                            <th className="px-4 py-3 text-center bg-background">L10</th>
                            <th className="px-4 py-3 text-center bg-background">Strk</th>
                            <th className="px-4 py-3 text-center bg-background">+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.teamId} className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                                <td className="px-4 py-3 font-medium text-text/60 sticky left-0 bg-background z-10">
                                    {activeTab === 'East' || activeTab === 'West' ? team.conferenceRank : team.divisionRank}
                                </td>
                                <td className="px-4 py-3 font-medium text-text sticky left-16 bg-background z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                    <span className="hidden sm:inline">{team.teamCity} {team.teamName}</span>
                                    <span className="sm:hidden">{team.teamName}</span>
                                </td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono">{team.wins}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono">{team.losses}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono">{(team.winPct * 100).toFixed(1)}%</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">-</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">{team.homeRecord}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">{team.roadRecord}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">{team.division}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">{team.l10}</td>
                                <td className="px-4 py-3 text-center text-xl font-medium font-mono text-text/60">{team.streak}</td>
                                <td className={`px-4 py-3 text-center text-xl font-medium font-mono ${team.diffPointsPg > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {team.diffPointsPg > 0 ? '+' : ''}{team.diffPointsPg}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                    className="text-4xl"
                >
                    🏀
                </motion.div>
                <p className="text-text/40 font-mono animate-pulse">LOADING STANDINGS...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="glass-card p-6 flex flex-col items-center gap-4 max-w-md mx-4">
                    <p className="text-red-400 font-mono text-center">
                        {error.toUpperCase()}
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold transition-all hover:scale-105"
                    >
                        RETRY CONNECTION
                    </button>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-6"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-4xl font-bold text-text font-mono tracking-wide">Standings</h2>
                
                {/* View Mode Dropdown */}
                <div className="relative">
                    <motion.button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-accent/50 group"
                    >
                        <span className="font-medium text-sm font-display group-hover:text-accent transition-colors">
                            {viewMode === 'Conference' ? 'By Conference' : 'By Division'}
                        </span>
                        <motion.div
                            animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-text/60" />
                        </motion.div>
                    </motion.button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute top-full right-0 mt-2 w-48 bg-background border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden ring-1 ring-white/5"
                            >
                                <button
                                    onClick={() => { setViewMode('Conference'); setIsDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors hover:bg-white/5 border-l-2 border-transparent hover:border-accent"
                                >
                                    <span className={`font-medium text-sm font-display transition-colors ${viewMode === 'Conference' ? 'text-accent' : 'text-text/70 group-hover:text-text'}`}>
                                        By Conference
                                    </span>
                                    {viewMode === 'Conference' && <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>}
                                </button>

                                <button
                                    onClick={() => { setViewMode('Division'); setIsDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors hover:bg-white/5 border-l-2 border-transparent hover:border-accent"
                                >
                                    <span className={`font-medium text-sm font-display transition-colors ${viewMode === 'Division' ? 'text-accent' : 'text-text/70 group-hover:text-text'}`}>
                                        By Division
                                    </span>
                                    {viewMode === 'Division' && <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {standings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-text/40 font-mono">NO STANDINGS DATA AVAILABLE</p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Tabs */}
                    <div className="flex justify-center w-full">
                        <div className={`glass rounded-xl p-1 grid ${viewMode === 'Conference' ? 'grid-cols-2 w-full md:w-auto' : 'grid-cols-6 w-full md:w-auto'} gap-1 relative`}>
                            {currentTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-1 md:px-6 py-2 rounded-lg font-bold text-[10px] md:text-sm transition-colors duration-300 font-sans tracking-wide z-10 ${activeTab === tab.id ? 'text-text' : 'text-text/60 hover:text-text'}`}
                                >
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="activeStandingsTab"
                                            className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 uppercase whitespace-nowrap">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderTable(
                                standings
                                    .filter(t => {
                                        const tab = currentTabs.find(tab => tab.id === activeTab);
                                        if (tab?.type === 'conference') return t.conference === tab.value;
                                        return t.division === tab?.value;
                                    })
                                    .sort((a, b) => {
                                        const tab = currentTabs.find(tab => tab.id === activeTab);
                                        if (tab?.type === 'conference') return a.conferenceRank - b.conferenceRank;
                                        return a.divisionRank - b.divisionRank;
                                    })
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
};

export default Standings;