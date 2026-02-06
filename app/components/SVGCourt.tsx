'use client';

import React from 'react';

interface SVGCourtProps {
    width?: string | number;
    height?: string | number;
    className?: string;
    courtColor?: string;       // Main court wood color
    lineColor?: string;        // Court lines color
    paintColor?: string;       // Paint area color (home team primary)
    centerLogo?: string;       // URL for center court logo
}

/**
 * NBA Court SVG Component
 * 
 * Accurate NBA court dimensions:
 * - Court: 94' × 50' (viewBox: 940 × 500, scale 10:1)
 * - Key/Paint: 16' wide × 19' deep
 * - Free throw line: 15' from backboard
 * - Free throw circle: 6' radius
 * - Three-point arc: 23'9" (23.75') from basket center
 * - Three-point corner: 22' from basket, 3' from sideline
 * - Restricted area: 4' radius
 * - Center circle: 6' radius
 * - Basket center: 5.25' from baseline (4' backboard + 15" offset)
 */
const SVGCourt: React.FC<SVGCourtProps> = ({
    width = '100%',
    height = 'auto',
    className = '',
    courtColor = '#C4A574',    // Light brown wood
    lineColor = '#FFFFFF',      // White lines
    paintColor = '#1D428A',     // Default blue paint
    centerLogo = '',
}) => {
    // Scale: 10 units = 1 foot
    const COURT_WIDTH = 940;   // 94 feet
    const COURT_HEIGHT = 500;  // 50 feet
    
    // Key dimensions (in SVG units, 10x feet)
    const BASKET_CENTER_X_LEFT = 52.5;      // 5.25 feet from baseline
    const BASKET_CENTER_X_RIGHT = 887.5;    // Mirrored
    const BASKET_CENTER_Y = 250;            // Center of court width
    
    const KEY_WIDTH = 160;                  // 16 feet
    const KEY_DEPTH = 190;                  // 19 feet from baseline
    const KEY_TOP = (COURT_HEIGHT - KEY_WIDTH) / 2;  // 170
    const KEY_BOTTOM = KEY_TOP + KEY_WIDTH;           // 330
    
    const FT_CIRCLE_RADIUS = 60;            // 6 feet radius
    const CENTER_CIRCLE_RADIUS = 60;        // 6 feet radius
    const RESTRICTED_RADIUS = 40;           // 4 feet radius
    
    const THREE_PT_ARC_RADIUS = 237.5;      // 23.75 feet
    const THREE_PT_CORNER_DIST = 30;        // 3 feet from sideline
    const THREE_PT_CORNER_X = 140;          // Where corner meets arc (~14 feet from baseline)
    
    const BACKBOARD_OFFSET = 40;            // 4 feet from baseline
    const RIM_RADIUS = 9;                   // 9 inches = 0.75 feet
    
    const LINE_WIDTH = 2;
    
    return (
        <svg
            viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
            width={width}
            height={height}
            className={className}
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Court Background */}
            <rect
                x="0"
                y="0"
                width={COURT_WIDTH}
                height={COURT_HEIGHT}
                fill={courtColor}
            />
            
            {/* === LEFT SIDE === */}
            
            {/* Left Paint Area */}
            <rect
                x="0"
                y={KEY_TOP}
                width={KEY_DEPTH}
                height={KEY_WIDTH}
                fill={paintColor}
                opacity="0.85"
            />
            
            {/* Left Key Outline */}
            <rect
                x="0"
                y={KEY_TOP}
                width={KEY_DEPTH}
                height={KEY_WIDTH}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* Left Free Throw Circle (top half - dashed, bottom half - solid) */}
            <path
                d={`M ${KEY_DEPTH} ${KEY_TOP} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 1 ${KEY_DEPTH} ${KEY_BOTTOM}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            <path
                d={`M ${KEY_DEPTH} ${KEY_TOP} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 0 ${KEY_DEPTH} ${KEY_BOTTOM}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
                strokeDasharray="10 10"
            />
            
            {/* Left Restricted Area */}
            <path
                d={`M ${BASKET_CENTER_X_LEFT - RESTRICTED_RADIUS} ${BASKET_CENTER_Y} 
                    A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 0 1 ${BASKET_CENTER_X_LEFT + RESTRICTED_RADIUS} ${BASKET_CENTER_Y}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
                transform={`rotate(90 ${BASKET_CENTER_X_LEFT} ${BASKET_CENTER_Y})`}
            />
            {/* Left Restricted Area Arc (semicircle facing right) */}
            <path
                d={`M ${BASKET_CENTER_X_LEFT} ${BASKET_CENTER_Y - RESTRICTED_RADIUS}
                    A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 1 1 ${BASKET_CENTER_X_LEFT} ${BASKET_CENTER_Y + RESTRICTED_RADIUS}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* Left Backboard */}
            <line
                x1={BACKBOARD_OFFSET}
                y1={BASKET_CENTER_Y - 30}
                x2={BACKBOARD_OFFSET}
                y2={BASKET_CENTER_Y + 30}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH + 2}
            />
            
            {/* Left Rim */}
            <circle
                cx={BASKET_CENTER_X_LEFT}
                cy={BASKET_CENTER_Y}
                r={RIM_RADIUS}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={LINE_WIDTH + 1}
            />
            
            {/* Left Three-Point Line */}
            {/* Corner lines */}
            <line
                x1="0"
                y1={THREE_PT_CORNER_DIST}
                x2={THREE_PT_CORNER_X}
                y2={THREE_PT_CORNER_DIST}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            <line
                x1="0"
                y1={COURT_HEIGHT - THREE_PT_CORNER_DIST}
                x2={THREE_PT_CORNER_X}
                y2={COURT_HEIGHT - THREE_PT_CORNER_DIST}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            {/* Arc */}
            <path
                d={`M ${THREE_PT_CORNER_X} ${THREE_PT_CORNER_DIST}
                    A ${THREE_PT_ARC_RADIUS} ${THREE_PT_ARC_RADIUS} 0 0 1 ${THREE_PT_CORNER_X} ${COURT_HEIGHT - THREE_PT_CORNER_DIST}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* === RIGHT SIDE (Mirrored) === */}
            
            {/* Right Paint Area */}
            <rect
                x={COURT_WIDTH - KEY_DEPTH}
                y={KEY_TOP}
                width={KEY_DEPTH}
                height={KEY_WIDTH}
                fill={paintColor}
                opacity="0.85"
            />
            
            {/* Right Key Outline */}
            <rect
                x={COURT_WIDTH - KEY_DEPTH}
                y={KEY_TOP}
                width={KEY_DEPTH}
                height={KEY_WIDTH}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* Right Free Throw Circle */}
            <path
                d={`M ${COURT_WIDTH - KEY_DEPTH} ${KEY_TOP} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 0 ${COURT_WIDTH - KEY_DEPTH} ${KEY_BOTTOM}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            <path
                d={`M ${COURT_WIDTH - KEY_DEPTH} ${KEY_TOP} A ${FT_CIRCLE_RADIUS} ${FT_CIRCLE_RADIUS} 0 0 1 ${COURT_WIDTH - KEY_DEPTH} ${KEY_BOTTOM}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
                strokeDasharray="10 10"
            />
            
            {/* Right Restricted Area Arc */}
            <path
                d={`M ${BASKET_CENTER_X_RIGHT} ${BASKET_CENTER_Y - RESTRICTED_RADIUS}
                    A ${RESTRICTED_RADIUS} ${RESTRICTED_RADIUS} 0 1 0 ${BASKET_CENTER_X_RIGHT} ${BASKET_CENTER_Y + RESTRICTED_RADIUS}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* Right Backboard */}
            <line
                x1={COURT_WIDTH - BACKBOARD_OFFSET}
                y1={BASKET_CENTER_Y - 30}
                x2={COURT_WIDTH - BACKBOARD_OFFSET}
                y2={BASKET_CENTER_Y + 30}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH + 2}
            />
            
            {/* Right Rim */}
            <circle
                cx={BASKET_CENTER_X_RIGHT}
                cy={BASKET_CENTER_Y}
                r={RIM_RADIUS}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={LINE_WIDTH + 1}
            />
            
            {/* Right Three-Point Line */}
            <line
                x1={COURT_WIDTH}
                y1={THREE_PT_CORNER_DIST}
                x2={COURT_WIDTH - THREE_PT_CORNER_X}
                y2={THREE_PT_CORNER_DIST}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            <line
                x1={COURT_WIDTH}
                y1={COURT_HEIGHT - THREE_PT_CORNER_DIST}
                x2={COURT_WIDTH - THREE_PT_CORNER_X}
                y2={COURT_HEIGHT - THREE_PT_CORNER_DIST}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            <path
                d={`M ${COURT_WIDTH - THREE_PT_CORNER_X} ${THREE_PT_CORNER_DIST}
                    A ${THREE_PT_ARC_RADIUS} ${THREE_PT_ARC_RADIUS} 0 0 0 ${COURT_WIDTH - THREE_PT_CORNER_X} ${COURT_HEIGHT - THREE_PT_CORNER_DIST}`}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            {/* === CENTER COURT === */}
            
            {/* Half Court Line */}
            <line
                x1={COURT_WIDTH / 2}
                y1="0"
                x2={COURT_WIDTH / 2}
                y2={COURT_HEIGHT}
                stroke={lineColor}
                strokeWidth={LINE_WIDTH}
            />
            
            
            {/* Center Court Logo */}
            {centerLogo && (
                <image
                    href={centerLogo}
                    x={COURT_WIDTH / 2 - 100}
                    y={COURT_HEIGHT / 2 - 100}
                    width="200"
                    height="200"
                    preserveAspectRatio="xMidYMid meet"
                />
            )}
            
            {/* === COURT BORDER === */}
            <rect
                x="0"
                y="0"
                width={COURT_WIDTH}
                height={COURT_HEIGHT}
                fill="none"
                stroke={lineColor}
                strokeWidth={LINE_WIDTH * 2}
            />
        </svg>
    );
};

export default SVGCourt;
