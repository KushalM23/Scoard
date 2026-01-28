import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { Matchup } from '../types';

interface PreviousMatchupsProps {
    matchups: Matchup[];
}

const MatchupItem: React.FC<{ matchup: Matchup }> = ({ matchup }) => {
    const navigate = useNavigate();
    const [gameData, setGameData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchScore = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await axios.get(`${API_URL}/api/games/${matchup.gameId}`);
                
                if (isMounted) {
                    const data = res.data.game || res.data;
                    setGameData(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch previous matchup score", err);
                if (isMounted) setLoading(false);
            }
        };
        fetchScore();
        return () => { isMounted = false; };
    }, [matchup.gameId]);

    if (loading) {
        return (
             <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg animate-pulse h-[72px]">
                 <div className="flex flex-col w-full gap-2">
                     <div className="w-20 h-3 bg-white/5 rounded mx-auto"></div>
                     <div className="flex justify-between w-full px-4">
                        <div className="w-10 h-5 bg-white/5 rounded"></div>
                        <div className="w-16 h-6 bg-white/5 rounded"></div>
                        <div className="w-10 h-5 bg-white/5 rounded"></div>
                     </div>
                 </div>
             </div>
        );
    }

    if (!gameData) {
        return null;
    }

    const { homeTeam, awayTeam } = gameData;
    const isHomeWinner = parseInt(homeTeam.score) > parseInt(awayTeam.score);

    return (
        <div 
            onClick={() => navigate(`/game/${matchup.gameId}`)}
            className="flex items-center justify-between p-3 bg-background/30 rounded-lg cursor-pointer hover:bg-background/50 transition-colors"
        >
            <div className="flex flex-col w-full">
                <span className="text-xs text-text/40 mb-1 text-center">{new Date(matchup.gameDate).toLocaleDateString()}</span>
                <div className='flex justify-between items-center w-full px-4'> 
                    <span className={`font-bold w-1/3 text-2xl text-left ${isHomeWinner ? 'text-text' : 'text-text/40'}`}>
                        {homeTeam.teamTricode}
                    </span>
                    
                    <span className={`font-mono font-bold text-4xl w-1/3 text-center ${isHomeWinner ? 'text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-text/40'}`}>
                        {homeTeam.score} 
                    </span>
                    
                    <span className="font-mono font-bold text-4xl w-1/3 text-center">
                        -
                    </span>

                    <span className={`font-mono font-bold text-4xl w-1/3 text-center ${!isHomeWinner ? 'text-text drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-text/40'}`}>
                        {awayTeam.score} 
                    </span>

                    <span className={`font-bold w-1/3  text-2xl text-right ${!isHomeWinner ? 'text-text' : 'text-text/40'}`}>
                        {awayTeam.teamTricode}
                    </span>
                </div>
            </div>
        </div>
    );
};

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
                    <MatchupItem key={game.gameId} matchup={game} />
                ))}
            </div>
        </div>
    );
};

export default PreviousMatchups;