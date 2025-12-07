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
import SeasonStats from '../components/SeasonStats';
import PreviousMatchups from '../components/PreviousMatchups';
import WinProbability from '../components/WinProbability';
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
        let timeoutId: ReturnType<typeof setTimeout>;
        let isMounted = true;

        const fetchData = async () => {
            if (!gameId) return;
            
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const [boxRes, pbpRes] = await Promise.all([
                    axios.get(`${API_URL}/api/games/${gameId}`),
                    axios.get(`${API_URL}/api/games/${gameId}/pbp`)
                ]);
                
                if (!isMounted) return;

                // The backend returns the game object directly, or wrapped in 'game' depending on the source
                // We handle both cases here
                const rawGameData = boxRes.data.game || boxRes.data;
                let currentGameStatus = 0;

                if (rawGameData && rawGameData.gameId) {
                    const game = rawGameData;
                    currentGameStatus = game.gameStatus;
                    
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
                    
                    const mapPlayer = (p: any, teamId: number) => {
                        // Handle both nested statistics (CDN) and flat structure (Backend/Scheduled)
                        const stats = p.statistics || p;
                        
                        return {
                            personId: p.personId,
                            firstName: p.firstName,
                            lastName: p.familyName || p.lastName,
                            jersey: p.jerseyNum || p.jersey,
                            position: p.position,
                            status: p.status,
                            notPlayingReason: p.notPlayingDescription || p.notPlayingReason,
                            points: stats.points || 0,
                            rebounds: stats.reboundsTotal || stats.rebounds || 0,
                            assists: stats.assists || 0,
                            fouls: stats.foulsPersonal || stats.fouls || 0,
                            fgPercentage: stats.fieldGoalsPercentage || stats.fgPercentage || 0,
                            threePtPercentage: stats.threePointersPercentage || stats.threePtPercentage || 0,
                            ftPercentage: stats.freeThrowsPercentage || stats.ftPercentage || 0,
                            plusMinus: stats.plusMinusPoints || stats.plusMinus || 0,
                            fg: stats.fieldGoalsMade ? `${stats.fieldGoalsMade}-${stats.fieldGoalsAttempted}` : (stats.fg || '0-0'),
                            threePt: stats.threePointersMade ? `${stats.threePointersMade}-${stats.threePointersAttempted}` : (stats.threePt || '0-0'),
                            ft: stats.freeThrowsMade ? `${stats.freeThrowsMade}-${stats.freeThrowsAttempted}` : (stats.ft || '0-0'),
                            minutes: stats.minutes || "0",
                            blocks: stats.blocks || 0,
                            steals: stats.steals || 0,
                            turnovers: stats.turnovers || 0,
                            reboundsOffensive: stats.reboundsOffensive || 0,
                            reboundsDefensive: stats.reboundsDefensive || 0,
                            isOnCourt: p.onCourt === '1' || p.onCourt === 1 || p.isOnCourt === true,
                            teamId: teamId
                        };
                    };

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

                // Schedule next fetch based on game status
                if (currentGameStatus === 2) {
                    // Live game: poll every 5 seconds
                    timeoutId = setTimeout(fetchData, 5000);
                } else if (currentGameStatus === 1) {
                    // Scheduled game: poll every 60 seconds to check for start
                    timeoutId = setTimeout(fetchData, 60000);
                }
                // If status is 3 (Final), stop polling

            } catch (error) {
                console.error('Error fetching game data:', error);
                setError('Failed to load game data. Please try again later.');
                // Retry on error
                timeoutId = setTimeout(fetchData, 10000);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
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
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
                        <p className="text-text/60 max-w-md mx-auto">{error || 'We couldn\'t find the game you\'re looking for.'}</p>
                        <div className="flex gap-4 justify-center">
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors"
                            >
                                Retry
                            </button>
                            <button 
                                onClick={() => navigate('/')}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                Back to Games
                            </button>
                        </div>
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
                                {gameData.winProbability && (
                                    <WinProbability 
                                        data={gameData.winProbability}
                                        homeTeamName={gameData.homeTeam.teamName}
                                        awayTeamName={gameData.awayTeam.teamName}
                                    />
                                )}
                                
                                {gameData.seasonStats && (
                                    <SeasonStats 
                                        homeStats={gameData.seasonStats.home}
                                        awayStats={gameData.seasonStats.away}
                                        homeTeamName={gameData.homeTeam.teamName}
                                        awayTeamName={gameData.awayTeam.teamName}
                                    />
                                )}

                                {gameData.previousMatchups && (
                                    <PreviousMatchups 
                                        matchups={gameData.previousMatchups}
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stats Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="w-full"
                    >
                        <h3 className="text-xl md:text-lg font-bold mb-4 md:mb-3">
                            {gameData.gameStatus === 1 ? 'Team Rosters' : 'Game Stats'}
                        </h3>
                        <StatsSection gameData={gameData} players={players} actions={pbpData} />
                    </motion.div>
                </div>
            </motion.div>
        </Layout>
    );
};

export default Game;
