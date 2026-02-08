'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Maximize, Minimize } from 'lucide-react';
import type { PlayByPlayEvent, Team, Player } from '../types';
import SVGCourt from './SVGCourt';
import { getTeamColors } from '../lib/teamColors';

interface VirtualCourtProps {
    actions: PlayByPlayEvent[];
    gameStatus: number; // 1: Scheduled, 2: Live, 3: Final
    homeTeam: Team;
    awayTeam: Team;
    players: Player[];
}

const VirtualCourt: React.FC<VirtualCourtProps> = ({ actions, gameStatus, homeTeam, awayTeam, players }) => {
    const [recentAction, setRecentAction] = useState<PlayByPlayEvent | null>(null);
    const [sideNotification, setSideNotification] = useState<{ teamId: number; message: string; subMessage: string; personId: number } | null>(null);
    const [possessionTeamId, setPossessionTeamId] = useState<number | null>(null);
    const [overlayEvent, setOverlayEvent] = useState<{ title: string; description: string } | null>(null);
    const [currentScore, setCurrentScore] = useState({ home: homeTeam.score, away: awayTeam.score });

    // Queue System State
    const [eventQueue, setEventQueue] = useState<PlayByPlayEvent[]>([]);
    const lastProcessedIdRef = useRef<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstLoad = useRef(true);

    // Replay Mode State
    const [isReplaying, setIsReplaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [replayProgress, setReplayProgress] = useState(0);

    const courtContainerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Toggle fullscreen mode
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            courtContainerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen change events (e.g. user pressing Escape)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Direct coordinate mapping: API uses 0-100 for both x and y
    // SVG court has no margins, so we map directly to percentages
    const mapCoordinates = (x: number, y: number) => {
        // API coordinates are already in 0-100 range
        // x: 0-100 represents court length (94 feet)
        // y: 0-100 represents court width (50 feet)
        return { x, y };
    };

    // Handle replay start
    const startReplay = () => {
        // Clear any existing timers first
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        
        setIsReplaying(true);
        setIsPaused(false);
        setRecentAction(null);
        setCurrentScore({ home: 0, away: 0 });
        setSideNotification(null);
        setOverlayEvent(null);
        setEventQueue([]);
        setIsProcessing(false);
        lastProcessedIdRef.current = 0;
        setReplayProgress(0);
        
        // Use setTimeout to ensure state is cleared before adding new events
        setTimeout(() => {
            const sortedActions = [...actions].sort((a, b) => Number(a.actionNumber) - Number(b.actionNumber));
            setEventQueue(sortedActions);
        }, 0);
    };

    const stopReplay = () => {
        setIsReplaying(false);
        setIsPaused(false);
        setEventQueue([]);
        setIsProcessing(false);
        setRecentAction(null);
        setCurrentScore({ home: homeTeam.score, away: awayTeam.score });
        setSideNotification(null);
        setOverlayEvent(null);
        setReplayProgress(0);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const togglePause = () => {
        setIsPaused(prev => !prev);
    };

    // 1. Ingest new actions into queue
    useEffect(() => {
        if (actions.length > 0 && !isReplaying) {
            // On first load, skip queuing history and just show the latest state
            if (isFirstLoad.current) {
                // Find the latest action by number, regardless of array order
                // This prevents replaying the whole game if the API returns data in reverse order (newest first)
                const latest = actions.reduce((prev, current) => 
                    (Number(prev.actionNumber) > Number(current.actionNumber)) ? prev : current
                );

                setRecentAction(latest);
                lastProcessedIdRef.current = Number(latest.actionNumber);
                setPossessionTeamId(latest.teamId);
                isFirstLoad.current = false;

                // Check if the latest action is a special event (Timeout/Period) and show overlay immediately
                // This ensures that if the user loads the page during a timeout, they see the overlay
                const type = latest.actionType ? latest.actionType.toLowerCase() : '';
                
                if (type === 'timeout') {
                     setOverlayEvent({ title: 'TIMEOUT', description: latest.description });
                     // No timeout here, wait for next event
                } else if (type === 'period') {
                     const subType = latest.subType ? latest.subType.toLowerCase() : '';
                     const isEnd = subType === 'end';
                     const isStart = subType === 'start';
                     const periodName = latest.period <= 4 ? `Q${latest.period}` : `OT${latest.period - 4}`;
                     
                     let title = 'PERIOD UPDATE';
                     if (isEnd) title = `END OF ${periodName}`;
                     else if (isStart) title = `START OF ${periodName}`;

                     setOverlayEvent({ title, description: latest.description });
                     // No timeout here, wait for next event
                }

                return;
            }

            // Filter for new actions only
            const newActions = actions.filter(a => Number(a.actionNumber) > lastProcessedIdRef.current);
            
            if (newActions.length > 0) {
                // Sort by action number to ensure chronological order
                newActions.sort((a, b) => Number(a.actionNumber) - Number(b.actionNumber));
                
                setEventQueue(prev => [...prev, ...newActions]);
                lastProcessedIdRef.current = Number(newActions[newActions.length - 1].actionNumber);
            }
            
            // Always update possession based on absolute latest known state
            setPossessionTeamId(actions[actions.length - 1].teamId);
        }
    }, [actions, isReplaying]);

    // Sync score with props when not replaying
    useEffect(() => {
        if (!isReplaying) {
            setCurrentScore({ home: homeTeam.score, away: awayTeam.score });
        }
    }, [homeTeam.score, awayTeam.score, isReplaying]);

    // 2. Process queue sequentially
    useEffect(() => {
        if (eventQueue.length > 0 && !isProcessing && !isPaused) {
            setIsProcessing(true);
            const currentEvent = eventQueue[0];
            setRecentAction(currentEvent);

            if (currentEvent.scoreHome && currentEvent.scoreAway) {
                setCurrentScore({
                    home: parseInt(currentEvent.scoreHome),
                    away: parseInt(currentEvent.scoreAway)
                });
            }


            const type = currentEvent.actionType ? currentEvent.actionType.toLowerCase() : '';

            // --- Overlay Logic (Timeouts, Subs, Quarter End) ---
            const isOverlayEvent = type === 'timeout' || type === 'substitution' || type === 'period';
            
            if (!isOverlayEvent) {
                setOverlayEvent(null);
            }

            if (type === 'timeout') {
                setOverlayEvent({ title: 'TIMEOUT', description: currentEvent.description || 'Timeout' });
            } else if (type === 'substitution') {
                setOverlayEvent({ title: 'SUBSTITUTION', description: currentEvent.description || `Sub: ${currentEvent.playerNameI}` });
            } else if (type === 'period') {
                 const subType = currentEvent.subType ? currentEvent.subType.toLowerCase() : '';
                 const isEnd = subType === 'end';
                 const isStart = subType === 'start';
                 const periodName = currentEvent.period <= 4 ? `Q${currentEvent.period}` : `OT${currentEvent.period - 4}`;
                 
                 let title = 'PERIOD UPDATE';
                 if (isEnd) title = `END OF ${periodName}`;
                 else if (isStart) title = `START OF ${periodName}`;

                 setOverlayEvent({ title, description: currentEvent.description || '' });
            }

            // Remove from queue after delay
            const delay = isReplaying ? 2000 : ((type === 'timeout' || type === 'period') ? 4000 : 2500); 
            timerRef.current = setTimeout(() => {
                if (type === 'substitution') {
                    setOverlayEvent(null);
                }
                setEventQueue(prev => prev.slice(1));
                setIsProcessing(false);
                
                // Update replay progress
                if (isReplaying && actions.length > 0) {
                    const processed = Number(currentEvent.actionNumber);
                    const total = actions.length;
                    setReplayProgress((processed / total) * 100);
                    
                    // End replay when finished
                    if (eventQueue.length === 1) {
                        setTimeout(() => stopReplay(), 1000);
                    }
                }
            }, delay);
        }
    }, [eventQueue, isProcessing, players, isReplaying, isPaused, actions.length]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Detect which side Home starts on based on the first period data.
    // This handles cases where Home starts on the Left OR Right.
    // This MUST be before any conditional returns to follow Rules of Hooks
    const homeStartsLeft = React.useMemo(() => {
        // Find the first meaningful shot by the home team in Period 1
        const firstHomeShot = actions.find(a => 
            a.teamId === homeTeam.teamId && 
            Number(a.period) === 1 && 
            (a.actionType === '2pt' || a.actionType === '3pt') &&
            typeof a.x === 'number'
        );

        if (firstHomeShot) {
            return firstHomeShot.x < 50;
        }

        // Fallback: Check Away team shot in Period 1 (Should be opposite)
        const firstAwayShot = actions.find(a => 
            a.teamId === awayTeam.teamId && 
            Number(a.period) === 1 && 
            (a.actionType === '2pt' || a.actionType === '3pt') &&
            typeof a.x === 'number'
        );

        if (firstAwayShot) {
             return firstAwayShot.x > 50; // If Away is Right (>50), Home is Left.
        }

        // If no data yet, default to false (No flip is safer if we assume "What we see is what we get")
        // But traditionally Home often starts Left. Let's see.
        // w-full aspect-[94/50] bg-background rounded-lg flex items-center justify-center relative overflow-hidden
        // In the user's case, Home started Right. The Default Code flipped it to Left (Wrong).
        // So defaulting to FALSE (Assume Home=Right) means we do NOTHING to the coordinates initially.
        return false; 
    }, [actions, homeTeam.teamId, awayTeam.teamId]);

    if (gameStatus !== 2 && !isReplaying) {
        return (
            <div className="relative w-full aspect-[94/50] rounded-lg overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-10">
                    <SVGCourt
                        className="w-full h-full"
                        courtColor="#C4A574"
                        lineColor="#FFFFFF"
                        paintColor={getTeamColors(homeTeam.teamId).primary}
                        centerLogo={getTeamColors(homeTeam.teamId).logo}
                    />
                </div>
                <div className="text-center z-10">
                    <h3 className="text-2xl font-bold text-text mb-2">
                        {gameStatus === 1 ? 'Game Scheduled' : 'Game Final'}
                    </h3>
                    {gameStatus === 3 && actions.length > 0 && (
                        <button
                            onClick={startReplay}
                            className="bg-primary hover:shadow-2xl hover:text-text text-text/80 font-bold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg"
                        >   
                        Replay Game
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Helper to determine basket coordinates based on shot location
    // Orientation: We will standardize so Home shoots Right (94.65) and Away shoots Left (5.35).
    // API Data: x=0..100.
    // Based on Game 0022500735: Home (ATL) shots x=10 (Left). Away (UTA) shots x=88 (Right).
    // To achieve Home->Right, we must FLIP the actions horizontally (x = 100 - x).
    const getBasketCoordinates = (teamId: number) => {
        // Home -> Right (94.65), Away -> Left (5.35)
        const targetX = teamId === homeTeam.teamId ? 94.65 : 5.35;
        return mapCoordinates(targetX, 50);
    };

    // Helper to get event coordinates with special handling
    const getEventCoordinates = (action: PlayByPlayEvent) => {
        let x = action.x;
        let y = action.y;
        
        // --- 1. COORDINATE FLIPPING LOGIC ---
        // We want Home to ALWAYS shoot Right (High X) and Away to ALWAYS shoot Left (Low X).
        // The API returns the "actual" coordinate on the court.
        // We need to determine if the "actual" coordinate matches our desired display orientation.
        
        let shouldFlip = false;
        
        // If the action has a 'side' property (e.g. "left" or "right"), use it.
        // "side" usually generally refers to the side of the court from the perspective of... main camera? 
        // Let's assume:
        // side="left" means x is 0-50.
        // side="right" means x is 50-100.
        // If Home is shooting, we want them on Right.
        // So if Home shoots and side="left", we MUST FLIP.
        // If Away shoots and side="right", we MUST FLIP.
        
        if (action.side) {
             const side = action.side.toLowerCase();
             if (action.teamId === homeTeam.teamId && side === 'left') {
                 shouldFlip = true;
             } else if (action.teamId === awayTeam.teamId && side === 'right') {
                 shouldFlip = true;
             }
        } else {
            // Fallback to time-based logic if 'side' is missing (e.g. for some event types)
            // Default: Periods 1,2 -> Home starts ? (We detected homeStartsLeft earlier)
             let isHomeShootingLeftInRawData = false;
        
            if (action.period <= 2) {
                isHomeShootingLeftInRawData = homeStartsLeft;
            } else {
                isHomeShootingLeftInRawData = !homeStartsLeft;
                if (action.period > 4) {
                     const otPeriod = action.period - 4;
                     if (otPeriod % 2 !== 0) {
                         isHomeShootingLeftInRawData = homeStartsLeft;
                     } else {
                         isHomeShootingLeftInRawData = !homeStartsLeft;
                     }
                }
            }
            shouldFlip = isHomeShootingLeftInRawData;
        }

        if (typeof x === 'number' && shouldFlip) {
            x = 100 - x;
            // For a 180-degree rotation, both x and y need to be flipped within the 0-100 range
            // This ensures coordinates stay within bounds and maintain proper court perspective
            y = 100 - y; 
        }

        const type = action.actionType ? action.actionType.toLowerCase() : '';

        // Fix Free Throw placement (Catch all variants)
        if (type === 'freethrow') {
             // Reset Y for free throws (Center)
             y = 50; 
             
             if (action.teamId === homeTeam.teamId) {
                // Home shooting free throws at their offensive basket (Right)
                x = 77;
            } else {
                // Away shooting free throws at their offensive basket (Left)
                x = 23;
            }
        }

        // Default coordinates for events that might be missing them (0,0)
        // If x,y are 0,0 it's likely missing data.
        if (!x && !y) {
             x = 50; y = 50;
        }

        // Force Rebounds to be near the rim
        if (type === 'rebound') {
            // Determine if it's an offensive or defensive rebound
            // Based on Standardized Orientation (Home shoots Right):
            // Home Offense -> Right. Home Defense -> Left.
            // Away Offense -> Left. Away Defense -> Right.
            
            const isOffensive = action.subType?.toLowerCase() === 'offensive';
            
            if (action.teamId === homeTeam.teamId) {
                // Home Team
                if (isOffensive) x = 90.65; // Right Basket (Offensive)
                else x = 10.35; // Left Basket (Defensive)
            } else {
                // Away Team
                if (isOffensive) x = 10.35; // Left Basket (Offensive)
                else x = 90.65; // Right Basket (Defensive)
            }
            y = 50;
        }
        
        // Visual adjustment: Markers appear slightly low visually due to perspective or element stacking.
        // Nudging Y up slightly (subtracting from Y) corrects the vertical center alignment.
        if (y === 50) {
            y = 48; 
        }

        return mapCoordinates(x, y);
    };

    return (
        <div ref={courtContainerRef} className={`mt-2 relative w-full ${isFullscreen ? 'bg-background p-0 md:p-12 flex flex-col justify-center md:scale-100 h-screen overflow-hidden' : ''}`}>
            <div className="bg-background p-2 md:p-3 rounded-lg relative z-10">
                {/* Possession Indicator */}
                <div className="flex justify-between mb-2 px-4">
                    <div className={`flex items-center gap-2 transition-opacity duration-300 ${possessionTeamId === homeTeam.teamId ? 'opacity-100' : 'opacity-30'}`}>
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                        <span className="font-bold text-sm">{homeTeam.teamTricode}</span>
                        {possessionTeamId === homeTeam.teamId && (
                            <motion.div 
                                initial={{ x: -5, opacity: 0 }} 
                                animate={{ x: 0, opacity: 1 }} 
                                className="text-primary"
                            >
                                →
                            </motion.div>
                        )}
                    </div>
                    <div className={`flex items-center gap-2 transition-opacity duration-300 ${possessionTeamId === awayTeam.teamId ? 'opacity-100' : 'opacity-30'}`}>
                        {possessionTeamId === awayTeam.teamId && (
                            <motion.div 
                                initial={{ x: 5, opacity: 0 }} 
                                animate={{ x: 0, opacity: 1 }} 
                                className="text-secondary"
                            >
                                ←
                            </motion.div>
                        )}
                        <span className="font-bold text-sm">{awayTeam.teamTricode}</span>
                        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                    </div>
                </div>

                {/* Court Container Wrapper */}
                <div className="relative w-full">
                    {/* Defense Indicators - Outside Court */}
                    <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-text font-mono text-2xl md:text-4xl uppercase tracking-widest whitespace-nowrap pointer-events-none select-none hidden lg:block">
                        {homeTeam.teamTricode}
                    </div>
                    
                    <div className="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 text-text font-mono text-2xl md:text-4xl uppercase tracking-widest whitespace-nowrap pointer-events-none select-none hidden lg:block">
                        {awayTeam.teamTricode}
                    </div>

                    {/* Court Container */}
                    <div className={`relative w-full aspect-[94/50] rounded-lg overflow-hidden border-2 border-text/10`}>
                        <SVGCourt
                            className="absolute inset-0 w-full h-full"
                            courtColor="#C4A574"
                            lineColor="#FFFFFF"
                            paintColor={getTeamColors(homeTeam.teamId).primary}
                            centerLogo={getTeamColors(homeTeam.teamId).logo}
                        />

                    {/* Events */}
                    <AnimatePresence mode="wait">
                        {recentAction && (
                            <React.Fragment key={recentAction.actionNumber}>
                                {/* Shot Line Animation */}
                                {['2pt', '3pt', 'heave', 'freethrow'].includes(recentAction.actionType) && 
                                 !recentAction.subType?.toLowerCase().includes('dunk') && 
                                 !recentAction.subType?.toLowerCase().includes('layup') && (
                                    <svg 
                                        className="absolute inset-0 w-full h-full pointer-events-none z-10" 
                                        viewBox="0 0 94 50"
                                        preserveAspectRatio="none"
                                        style={{ overflow: 'visible' }}
                                    >
                                        <motion.path
                                            d={(() => {
                                                const start = getEventCoordinates(recentAction);
                                                const end = getBasketCoordinates(recentAction.teamId);
                                                // Convert from 0-100 percentage to viewBox coordinates (0-94 for x, 0-50 for y)
                                                // Original points
                                                const rawStartX = (start.x / 100) * 94;
                                                const rawStartY = (start.y / 100) * 50;
                                                const endX = (end.x / 100) * 94;
                                                const endY = (end.y / 100) * 50;

                                                // Start arc exactly at marker center (no gap)
                                                const startX = rawStartX;
                                                const startY = rawStartY;

                                                
                                                // Calculate control point for quadratic curve to create arc
                                                const midX = (startX + endX) / 2;
                                                const distance = Math.abs(endX - startX);
                                                const arcHeight = Math.max(8, Math.min(12, distance * 0.5));
                                                // Arc peak should be HIGHER than the midpoint visually (lower y value)
                                                // Use rawStartY for arc height calculation to keep the peak oriented correctly relative to the true distance
                                                const midY = (rawStartY + endY) / 2 - arcHeight;
                                                
                                                return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
                                            })()}
                                            stroke={recentAction.shotResult === 'Made' ? '#00ff00' : '#ff0000'} 
                                            strokeWidth="1" 
                                            fill="none"
                                            strokeDasharray="3 3" 
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            exit={{ opacity: 0, transition: { duration: 0.3 } }}
                                            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
                                        />
                                    </svg>
                                )}

                                {/* Event Marker & Popup */}
                                {!['substitution', 'timeout', 'period'].includes((recentAction.actionType || '').toLowerCase()) && 
                                 !recentAction.description.toLowerCase().includes('timeout') &&
                                 !recentAction.description.toLowerCase().includes('assist') && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                        style={{
                                            position: 'absolute',
                                            left: `${getEventCoordinates(recentAction).x}%`,
                                            top: `${getEventCoordinates(recentAction).y}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        className="z-20"
                                    >
                                        {/* Marker */}
                                        <div className={`w-2 h-2 md:w-4 md:h-4 rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                                            recentAction.shotResult === 'Made' ? 'bg-green-600 border-white' :
                                            recentAction.shotResult === 'Missed' ? 'bg-red-600 border-white' :
                                            'bg-secondary border-white'
                                        }`} />

                                        {/* Popup */}
                                        <div 
                                            className={`absolute whitespace-nowrap bg-background text-text text-[8px] md:text-xs px-2 py-1 md:px-3 md:py-2 rounded-md border border-white/40 shadow-xl flex flex-col gap-1
                                                ${getEventCoordinates(recentAction).y < 20 ? 'top-full mt-3' : 'bottom-full mb-3'}
                                                ${getEventCoordinates(recentAction).x < 20 ? 'left-0 translate-x-0 items-start' : 
                                                  getEventCoordinates(recentAction).x > 80 ? 'right-0 translate-x-0 items-end' : 
                                                  'left-1/2 -translate-x-1/2 items-center'}`}
                                        >
                                            <span className="font-bold">{recentAction.playerNameI} <span className="text-text font-normal">({recentAction.teamTricode})</span></span>
                                            <span className="text-[6px] md:text-xs opacity-80 uppercase tracking-wider">
                                                {(recentAction.actionType === 'foul') ? (
                                                    (recentAction.descriptor === 'shooting') ? (
                                                        <>SHOOTING FOUL{recentAction.qualifiers?.find(q => q.includes('freethrow')) ? ` (${recentAction.qualifiers.find(q => q.includes('freethrow'))?.replace('freethrow', 'FT')})` : ''}</>
                                                    ) : `${recentAction.subType || 'PERSONAL'} FOUL`
                                                ) : (
                                                    `${recentAction.subType?.replace('defensive', 'Defensive').replace('offensive', 'Offensive') || recentAction.actionType} ${(recentAction.actionType === 'rebound') ? 'Reb' : (recentAction.shotResult || '')}`
                                                )}
                                            </span>
                                            {/* Triangle pointer */}
                                            <div className={`absolute w-1.5 h-1.5 md:w-2 md:h-2 bg-background rotate-45 border-r border-b border-white/20
                                                ${getEventCoordinates(recentAction).y < 20 ? '-top-1 border-t border-l border-r-0 border-b-0' : '-bottom-1 border-r border-b'}
                                                ${getEventCoordinates(recentAction).x < 20 ? 'left-2' : 
                                                  getEventCoordinates(recentAction).x > 80 ? 'right-2' : 
                                                  'left-1/2 -translate-x-1/2'}`}
                                            ></div>
                                        </div>
                                    </motion.div>
                                )}
                            </React.Fragment>
                        )}
                    </AnimatePresence>

                    {/* Miniature Scoreboard */}
                    <div className="absolute mb-1 md:mb-2 bottom-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center w-auto shadow-2xl rounded-lg overflow-hidden border border-white/20 select-none scale-50 md:scale-100 origin-bottom">
                         <div className="bg-background flex items-center p-2 gap-4 rounded-lg border border-white/10 shadow-lg">
                              {/* Home Team */}
                              <div className="flex flex-col items-center relative gap-1 min-w-[60px]">
                                   <div className="relative">
                                       <img 
                                           src={`https://cdn.nba.com/logos/nba/${homeTeam.teamId}/primary/L/logo.svg`} 
                                           alt={homeTeam.teamTricode} 
                                           className="w-8 h-8 object-contain"
                                       />
                                       {homeTeam.inBonus && (
                                           <div className="absolute -top-1 -right-2 bg-primary text-text text-[6px] font-bold px-1 py-0.5 rounded-full shadow-sm border border-background leading-none">
                                               BONUS
                                           </div>
                                       )}
                                   </div>
                                   <div className="flex flex-col items-center">
                                       <span className={`text-sm font-bold leading-none ${currentScore.home > currentScore.away ? 'text-primary' : 'text-text'}`}>
                                           {homeTeam.teamTricode}
                                       </span>
                                       <div className="flex gap-0.5 mt-0.5">
                                           {[...Array(7)].map((_, i) => (
                                               <div key={i} className={`w-0.5 h-0.5 rounded-full ${i < homeTeam.timeoutsRemaining ? 'bg-primary' : 'bg-text/20'}`} />
                                           ))}
                                       </div>
                                   </div>
                              </div>
                              
                              {/* Center Info */}
                              <div className="flex flex-col items-center gap-2 min-w-[80px]">
                                  <div className="text-md font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap leading-none mb-0.5">
                                      {recentAction?.clock ? 
                                          recentAction.clock.replace('PT', '').replace('M', ':').replace('S', '').split('.')[0] 
                                          : '12:00'}
                                      <span className="opacity-60 ml-1">
                                         {recentAction ? (recentAction.period <= 4 ? `Q${recentAction.period}` : `OT${recentAction.period-4}`) : ((gameStatus === 3) ? 'FINAL' : (gameStatus === 1 ? 'PRE' : 'Q1'))}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className={`text-2xl font-mono leading-none ${currentScore.home > currentScore.away ? 'text-primary' : 'text-text'}`}>
                                          {currentScore.home}
                                      </span>
                                      <span className="text-text/20 text-sm">-</span>
                                      <span className={`text-2xl font-mono leading-none ${currentScore.away > currentScore.home ? 'text-secondary' : 'text-text'}`}>
                                          {currentScore.away}
                                      </span>
                                  </div>
                              </div>

                              {/* Away Team */}
                              <div className="flex flex-col items-center relative gap-1 min-w-[60px]">
                                   <div className="relative">
                                       <img 
                                           src={`https://cdn.nba.com/logos/nba/${awayTeam.teamId}/primary/L/logo.svg`} 
                                           alt={awayTeam.teamTricode} 
                                           className="w-8 h-8 object-contain"
                                       />
                                       {awayTeam.inBonus && (
                                           <div className="absolute -top-1 -right-2 bg-secondary text-text text-[6px] font-bold px-1 py-0.5 rounded-full shadow-sm border border-background leading-none">
                                               BONUS
                                           </div>
                                       )}
                                   </div>
                                    <div className="flex flex-col items-center">
                                       <span className={`text-sm font-bold leading-none ${currentScore.away > currentScore.home ? 'text-secondary' : 'text-text'}`}>
                                           {awayTeam.teamTricode}
                                       </span>
                                       <div className="flex gap-0.5 mt-0.5">
                                           {[...Array(7)].map((_, i) => (
                                               <div key={i} className={`w-0.5 h-0.5 rounded-full ${i < awayTeam.timeoutsRemaining ? 'bg-secondary' : 'bg-text/20'}`} />
                                           ))}
                                       </div>
                                   </div>
                              </div>

                              {/* Possession Indicator Border */}
                              {possessionTeamId && (
                                  <div 
                                    className={`absolute bottom-0 h-[2px] transition-all duration-300 ${possessionTeamId === homeTeam.teamId ? 'left-4 w-12 bg-primary' : 'right-4 w-12 bg-secondary'}`} 
                                  />
                              )}
                         </div>
                    </div>
                </div>

                {/* Timeout / Substitution / Period Overlay - Moved outside overflow-hidden container */}
                <AnimatePresence>
                    {overlayEvent && (
                        <motion.div
                            key={recentAction?.actionNumber ? `overlay-${recentAction.actionNumber}` : 'overlay'}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                        >
                            <div className="bg-background/95 backdrop-blur-md text-text px-16 py-12 rounded-xl shadow-2xl text-center max-w-2xl border border-text/10 pointer-events-auto">
                                <h3 className="text-4xl font-bold mb-2 uppercase text-primary font-display tracking-wider">{overlayEvent.title}</h3>
                                <p className="text-6xl font-semibold font-mono">{overlayEvent.description}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {!isReplaying && (
                <div className="flex justify-center mt-2">
                            <button
                                onClick={toggleFullscreen}
                                className="bg-primary hover:text-text text-text/80 font-bold py-1 px-3 md:py-2 md:px-4 rounded-lg transition-colors duration-200 text-xs md:text-base"
                            >
                                {isFullscreen ? (
                                    <>
                                        <Minimize className="w-4 h-4 md:w-5 md:h-5" />
                                    </>
                                ) : (
                                    <>
                                        <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                                    </>
                                )}
                            </button>
                        </div>
            )}

            {/* Replay Controls */}
            {isReplaying && (
                <div className="p-2 md:p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={togglePause}
                                className="bg-primary hover:text-text text-text/80 font-bold py-1 px-3 md:py-2 md:px-4 rounded-lg transition-colors duration-200 text-xs md:text-base flex items-center justify-center"
                            >
                                {isPaused ? <Play className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" /> : <Pause className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />}
                            </button>
                            <button
                                onClick={stopReplay}
                                className="bg-primary hover:text-text text-text/80 font-bold py-1 px-3 md:py-2 md:px-4 rounded-lg transition-colors duration-200 text-xs md:text-base"
                            >
                                <Square className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
                            </button>
                        </div>
                        <div className="flex justify-center mt-2">
                            <button
                                onClick={toggleFullscreen}
                                className="bg-primary hover:text-text text-text/80 font-bold py-1 px-3 md:py-2 md:px-4 rounded-lg transition-colors duration-200 text-xs md:text-base"
                            >
                                {isFullscreen ? (
                                    <>
                                        <Minimize className="w-4 h-4 md:w-5 md:h-5" />
                                    </>
                                ) : (
                                    <>
                                        <Maximize className="w-4 h-4 md:w-5 md:h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="w-full bg-text/10 rounded-full h-1.5 md:h-2 overflow-hidden">
                        <motion.div
                            className="bg-primary h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${replayProgress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <p className="text-text/60 text-center text-[8px] md:text-sm mt-1 md:mt-2">{Math.round(replayProgress)}% complete</p>
                </div>
            )}
            
            {/* Fullscreen Toggle Button */}
            

            </div>
        </div>
    );
};

export default VirtualCourt;

