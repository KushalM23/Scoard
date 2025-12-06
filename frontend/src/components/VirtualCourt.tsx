import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Action {
    actionNumber: number;
    x: number;
    y: number;
    description: string;
    shotResult?: string;
    actionType: string;
    playerNameI: string;
}

interface VirtualCourtProps {
    actions: Action[];
}

const VirtualCourt: React.FC<VirtualCourtProps> = ({ actions }) => {
    // Filter for recent shots to animate
    const recentActions = actions.slice(-5); // Show last 5 events

    return (
        <div className="relative w-full aspect-[2/1] bg-[#d2a679] border-4 border-[#2F2F2F] rounded-lg overflow-hidden">
            {/* Court Lines (Simplified SVG) */}
            <svg viewBox="0 0 100 50" className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Half Court Line */}
                <line x1="50" y1="0" x2="50" y2="50" stroke="white" strokeWidth="0.5" />
                <circle cx="50" cy="25" r="6" stroke="white" strokeWidth="0.5" fill="none" />

                {/* Left Hoop Area */}
                <path d="M 0 17 L 19 17 L 19 33 L 0 33" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="5.25" cy="25" r="1.5" stroke="white" strokeWidth="0.5" fill="none" />

                {/* Right Hoop Area */}
                <path d="M 100 17 L 81 17 L 81 33 L 100 33" stroke="white" strokeWidth="0.5" fill="none" />
                <circle cx="94.75" cy="25" r="1.5" stroke="white" strokeWidth="0.5" fill="none" />

                {/* 3-Point Lines (Approximation) */}
                <path d="M 0 3 L 14 3 C 28 3 28 47 14 47 L 0 47" stroke="white" strokeWidth="0.5" fill="none" />
                <path d="M 100 3 L 86 3 C 72 3 72 47 86 47 L 100 47" stroke="white" strokeWidth="0.5" fill="none" />
            </svg>

            {/* Events */}
            <AnimatePresence>
                {recentActions.map((action) => (
                    <motion.div
                        key={action.actionNumber}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            left: `${action.x}%`,
                            top: `${action.y}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                        className="z-10"
                    >
                        {/* Shot Marker */}
                        <div className={`w-3 h-3 rounded-full border-2 ${action.shotResult === 'Made' ? 'bg-green-500 border-white' :
                            action.shotResult === 'Missed' ? 'bg-red-500 border-white' : 'bg-blue-500 border-white'
                            }`} />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none">
                            {action.description}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default VirtualCourt;
