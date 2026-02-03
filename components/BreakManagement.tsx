// Break Management System
import React, { useState, useEffect } from 'react';

interface BreakReminderProps {
    studyDuration: number; // in seconds
    onTakeBreak: () => void;
    onSkipBreak: () => void;
    onClose: () => void;
}

export const BreakReminder: React.FC<BreakReminderProps> = ({
    studyDuration,
    onTakeBreak,
    onSkipBreak,
    onClose
}) => {
    const minutes = Math.floor(studyDuration / 60);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-8 max-w-md w-full border-2 border-blue-500/50 shadow-2xl">
                {/* Icon */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4 animate-bounce">☕</div>
                    <h2 className="text-3xl font-bold text-white mb-2">Time for a Break!</h2>
                    <p className="text-blue-200">
                        You've been studying for {minutes} minutes
                    </p>
                </div>

                {/* Benefits */}
                <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <p className="text-sm text-white/90 mb-2">
                        <strong>Why take breaks?</strong>
                    </p>
                    <ul className="text-xs text-white/80 space-y-1">
                        <li>• Improves memory retention</li>
                        <li>• Prevents mental fatigue</li>
                        <li>• Boosts focus and productivity</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={onTakeBreak}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Take a 5-Minute Break
                    </button>
                    <button
                        onClick={onSkipBreak}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        Continue Studying
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        Remind me later
                    </button>
                </div>
            </div>
        </div>
    );
};

// Break Timer Component
export const BreakTimer: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onComplete();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [onComplete]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 text-center">
                <div className="text-6xl mb-6">🧘</div>
                <h2 className="text-2xl font-bold text-white mb-4">Break Time</h2>
                <div className="text-7xl font-bold text-blue-400 mb-6 font-mono">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <p className="text-gray-400 mb-6">
                    Stretch, hydrate, rest your eyes
                </p>
                <button
                    onClick={onComplete}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                    End Break Early
                </button>
            </div>
        </div>
    );
};

// Hook for break management
export function useBreakManagement(breakIntervalMinutes: number = 25) {
    const [studyTime, setStudyTime] = useState(0);
    const [showBreakReminder, setShowBreakReminder] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [totalBreakTime, setTotalBreakTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isOnBreak) {
                setStudyTime(prev => {
                    const newTime = prev + 1;
                    // Show break reminder every breakIntervalMinutes
                    if (newTime > 0 && newTime % (breakIntervalMinutes * 60) === 0) {
                        setShowBreakReminder(true);
                    }
                    return newTime;
                });
            } else {
                setTotalBreakTime(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isOnBreak, breakIntervalMinutes]);

    const takeBreak = () => {
        setShowBreakReminder(false);
        setIsOnBreak(true);
    };

    const skipBreak = () => {
        setShowBreakReminder(false);
    };

    const endBreak = () => {
        setIsOnBreak(false);
    };

    return {
        studyTime,
        totalBreakTime,
        showBreakReminder,
        isOnBreak,
        takeBreak,
        skipBreak,
        endBreak,
        closeReminder: () => setShowBreakReminder(false)
    };
}
