import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import VirtualCourt from '../components/VirtualCourt';

const Game: React.FC = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [gameData, setGameData] = useState<any>(null);
    const [pbpData, setPbpData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [boxRes, pbpRes] = await Promise.all([
                    axios.get(`http://localhost:3000/api/games/${gameId}`),
                    axios.get(`http://localhost:3000/api/games/${gameId}/pbp`)
                ]);
                setGameData(boxRes.data.game);
                setPbpData(pbpRes.data.game.actions);
            } catch (error) {
                console.error('Failed to fetch game data', error);
            } finally {
                setLoading(false);
            }
        };

        if (gameId) {
            fetchData();
            // Poll every 5 seconds for live data
            const interval = setInterval(fetchData, 5000);
            return () => clearInterval(interval);
        }
    }, [gameId]);

    if (loading && !gameData) {
        return (
            <Layout>
                <Header />
                <div className="flex justify-center items-center h-[calc(100vh-80px)]">
                    <div className="animate-bounce text-4xl">🏀</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Header />
            <div className="max-w-7xl mx-auto px-6 py-8">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-text/60 hover:text-text mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Games
                </button>

                {/* Scoreboard Header */}
                <div className="glass-card p-8 mb-8 flex justify-between items-center">
                    <div className="text-center">
                        <h2 className="text-4xl font-bold mb-2">{gameData?.awayTeam.teamTricode}</h2>
                        <p className="text-6xl font-mono font-bold">{gameData?.awayTeam.score}</p>
                    </div>

                    <div className="text-center">
                        <div className="text-xl font-bold text-accent mb-2">
                            {gameData?.gameStatusText}
                        </div>
                        <div className="text-sm text-text/60">Period {gameData?.period}</div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-4xl font-bold mb-2">{gameData?.homeTeam.teamTricode}</h2>
                        <p className="text-6xl font-mono font-bold">{gameData?.homeTeam.score}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Virtual Court */}
                    <div className="lg:col-span-2">
                        <h3 className="text-xl font-bold mb-4">Live Visualizer</h3>
                        <VirtualCourt actions={pbpData} />
                    </div>

                    {/* Stats / Play-by-Play Feed */}
                    <div className="glass-card p-6 h-[500px] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Recent Plays</h3>
                        <div className="space-y-4">
                            {pbpData.slice().reverse().slice(0, 20).map((action: any) => (
                                <div key={action.actionNumber} className="border-b border-white/10 pb-2">
                                    <div className="flex justify-between text-sm text-text/60 mb-1">
                                        <span>{action.clock}</span>
                                        <span>Q{action.period}</span>
                                    </div>
                                    <p className="text-sm">{action.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Game;
