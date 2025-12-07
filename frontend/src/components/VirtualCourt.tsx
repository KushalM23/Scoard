import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlayByPlayEvent, Team, Player } from '../types';
import courtImage from '../assets/bball court.png';

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

    // Queue System State
    const [eventQueue, setEventQueue] = useState<PlayByPlayEvent[]>([]);
    const lastProcessedIdRef = useRef<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFirstLoad = useRef(true);

    // Court margins (percentage) to map 0-100 coordinates to the image's court area
    const COURT_MARGIN_X = 5; // 5% margin on left/right
    const COURT_MARGIN_Y = 5; // 5% margin on top/bottom

    const mapCoordinates = (x: number, y: number) => {
        // Map 0-100 to margin -> 100-margin
        const mappedX = COURT_MARGIN_X + (x * (100 - 2 * COURT_MARGIN_X) / 100);
        const mappedY = COURT_MARGIN_Y + (y * (100 - 2 * COURT_MARGIN_Y) / 100);
        return { x: mappedX, y: mappedY };
    };

    // 1. Ingest new actions into queue
    useEffect(() => {
        if (actions.length > 0) {
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
                const desc = latest.description ? latest.description.toLowerCase() : '';
                
                if (type === 'timeout' || desc.includes('timeout')) {
                     setOverlayEvent({ title: 'TIMEOUT', description: latest.description });
                     // Auto-hide after 4 seconds
                     setTimeout(() => setOverlayEvent(null), 4000);
                } else if (type === 'period' || desc.includes('end of') || desc.includes('start of')) {
                     const isEnd = desc.includes('end');
                     const isStart = desc.includes('start');
                     const periodName = latest.period <= 4 ? `Q${latest.period}` : `OT${latest.period - 4}`;
                     
                     let title = 'PERIOD UPDATE';
                     if (isEnd) title = `END OF ${periodName}`;
                     else if (isStart) title = `START OF ${periodName}`;

                     setOverlayEvent({ title, description: latest.description });
                     setTimeout(() => setOverlayEvent(null), 4000);
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
    }, [actions]);

    // 2. Process queue sequentially
    useEffect(() => {
        if (eventQueue.length > 0 && !isProcessing) {
            setIsProcessing(true);
            const currentEvent = eventQueue[0];
            setRecentAction(currentEvent);

            // --- Side Notification Logic ---
            // 1. Identify the primary actor (usually personId)
            let notificationPlayer = players.find(p => p.personId === currentEvent.personId);
            let message = currentEvent.playerNameI;
            let subMessage = '';
            let showNotification = false;
            let notificationPersonId = currentEvent.personId;
            let notificationTeamId = currentEvent.teamId;

            const type = currentEvent.actionType ? currentEvent.actionType.toLowerCase() : '';
            const desc = currentEvent.description ? currentEvent.description.toLowerCase() : '';
            const isMade = currentEvent.shotResult === 'Made' || desc.includes('made') || desc.includes('makes');

            // 2. Check for Secondary Actors (Assist, Block, Steal) in description
            // If the description mentions another player, they might be the one getting the stat
            if (desc.includes('assist') || desc.includes('block') || desc.includes('steal')) {
                const otherPlayers = players.filter(p => p.personId !== currentEvent.personId);
                const secondaryActor = otherPlayers.find(p => desc.includes(p.lastName.toLowerCase()));
                
                if (secondaryActor) {
                    if (desc.includes('assist')) {
                        notificationPlayer = secondaryActor;
                        message = `${secondaryActor.firstName.charAt(0)}. ${secondaryActor.lastName}`;
                        subMessage = `${secondaryActor.assists} AST`;
                        notificationPersonId = secondaryActor.personId;
                        notificationTeamId = secondaryActor.teamId;
                        showNotification = true;
                    } else if (desc.includes('block')) {
                        notificationPlayer = secondaryActor;
                        message = `${secondaryActor.firstName.charAt(0)}. ${secondaryActor.lastName}`;
                        subMessage = `${secondaryActor.blocks} BLK`;
                        notificationPersonId = secondaryActor.personId;
                        notificationTeamId = secondaryActor.teamId;
                        showNotification = true;
                    } else if (desc.includes('steal')) {
                        notificationPlayer = secondaryActor;
                        message = `${secondaryActor.firstName.charAt(0)}. ${secondaryActor.lastName}`;
                        subMessage = `${secondaryActor.steals} STL`;
                        notificationPersonId = secondaryActor.personId;
                        notificationTeamId = secondaryActor.teamId;
                        showNotification = true;
                    }
                }
            }

            // 3. If no secondary notification triggered, check primary actor stats
            if (!showNotification && notificationPlayer) {
                // Points
                if ((type === 'shot' || type.includes('free') || type.includes('throw') || desc.includes('shot') || desc.includes('layup') || desc.includes('dunk')) && isMade) {
                    let points = 2;
                    if (desc.includes('3pt') || currentEvent.subType?.includes('3PT')) points = 3;
                    else if (type.includes('free') || type.includes('throw')) points = 1;
                    
                    // Update local player stats for display
                    // Note: This is a visual estimation based on the event, as the full player object might not be updated yet
                    const updatedPoints = (notificationPlayer.points || 0) + points;
                    
                    subMessage = `${updatedPoints} PTS (+${points})`;
                    showNotification = true;
                } 
                // Rebounds
                else if (type === 'rebound' || desc.includes('rebound')) {
                    const updatedRebs = (notificationPlayer.rebounds || 0) + 1;
                    subMessage = `${updatedRebs} REB (+1)`;
                    showNotification = true;
                } 
                // Fouls
                else if (type === 'foul' || desc.includes('foul')) {
                    const updatedFouls = (notificationPlayer.fouls || 0) + 1;
                    subMessage = `${updatedFouls} PF (+1)`; 
                    showNotification = true;
                }
                // Turnovers (only if not a steal by someone else, which we checked above)
                else if (type === 'turnover' || desc.includes('turnover')) {
                     const updatedTO = (notificationPlayer.turnovers || 0) + 1;
                     subMessage = `${updatedTO} TO (+1)`;
                     showNotification = true;
                }
            }

            if (showNotification) {
                setSideNotification({
                    teamId: notificationTeamId,
                    message: message,
                    subMessage: subMessage,
                    personId: notificationPersonId
                });
                // Hide notification slightly before the next event
                setTimeout(() => setSideNotification(null), 3000);
            }

            // --- Overlay Logic (Timeouts, Subs, Quarter End) ---
            const actionType = currentEvent.actionType ? currentEvent.actionType.toLowerCase() : '';
            const description = currentEvent.description ? currentEvent.description : '';
            const descLower = description.toLowerCase();

            if (actionType === 'timeout' || descLower.includes('timeout')) {
                setOverlayEvent({ title: 'TIMEOUT', description: description });
            } else if (actionType === 'substitution') {
                // Try to find the pair in recent events (or just use description)
                let displayDesc = description;
                if (displayDesc.includes('enters')) {
                     displayDesc = `IN: ${currentEvent.playerNameI}`;
                } else if (displayDesc.includes('leaves')) {
                     displayDesc = `OUT: ${currentEvent.playerNameI}`;
                }
                setOverlayEvent({ title: 'SUBSTITUTION', description: displayDesc });
            } else if (actionType === 'period' || descLower.includes('end of') || descLower.includes('start of')) {
                 const isEnd = descLower.includes('end');
                 const isStart = descLower.includes('start');
                 const periodName = currentEvent.period <= 4 ? `Q${currentEvent.period}` : `OT${currentEvent.period - 4}`;
                 
                 let title = 'PERIOD UPDATE';
                 if (isEnd) title = `END OF ${periodName}`;
                 else if (isStart) title = `START OF ${periodName}`;

                 setOverlayEvent({ title, description: description });
            } else {
                setOverlayEvent(null);
            }

            // Remove from queue after delay
            // Increase delay for readability
            const delay = (actionType === 'timeout' || actionType === 'period') ? 4000 : 2500; 
            timerRef.current = setTimeout(() => {
                setOverlayEvent(null); // Clear overlay when event finishes
                setEventQueue(prev => prev.slice(1));
                setIsProcessing(false);
            }, delay);
        }
    }, [eventQueue, isProcessing, players]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (gameStatus !== 2) {
        return (
            <div className="w-full aspect-[2/1] bg-background rounded-lg flex items-center justify-center border-4 border-text/10 relative overflow-hidden">
                <img src={courtImage} alt="Basketball Court" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                <div className="text-center z-10">
                    <h3 className="text-2xl font-bold text-text mb-2">
                        {gameStatus === 1 ? 'Game Scheduled' : 'Game Final'}
                    </h3>
                    <p className="text-text/60">Virtual Court is only available during live games.</p>
                </div>
            </div>
        );
    }

    // Helper to determine basket coordinates based on shot location
    // Fixed orientation: Home (Left) shoots Right (94.65), Away (Right) shoots Left (5.35)
    const getBasketCoordinates = (teamId: number) => {
        const targetX = teamId === homeTeam.teamId ? 94.65 : 5.35;
        return mapCoordinates(targetX, 50);
    };

    // Helper to get event coordinates with special handling
    const getEventCoordinates = (action: PlayByPlayEvent) => {
        let x = action.x;
        let y = action.y;
        const type = action.actionType ? action.actionType.toLowerCase() : '';

        // Fix Free Throw placement (Catch all variants)
        if (type.includes('free') || type.includes('throw')) {
             if (action.teamId === homeTeam.teamId) {
                x = 75;
            } else {
                x = 25;
            }
            y = 50; // Center vertically
            return mapCoordinates(x, y);
        }

        // Default coordinates for events that might be missing them (0,0)
        // If x,y are 0,0 it's likely missing data unless it's a corner 3.
        // But corner 3s usually have specific non-zero (but small) coordinates like 3, 3.
        // Let's assume 0,0 is ALWAYS bad data for our purpose and center it.
        if (!x && !y) {
             x = 50; y = 50;
        }

        // Force Rebounds to be near the rim
        if (type === 'rebound') {
            // Determine if it's an offensive or defensive rebound
            // Home Team Basket (Offense) is Right (94.65). Home Team Defense is Left (5.35).
            // Away Team Basket (Offense) is Left (5.35). Away Team Defense is Right (94.65).
            
            // Default to defensive rebound logic if not specified
            // If x < 50, it's Left Rim. If x > 50, it's Right Rim.
            
            // If we can determine it's offensive, we place it at the team's offensive basket
            const isOffensive = action.description?.toLowerCase().includes('offensive') || action.subType?.toLowerCase().includes('offensive');
            
            if (action.teamId === homeTeam.teamId) {
                // Home Team
                if (isOffensive) x = 94.65; // Right Rim
                else x = 5.35; // Left Rim (Defensive)
            } else {
                // Away Team
                if (isOffensive) x = 5.35; // Left Rim
                else x = 94.65; // Right Rim (Defensive)
            }
            y = 50;
        }

        return mapCoordinates(x, y);
    };

    return (
        <div className="relative w-full">
            {/* Side Notifications - Moved OUTSIDE the court container */}
            <AnimatePresence>
                {sideNotification && (
                    <motion.div
                        initial={{ opacity: 0, x: sideNotification.teamId === homeTeam.teamId ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: sideNotification.teamId === homeTeam.teamId ? -20 : 20 }}
                        className={`absolute bottom-16 scale-90 ${sideNotification.teamId === homeTeam.teamId ? '-left-4 md:-left-12' : '-right-4 md:-right-12'} z-30 flex flex-col items-center gap-2 pointer-events-none`}
                    >
                        <div className={`bg-background/90 backdrop-blur-md p-3 rounded-lg border border-text/20 shadow-lg min-w-[120px] flex items-center gap-3 ${sideNotification.teamId === homeTeam.teamId ? 'flex-row' : 'flex-row-reverse'}`}>
                            {/* Player Image */}
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-text/10 bg-text/5 shrink-0">
                                <img 
                                    src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${sideNotification.personId}.png`} 
                                    alt="Player"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=NBA'; }}
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-text font-bold text-sm whitespace-nowrap">{sideNotification.message}</p>
                                <p className="text-primary font-bold text-lg whitespace-nowrap">{sideNotification.subMessage}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-background p-2 md:p-3 rounded-lg relative z-10">
                {/* Possession Indicator */}
                <div className="flex justify-between mb-2 px-4">
                    <div className={`flex items-center gap-2 transition-opacity duration-300 ${possessionTeamId === homeTeam.teamId ? 'opacity-100' : 'opacity-30'}`}>
                        <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                        <span className="font-bold text-sm">{homeTeam.teamTricode} Possession</span>
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
                        <span className="font-bold text-sm">{awayTeam.teamTricode} Possession</span>
                        <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                    </div>
                </div>

                {/* Court Container Wrapper */}
                <div className="relative w-full">
                    {/* Defense Indicators - Outside Court */}
                    <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-text font-mono text-2xl md:text-4xl uppercase tracking-widest whitespace-nowrap pointer-events-none select-none hidden md:block">
                        {homeTeam.teamTricode}
                    </div>
                    
                    <div className="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 text-text font-mono text-2xl md:text-4xl uppercase tracking-widest whitespace-nowrap pointer-events-none select-none hidden md:block">
                        {awayTeam.teamTricode}
                    </div>

                    {/* Court Container */}
                    <div className="relative w-full aspect-[2/1] bg-black rounded-lg overflow-hidden border-2 border-text/10">
                        <img src={courtImage} alt="Basketball Court" className="absolute inset-0 w-full h-full object-cover" />

                    {/* Events */}
                    <AnimatePresence mode="wait">
                        {recentAction && (
                            <React.Fragment key={recentAction.actionNumber}>
                                {/* Shot Line Animation */}
                                {recentAction.actionType === 'shot' && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                        <motion.line
                                            x1={`${mapCoordinates(recentAction.x, recentAction.y).x}%`}
                                            y1={`${mapCoordinates(recentAction.x, recentAction.y).y}%`}
                                            x2={`${getBasketCoordinates(recentAction.teamId).x}%`}
                                            y2={`${getBasketCoordinates(recentAction.teamId).y}%`}
                                            stroke={recentAction.shotResult === 'Made' ? '#00ff00' : '#ff0000'} 
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                            initial={{ pathLength: 0, opacity: 0.8 }}
                                            animate={{ pathLength: 1, opacity: 0 }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
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
                                        <div className={`w-4 h-4 rounded-full border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                                            recentAction.shotResult === 'Made' ? 'bg-green-500 border-white' :
                                            recentAction.shotResult === 'Missed' ? 'bg-red-500 border-white' :
                                            'bg-blue-500 border-white'
                                        }`} />

                                        {/* Popup */}
                                        <div 
                                            className={`absolute whitespace-nowrap bg-black/80 backdrop-blur text-white text-xs px-3 py-2 rounded-md border border-white/20 shadow-xl flex flex-col gap-1
                                                ${getEventCoordinates(recentAction).y < 20 ? 'top-full mt-3' : 'bottom-full mb-3'}
                                                ${getEventCoordinates(recentAction).x < 20 ? 'left-0 translate-x-0 items-start' : 
                                                  getEventCoordinates(recentAction).x > 80 ? 'right-0 translate-x-0 items-end' : 
                                                  'left-1/2 -translate-x-1/2 items-center'}`}
                                        >
                                            <span className="font-bold">{recentAction.playerNameI}</span>
                                            <span className="text-[10px] opacity-80 uppercase tracking-wider">
                                                {recentAction.subType || recentAction.actionType} {recentAction.shotResult}
                                            </span>
                                            {/* Triangle pointer */}
                                            <div className={`absolute w-2 h-2 bg-black/80 rotate-45 border-r border-b border-white/20
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
                            <div className="bg-background/95 backdrop-blur-md text-text p-6 rounded-xl shadow-2xl text-center max-w-md border border-text/10 pointer-events-auto">
                                <h3 className="text-2xl font-bold mb-2 uppercase text-primary font-display tracking-wider">{overlayEvent.title}</h3>
                                <p className="text-lg font-semibold font-mono">{overlayEvent.description}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>
        </div>
    );
};

export default VirtualCourt;
