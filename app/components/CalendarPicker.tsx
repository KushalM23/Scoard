'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalendarPickerProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ selectedDate, onDateSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(selectedDate);
    const containerRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset view month when selected date changes externally
    useEffect(() => {
        setViewMonth(selectedDate);
    }, [selectedDate]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current && 
                !containerRef.current.contains(event.target as Node) &&
                (!modalRef.current || !modalRef.current.contains(event.target as Node))
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Generate calendar days including padding for complete weeks
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const handleDateClick = (date: Date) => {
        onDateSelect(date);
        setIsOpen(false);
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div ref={containerRef} className="relative">
            {/* Calendar Toggle Button */}
            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 lg:p-6 rounded-xl transition-colors ${
                    isOpen ? 'bg-accent text-text' : ' text-text/60 hover:text-text'
                }`}
            >
                <Calendar className="w-8 h-8 lg:w-8 lg:h-8" />
            </motion.button>

            {/* Calendar Dropdown */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={modalRef}
                            initial={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                            exit={{ opacity: 0, y: 20, scale: 0.95, x: "-50%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-28 lg:bottom-40 left-1/2 bg-background border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/50 z-[9999] w-[340px] md:w-[400px]"
                        >
                        {/* Month Header */}
                        <div className="flex items-center justify-between mb-4">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
                            >
                                <ChevronLeft className="w-5 h-5 text-text/60 group-hover:text-text" />
                            </motion.button>

                            <motion.h3 
                                key={format(viewMonth, 'yyyy-MM')}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl font-bold text-text font-display tracking-wide"
                            >
                                {format(viewMonth, 'MMMM yyyy')}
                            </motion.h3>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                                className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
                            >
                                <ChevronRight className="w-5 h-5 text-text/60 group-hover:text-text" />
                            </motion.button>
                        </div>

                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map((day) => (
                                <div
                                    key={day}
                                    className="text-center text-md font-mono text-text/40 uppercase tracking-wider py-1"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <motion.div 
                            key={format(viewMonth, 'yyyy-MM')}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-7 gap-1"
                        >
                            {calendarDays.map((date, index) => {
                                const isSelected = isSameDay(date, selectedDate);
                                const isCurrentMonth = isSameMonth(date, viewMonth);
                                const isToday = isSameDay(date, new Date());

                                return (
                                    <motion.button
                                        key={date.toISOString()}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ 
                                            opacity: isCurrentMonth ? 1 : 0.3, 
                                            scale: 1 
                                        }}
                                        transition={{ delay: index * 0.005 }}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleDateClick(date)}
                                        className={`
                                            w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-sans text-sm font-bold
                                            transition-colors duration-200 relative
                                            ${isSelected
                                                ? 'bg-accent text-text shadow-lg shadow-accent/30'
                                                : isCurrentMonth
                                                    ? 'hover:bg-white/10 text-text/80 hover:text-text'
                                                    : 'text-text/20 hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        {format(date, 'd')}
                                        {isToday && !isSelected && (
                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        {/* Today Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                const today = new Date();
                                setViewMonth(today);
                                onDateSelect(today);
                                setIsOpen(false);
                            }}
                            className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text/60 hover:text-text font-mono text-xl uppercase tracking-wider transition-colors"
                        >
                            Today
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
            )}
        </div>
    );
};

export default CalendarPicker;
