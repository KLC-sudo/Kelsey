import React from 'react';
import type { UserAccount } from '../types/account';

export type AppMode = 'free' | 'class' | 'human-tutor';

interface ModeSelectorProps {
    account: UserAccount | null;
    onModeSelect: (mode: AppMode) => void;
    onReviewHistory: () => void;
    onSignOut: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ account, onModeSelect, onReviewHistory, onSignOut }) => {
    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🌍</span>
                    <span className="text-white font-bold text-lg">Kelsey</span>
                </div>
                <div className="flex items-center gap-4">
                    {account && (
                        <span className="text-gray-400 text-sm">
                            {account.displayName}
                        </span>
                    )}
                    <button
                        onClick={onSignOut}
                        className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                        How would you like to learn?
                    </h1>
                    <p className="text-gray-400 text-lg max-w-md mx-auto">
                        Choose a learning mode to get started
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    {/* Free Conversation */}
                    <button
                        onClick={() => onModeSelect('free')}
                        className="group border-2 border-gray-700 hover:border-blue-500 bg-gray-900/50 hover:bg-blue-500/10 rounded-2xl p-6 text-left transition-all duration-300"
                    >
                        <span className="text-4xl block mb-3">💬</span>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                            Free Conversation
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Practice speaking naturally with an AI tutor. No structure, just conversation.
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-500">
                            <li>✓ Flexible topics</li>
                            <li>✓ Real-time corrections</li>
                            <li>✓ Adaptive difficulty</li>
                        </ul>
                    </button>

                    {/* Structured Class */}
                    <button
                        onClick={() => onModeSelect('class')}
                        className="group border-2 border-gray-700 hover:border-green-500 bg-gray-900/50 hover:bg-green-500/10 rounded-2xl p-6 text-left transition-all duration-300"
                    >
                        <span className="text-4xl block mb-3">📚</span>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                            Structured Class
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Follow a CEFR curriculum with lessons, exercises, and progress tracking.
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-500">
                            <li>✓ CEFR-aligned curriculum</li>
                            <li>✓ Structured 6-phase lessons</li>
                            <li>✓ Progress tracking</li>
                        </ul>
                    </button>

                    {/* Human Tutor */}
                    <button
                        onClick={() => onModeSelect('human-tutor')}
                        className="group border-2 border-gray-700 hover:border-purple-500 bg-gray-900/50 hover:bg-purple-500/10 rounded-2xl p-6 text-left transition-all duration-300"
                    >
                        <span className="text-4xl block mb-3">👨‍🏫</span>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                            Human Tutor
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Connect with a real tutor for live, personalized instruction via whiteboard.
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-500">
                            <li>✓ Shared interactive whiteboard</li>
                            <li>✓ Tutor-guided lessons</li>
                            <li>✓ Real-time feedback</li>
                        </ul>
                    </button>
                </div>

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
