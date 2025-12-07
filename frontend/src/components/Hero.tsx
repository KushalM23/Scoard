import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import GameCard from './GameCard';

interface HeroProps {
    onGameSelect: (gameId: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onGameSelect }) => {
    const [games, setGames] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'scores' | 'standings'>('scores');

    useEffect(() => {
        const fetchGames = async () => {
            try {
                setLoading(true);

                // Adjust date for API: If user selects "Dec 7" (IST), they want "Dec 6" (ET) games
                // Subtract 1 day from selected date for API call
                const apiDate = subDays(selectedDate, 1);
                const formattedDate = format(apiDate, 'yyyy-MM-dd');

                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                let endpoint = `${API_URL}/api/games/date/${formattedDate}`;

                const response = await axios.get(endpoint);
                const fetchedGames = response.data.scoreboard.games;

                // Sort games: Live first, then by start time
                const sortedGames = fetchedGames.sort((a: any, b: any) => {
                    if (a.gameStatus === 2 && b.gameStatus !== 2) return -1;
                    if (b.gameStatus === 2 && a.gameStatus !== 2) return 1;
                    return new Date(a.gameEt).getTime() - new Date(b.gameEt).getTime();
                });

                setGames(sortedGames);
            } catch (error) {
                console.error('Failed to fetch games', error);
                setGames([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, [selectedDate]);

    // Generate array of 7 days (3 before, current, 3 after)
    const calendarDays = [-3, -2, -1, 0, 1, 2, 3].map(offset => addDays(selectedDate, offset));

    return (
        <div className="w-full md:w-full mx-auto px-2 py-4 md:px-8 md:py-6 pb-32 md:pb-24">
            {/* Tabs */}
            <div className="flex justify-center mb-6 md:mb-4">
                <div className="glass rounded-xl p-1 flex gap-2 md:gap-1.5 relative">
                    {['scores', 'standings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as 'scores' | 'standings')}
                            className={`relative px-6 py-2 md:px-8 md:py-2.5 rounded-lg font-bold text-sm md:text-base transition-colors duration-300 font-sans tracking-wide z-10 ${activeTab === tab ? 'text-text' : 'text-text/60 hover:text-text'}`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-accent rounded-lg shadow-lg"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 uppercase">{tab}</span>
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'scores' ? (
                    <motion.div
                        key="scores"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Game Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <motion.div
                                    animate={{ y: [0, -20, 0] }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                                    className="text-4xl"
                                >
                                    🏀
                                </motion.div>
                                <p className="text-text/40 font-mono animate-pulse">LOADING GAMES...</p>
                            </div>
                        ) : games.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <p className="text-text/40 font-mono">NO GAMES SCHEDULED</p>
                            </div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-12"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: {
                                            staggerChildren: 0.1
                                        }
                                    }
                                }}
                            >
                                {games.map((game) => (
                                    <GameCard
                                        key={game.gameId}
                                        game={game}
                                        onClick={() => onGameSelect(game.gameId)}
                                    />
                                ))}
                            </motion.div>
                        )}

                        {/* Date Picker (Bottom) */}
                        <motion.div
                            initial={{ y: 100, opacity: 0, x: "-50%" }}
                            animate={{ y: 0, opacity: 1, x: "-50%" }}
                            transition={{ delay: 0.5, type: "spring" }}
                            className="fixed bottom-6 left-1/2 glass rounded-2xl px-2 py-2 flex items-center gap-1 z-50 shadow-2xl shadow-black/50 overflow-x-auto max-w-[95vw]"
                        >
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                id="prev-day-btn"
                                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors group shrink-0"
                            >
                                <ChevronLeft className="w-6 h-6 lg:w-8 lg:h-8 text-text/60 group-hover:text-text" />
                            </motion.button>

                            <div className="flex items-center gap-1">
                                {calendarDays.map((date, index) => {
                                    const isSelected = index === 3; // Center item (offset 0)
                                    // Hide first and last items on mobile to show 5 days
                                    const isHiddenOnMobile = index === 0 || index === 6;
                                    
                                    return (
                                        <motion.button
                                            key={date.toISOString()}
                                            layout
                                            onClick={() => setSelectedDate(date)}
                                            className={`flex flex-col items-center justify-center w-12 h-12 lg:w-20 lg:h-20 rounded-xl transition-colors duration-300 shrink-0 ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'} ${isSelected
                                                ? 'bg-accent text-text shadow-lg shadow-accent/20'
                                                : 'hover:bg-white/5 text-text/60 hover:text-text'
                                                }`}
                                            animate={{
                                                scale: isSelected ? 1.1 : 1,
                                                opacity: isSelected ? 1 : 0.7
                                            }}
                                        >
                                            <span className="text-[10px] lg:text-sm font-bold uppercase tracking-wider">{format(date, 'EEE')}</span>
                                            <span className={`font-mono font-bold ${isSelected ? 'text-xl lg:text-4xl' : 'text-base lg:text-2xl'}`}>
                                                {format(date, 'd')}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                id="next-day-btn"
                                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors group shrink-0"
                            >
                                <ChevronRight className="w-6 h-6 lg:w-8 lg:h-8 text-text/60 group-hover:text-text" />
                            </motion.button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="standings"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="glass-card p-12 text-center"
                    >
                        <h3 className="text-2xl font-bold mb-4 font-display">STANDINGS</h3>
                        <p className="text-text/60 font-sans">League standings coming soon...</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Hero;
