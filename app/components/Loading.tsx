import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import SportsBasketballIcon from './Bball';

interface LoadingProps {
    size?: number;
    className?: string;
    text?: string;
    showText?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ size = 48, className, text = "LOADING...", showText = true }) => {
    return (
        <div className={twMerge("flex flex-col items-center justify-center p-8 gap-4 text-text/60", className)}>
            <motion.div
                animate={{ y: [0, -30] }}
                transition={{ 
                    duration: 0.5, 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    ease: "easeOut" 
                }}
            >
                <SportsBasketballIcon size={size} color="currentColor" />
            </motion.div>
            {showText && <p className="font-mono text-sm animate-pulse tracking-widest">{text}</p>}
        </div>
    );
};

export default Loading;
