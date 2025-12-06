import React, { useState } from 'react';
import { User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
    const [isSportOpen, setIsSportOpen] = useState(false);

    return (
        <header className="sticky top-1 z-50 px-6 py-4 bg-transparent backdrop-blur-md">
            <div className="max-w-7xl mx-auto grid grid-cols-3 items-center">
                {/* Left: User Profile */}
                <div className="flex justify-start">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <User className="w-5 h-5 text-text/80" />
                    </motion.button>
                </div>

                {/* Center: App Name */}
                <div className="flex justify-center">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="text-5xl font-mono tracking-wider text-primary drop-shadow-sm cursor-default"
                    >
                        SCOARD
                    </motion.h1>
                </div>

                {/* Right: Sport Selector */}
                <div className="flex justify-end relative">
                    <motion.button
                        onClick={() => setIsSportOpen(!isSportOpen)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-accent/50 group"
                    >
                        <span className="font-medium font-display group-hover:text-accent transition-colors">NBA</span>
                        <motion.div
                            animate={{ rotate: isSportOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-text/60" />
                        </motion.div>
                    </motion.button>

                    <AnimatePresence>
                        {isSportOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="absolute top-full right-0 mt-3 w-56 bg-background border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden ring-1 ring-white/5"
                            >
                                <div className="px-4 py-2 text-xs font-sans text-text/50 uppercase tracking-widest">Select League</div>

                                <motion.button
                                    whileHover={{color: "rgba(255, 255, 255, 0.05)" }}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors bg-white/5 border-l-2 border-accent"
                                >
                                    <span className="font-bold font-display text-text">NBA</span>
                                    <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>
                                </motion.button>

                                <motion.button
                                    whileHover={{color: "rgba(255, 255, 255, 0.05)" }}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-white/20"
                                >
                                    <span className="font-medium font-display text-text/70 group-hover:text-text transition-colors">IPL</span>
                                    <span className="text-[10px] font-bold bg-secondary/10 px-2 py-0.5 rounded text-secondary">SOON</span>
                                </motion.button>

                                <motion.button
                                    whileHover={{color: "rgba(255, 255, 255, 0.05)" }}
                                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-white/20"
                                >
                                    <span className="font-medium font-display text-text/70 group-hover:text-text transition-colors">F1</span>
                                    <span className="text-[10px] font-bold bg-secondary/10 px-2 py-0.5 rounded text-secondary">SOON</span>
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
};

export default Header;
