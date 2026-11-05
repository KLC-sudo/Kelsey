import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserAccount } from '../types/account';
import { fetchSRSStats } from '../utils/srsClient';
import { StreakDisplay, getStreakData, type StreakData } from '../utils/streakTracking';

export type AppMode = 'free' | 'class' | 'human-tutor';

const ROLE_BADGES: Record<string, { icon: string; label: string; color: string }> = {
    student: { icon: '🎓', label: 'Student', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    teacher: { icon: '👨‍🏫', label: 'Teacher', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    school: { icon: '🏫', label: 'School', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

interface ModeSelectorProps {
    account: UserAccount | null;
    onModeSelect: (mode: AppMode) => void;
    onReviewHistory: () => void;
    onSignOut: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ account, onModeSelect, onReviewHistory, onSignOut }) => {
    const navigate = useNavigate();
    const [srsStats, setSrsStats] = useState({ total: 0, dueToday: 0, learned: 0 });
    const [streak, setStreak] = useState<StreakData | null>(null);
    const role = account?.role || 'student';
    const isTeacher = role === 'teacher' || role === 'school';
    const badge = ROLE_BADGES[role];

    useEffect(() => {
        fetchSRSStats().then(setSrsStats).catch(() => {});
        setStreak(getStreakData());
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col overflow-y-auto">
            {/* Header — wraps on mobile */}
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800 shrink-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">🌍</span>
                    <span className="text-white font-bold text-base sm:text-lg">Kelsey</span>
                    {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.icon} {badge.label}
                        </span>
                    )}
                    {streak && streak.currentStreak > 0 && (
                        <StreakDisplay streak={streak} compact />
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {srsStats.dueToday > 0 && (
                        <span className="text-[10px] sm:text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-full font-semibold animate-pulse">
                            📅 {srsStats.dueToday} due
                        </span>
                    )}
                    {account && (
                        <button
                            onClick={() => navigate('/profile')}
                            className="text-gray-400 hover:text-blue-400 text-xs sm:text-sm transition-colors truncate max-w-[100px]"
                            title="View profile"
                        >
                            👤 {account.displayName}
                        </button>
                    )}
                    <button
                        onClick={onSignOut}
                        className="text-gray-500 hover:text-gray-300 text-xs sm:text-sm transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            {/* Main content — scrolls on mobile */}
            <main className="flex-1 flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:py-8">
                <div className="text-center mb-6 sm:mb-10">
                    <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">
                        How would you like to learn?
                    </h1>
                    <p className="text-gray-400 text-base sm:text-lg max-w-md mx-auto">
                        Choose a learning mode to get started
                    </p>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl ${isTeacher ? 'lg:grid-cols-3' : ''}`}>
                    {/* Free Conversation — all roles */}
                    <button
                        onClick={() => onModeSelect('free')}
                        className="group border-2 border-gray-700 hover:border-blue-500 bg-gray-900/50 hover:bg-blue-500/10 rounded-2xl p-4 sm:p-6 text-left transition-all duration-300"
                    >
                        <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">💬</span>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-blue-400 transition-colors">
                            Free Conversation
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                            Practice speaking naturally with an AI tutor. No structure, just conversation.
                        </p>
                        <ul className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-gray-500">
                            <li>✓ Flexible topics</li>
                            <li>✓ Real-time corrections</li>
                            <li>✓ Adaptive difficulty</li>
                        </ul>
                    </button>

                    {/* Structured Class — all roles */}
                    <button
                        onClick={() => onModeSelect('class')}
                        className="group border-2 border-gray-700 hover:border-green-500 bg-gray-900/50 hover:bg-green-500/10 rounded-2xl p-4 sm:p-6 text-left transition-all duration-300"
                    >
                        <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">📚</span>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-green-400 transition-colors">
                            Structured Class
                        </h3>
                        <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                            Follow a CEFR curriculum with lessons, exercises, and progress tracking.
                        </p>
                        <ul className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-gray-500">
                            <li>✓ CEFR-aligned curriculum</li>
                            <li>✓ Structured 6-phase lessons</li>
                            <li>✓ Progress tracking</li>
                        </ul>
                    </button>

                    {/* Human Tutor — teachers/schools only */}
                    {isTeacher && (
                        <button
                            onClick={() => onModeSelect('human-tutor')}
                            className="group border-2 border-gray-700 hover:border-purple-500 bg-gray-900/50 hover:bg-purple-500/10 rounded-2xl p-4 sm:p-6 text-left transition-all duration-300"
                        >
                            <span className="text-3xl sm:text-4xl block mb-2 sm:mb-3">👨‍🏫</span>
                            <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2 group-hover:text-purple-400 transition-colors">
                                Human Tutor
                            </h3>
                            <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
                                Host live sessions with a shared whiteboard, real-time cards, and confidence polling.
                            </p>
                            <ul className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-gray-500">
                                <li>✓ Shared interactive whiteboard</li>
                                <li>✓ Push content to students</li>
                                <li>✓ Live confidence tally</li>
                            </ul>
                        </button>
                    )}
                </div>

                {/* Student: join a session via room code */}
                {!isTeacher && (
                    <button
                        onClick={() => onModeSelect('human-tutor')}
                        className="mt-6 text-sm text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-2 mx-auto border border-gray-800 hover:border-purple-500/50 rounded-full px-5 py-2.5"
                    >
                        🔑 Have a room code? Join a live session
                    </button>
                )}

                {/* Review History link */}
                <button
                    onClick={onReviewHistory}
                    className="mt-8 text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                    📋 View Past Sessions
                </button>
            </main>
        </div>
    );
};
