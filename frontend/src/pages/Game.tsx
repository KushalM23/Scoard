import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Scoreboard from '../components/Scoreboard';
import VirtualCourt from '../components/VirtualCourt';
import StatsSection from '../components/StatsSection';
import TopPerformers from '../components/TopPerformers';
import InjuryReport from '../components/InjuryReport';
import type { GameData, PlayByPlayEvent, Player } from '../types';

const Game: React.FC = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [pbpData, setPbpData] = useState<PlayByPlayEvent[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!gameId) return;
            
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const [boxRes, pbpRes] = await Promise.all([
                    axios.get(`${API_URL}/api/games/${gameId}`),
                    axios.get(`${API_URL}/api/games/${gameId}/pbp`)
                ]);
                
                // The backend returns the game object directly, or wrapped in 'game' depending on the source
                // We handle both cases here
                const rawGameData = boxRes.data.game || boxRes.data;

                if (rawGameData && rawGameData.gameId) {
                    const game = rawGameData;
                    
                    // Normalize team data to match our interface and prevent crashes
                    const normalizeTeam = (team: any) => ({
                        ...team,
                        inBonus: team.inBonus === '1' || team.inBonus === 1 || team.inBonus === true,
                        wins: team.wins || 0,
                        losses: team.losses || 0,
                        // API returns periods as objects [{period: 1, score: 20}], we need numbers [20]
                        periods: Array.isArray(team.periods) 
                            ? team.periods.map((p: any) => (typeof p === 'object' && p !== null && 'score' in p) ? p.score : p) 
                            : [],
                        statistics: team.statistics // Pass through the statistics object
                    });

                    const normalizedGame = {
                        ...game,
                        homeTeam: normalizeTeam(game.homeTeam),
                        awayTeam: normalizeTeam(game.awayTeam),
                    };

                    setGameData(normalizedGame);
                    
                    // Process players from the API response
                    const allPlayers: Player[] = [];
                    
                    const mapPlayer = (p: any, teamId: number) => ({
                        personId: p.personId,
                        firstName: p.firstName,
                        lastName: p.familyName,
                        jersey: p.jerseyNum,
                        position: p.position,
                        status: p.status,
                        notPlayingReason: p.notPlayingDescription || p.notPlayingReason,
                        points: p.statistics.points,
                        rebounds: p.statistics.reboundsTotal,
                        assists: p.statistics.assists,
                        fouls: p.statistics.foulsPersonal,
                        fgPercentage: p.statistics.fieldGoalsPercentage,
                        threePtPercentage: p.statistics.threePointersPercentage,
                        ftPercentage: p.statistics.freeThrowsPercentage,
                        plusMinus: p.statistics.plusMinusPoints,
                        fg: `${p.statistics.fieldGoalsMade}-${p.statistics.fieldGoalsAttempted}`,
                        threePt: `${p.statistics.threePointersMade}-${p.statistics.threePointersAttempted}`,
                        ft: `${p.statistics.freeThrowsMade}-${p.statistics.freeThrowsAttempted}`,
                        minutes: p.statistics.minutes,
                        blocks: p.statistics.blocks,
                        steals: p.statistics.steals,
                        turnovers: p.statistics.turnovers,
                        reboundsOffensive: p.statistics.reboundsOffensive,
                        reboundsDefensive: p.statistics.reboundsDefensive,
                        isOnCourt: p.onCourt === '1' || p.onCourt === 1,
                        teamId: teamId
                    });

                    if (game.players && Array.isArray(game.players)) {
                        allPlayers.push(...game.players.map((p: any) => mapPlayer(p, p.teamId)));
                    } else {
                        if (game.homeTeam && game.homeTeam.players) {
                            allPlayers.push(...game.homeTeam.players.map((p: any) => mapPlayer(p, game.homeTeam.teamId)));
                        }
                        if (game.awayTeam && game.awayTeam.players) {
                            allPlayers.push(...game.awayTeam.players.map((p: any) => mapPlayer(p, game.awayTeam.teamId)));
                        }
                    }
                    
                    setPlayers(allPlayers);
                }
                
                if (pbpRes.data && pbpRes.data.game && pbpRes.data.game.actions) {
                    setPbpData(pbpRes.data.game.actions);
                }
                setError(null);
            } catch (error) {
                console.error('Error fetching game data:', error);
                setError('Failed to load game data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [gameId]);

    if (loading && !gameData) {
        return (
            <Layout>
                <Header />
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="flex flex-col items-center gap-4">
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                            className="text-4xl"
                        >
                            🏀
                        </motion.div>
                        <p className="text-text/60 font-mono animate-pulse">LOADING GAME DATA...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !gameData) {
        return (
            <Layout>
                <Header />
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
                        <p className="text-text/60 mb-4">{error || 'Game not found'}</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            Back to Games
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header />
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-5xl mx-auto px-6 md:px-4 py-8 md:py-6"
            >
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-text/60 hover:text-text mb-6 md:mb-4 transition-colors text-base md:text-sm"
                >
                    <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
                    Back to Games
                </button>

                {/* Scoreboard Section */}
                <Scoreboard gameData={gameData} />

                <div className="flex flex-col gap-8 md:gap-6">
                    {/* Dynamic Visualizer Section */}
                    <div className="w-full">
                        {gameData.gameStatus === 2 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                <VirtualCourt 
                                    actions={pbpData} 
                                    gameStatus={gameData.gameStatus}
                                    homeTeam={gameData.homeTeam}
                                    awayTeam={gameData.awayTeam}
                                    players={players}
                                />
                            </motion.div>
                        ) : gameData.gameStatus === 3 ? (
                            <TopPerformers 
                                homeTeamName={gameData.homeTeam.teamTricode}
                                awayTeamName={gameData.awayTeam.teamTricode}
                                homePlayers={players.filter(p => p.teamId === gameData.homeTeam.teamId)}
                                awayPlayers={players.filter(p => p.teamId === gameData.awayTeam.teamId)}
                            />
                        ) : (
                            <div className="space-y-6">
                                <InjuryReport 
                                    homeTeamName={gameData.homeTeam.teamTricode}
                                    awayTeamName={gameData.awayTeam.teamTricode}
                                    homePlayers={players.filter(p => p.teamId === gameData.homeTeam.teamId)}
                                    awayPlayers={players.filter(p => p.teamId === gameData.awayTeam.teamId)}
                                />
                                <div className="text-center text-text/40 py-10">
                                    Game starts at {gameData.gameStatusText}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats Section */}
                    {gameData.gameStatus !== 1 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="w-full"
                        >
                            <h3 className="text-xl md:text-lg font-bold mb-4 md:mb-3">Game Stats</h3>
                            <StatsSection gameData={gameData} players={players} actions={pbpData} />
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </Layout>
    );
};

export default Game;
