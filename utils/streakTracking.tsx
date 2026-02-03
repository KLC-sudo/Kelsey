// Study Streak Tracking System
import { useState, useEffect } from 'react';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: string;
    studyDates: string[]; // Array of ISO date strings
    totalDays: number;
}

const STREAK_STORAGE_KEY = 'studyStreak';

export function getStreakData(): StreakData {
    const stored = localStorage.getItem(STREAK_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }

    return {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: '',
        studyDates: [],
        totalDays: 0
    };
}

export function saveStreakData(data: StreakData): void {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
}

export function updateStreak(): StreakData {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const data = getStreakData();

    // If already studied today, don't update
    if (data.lastStudyDate === today) {
        return data;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if streak continues
    if (data.lastStudyDate === yesterdayStr) {
        // Streak continues
        data.currentStreak += 1;
    } else if (data.lastStudyDate === '') {
        // First day
        data.currentStreak = 1;
    } else {
        // Streak broken, start over
        data.currentStreak = 1;
    }

    // Update longest streak
    if (data.currentStreak > data.longestStreak) {
        data.longestStreak = data.currentStreak;
    }

    // Update dates
    data.lastStudyDate = today;
    if (!data.studyDates.includes(today)) {
        data.studyDates.push(today);
        data.totalDays = data.studyDates.length;
    }

    saveStreakData(data);
    return data;
}

export function useStudyStreak() {
    const [streak, setStreak] = useState<StreakData>(getStreakData());

    useEffect(() => {
        // Update streak when component mounts
        const updated = updateStreak();
        setStreak(updated);
    }, []);

    const recordStudySession = () => {
        const updated = updateStreak();
        setStreak(updated);
        return updated;
    };

    return {
        streak,
        recordStudySession
    };
}

// Streak Display Component
import React from 'react';

interface StreakDisplayProps {
    streak: StreakData;
    compact?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, compact = false }) => {
    if (compact) {
        return (
            <div className="flex items-center gap-2 bg-orange-600/20 border border-orange-500/50 rounded-lg px-3 py-2">
                <span className="text-2xl">🔥</span>
                <div>
                    <div className="text-sm font-bold text-orange-400">{streak.currentStreak} Day Streak</div>
                    <div className="text-xs text-orange-300/70">Keep it going!</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-500/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Study Streak</h3>
                <span className="text-4xl">🔥</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-3xl font-bold text-orange-400">{streak.currentStreak}</div>
                    <div className="text-xs text-gray-400 uppercase">Current</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-orange-300">{streak.longestStreak}</div>
                    <div className="text-xs text-gray-400 uppercase">Longest</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-orange-200">{streak.totalDays}</div>
                    <div className="text-xs text-gray-400 uppercase">Total Days</div>
                </div>
            </div>

            {streak.currentStreak > 0 && (
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <p className="text-sm text-orange-300">
                        {streak.currentStreak >= 7 ? '🎉 Amazing! ' : ''}
                        {streak.currentStreak >= 30 ? '🏆 Incredible dedication! ' : ''}
                        Don't break the chain!
                    </p>
                </div>
            )}

            {streak.currentStreak === 0 && (
                <div className="bg-black/30 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-400">
                        Start your streak today! Study every day to build momentum.
                    </p>
                </div>
            )}
        </div>
    );
};

// Streak Milestone Celebration
export const StreakMilestone: React.FC<{ streak: number; onClose: () => void }> = ({ streak, onClose }) => {
    const getMilestoneMessage = (days: number) => {
        if (days === 1) return { emoji: '🎯', title: 'First Day!', message: 'Great start! Come back tomorrow to build your streak.' };
        if (days === 3) return { emoji: '🔥', title: '3-Day Streak!', message: 'You\'re on fire! Keep the momentum going.' };
        if (days === 7) return { emoji: '⭐', title: 'One Week!', message: 'Amazing! You\'ve studied for a whole week straight.' };
        if (days === 14) return { emoji: '💪', title: 'Two Weeks!', message: 'Incredible dedication! You\'re building a strong habit.' };
        if (days === 30) return { emoji: '🏆', title: 'One Month!', message: 'Outstanding! You\'ve made language learning a daily habit.' };
        if (days === 100) return { emoji: '👑', title: '100 Days!', message: 'Legendary! You\'re a language learning champion!' };
        return null;
    };

    const milestone = getMilestoneMessage(streak);

    if (!milestone) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-orange-900 to-red-900 rounded-2xl p-8 max-w-md w-full border-2 border-orange-500 shadow-2xl text-center">
                <div className="text-8xl mb-4 animate-bounce">{milestone.emoji}</div>
                <h2 className="text-4xl font-bold text-white mb-2">{milestone.title}</h2>
                <p className="text-orange-200 text-lg mb-6">{milestone.message}</p>
                <div className="bg-black/30 rounded-lg p-4 mb-6">
                    <div className="text-6xl font-bold text-orange-400">{streak}</div>
                    <div className="text-sm text-orange-300 uppercase tracking-wide">Day Streak</div>
                </div>
                <button
                    onClick={onClose}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                    Keep Going! 🚀
                </button>
            </div>
        </div>
    );
};
