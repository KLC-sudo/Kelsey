// Mode Selector Component - Choose between Free Conversation and Class Mode

import React from 'react';

export type AppMode = 'free' | 'class' | 'human-tutor';

interface ModeSelectorProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ currentMode, onModeChange }) => {
    return (
        <div className="mode-selector">
            <h2 className="text-2xl font-bold mb-4 text-white">Choose Your Learning Mode</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Conversation Mode */}
                <button
                    onClick={() => onModeChange('free')}
                    className={`mode-card ${currentMode === 'free'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-blue-400'
                        } border-2 rounded-xl p-6 transition-all duration-300 text-left`}
                >
                    <div className="flex items-center mb-3">
                        <span className="text-4xl mr-3">💬</span>
                        <h3 className="text-xl font-bold text-white">Free Conversation</h3>
                    </div>

                    <p className="text-gray-300 mb-4">
                        Practice speaking naturally with your AI tutor. No structure, just conversation.
                    </p>

                    <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Flexible topics</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Real-time corrections</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Adaptive difficulty</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>No time limits</span>
                        </li>
                    </ul>

                    {currentMode === 'free' && (
                        <div className="mt-4 text-blue-400 font-semibold">
                            ← Currently Selected
                        </div>
                    )}
                </button>

                {/* Structured Class Mode */}
                <button
                    onClick={() => onModeChange('class')}
                    className={`mode-card ${currentMode === 'class'
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-green-400'
                        } border-2 rounded-xl p-6 transition-all duration-300 text-left`}
                >
                    <div className="flex items-center mb-3">
                        <span className="text-4xl mr-3">📚</span>
                        <h3 className="text-xl font-bold text-white">Structured Class</h3>
                    </div>

                    <p className="text-gray-300 mb-4">
                        Follow a curriculum with lessons, exercises, and assessments. Track your progress.
                    </p>

                    <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>CEFR-aligned curriculum</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Structured lessons</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Progress tracking</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>2-hour classes</span>
                        </li>
                    </ul>

                    {currentMode === 'class' && (
                        <div className="mt-4 text-green-400 font-semibold">
                            ← Currently Selected
                        </div>
                    )}
                </button>

                {/* Human Tutor Mode */}
                <button
                    onClick={() => onModeChange('human-tutor')}
                    className={`mode-card ${currentMode === 'human-tutor'
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-purple-400'
                        } border-2 rounded-xl p-6 transition-all duration-300 text-left`}
                >
                    <div className="flex items-center mb-3">
                        <span className="text-4xl mr-3">👨‍🏫</span>
                        <h3 className="text-xl font-bold text-white">Human Tutor</h3>
                    </div>

                    <p className="text-gray-300 mb-4">
                        Connect with a real human tutor for personalized, live instruction via voice.
                    </p>

                    <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Real-time VoIP audio</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Shared whiteboard</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Tutor-guided lessons</span>
                        </li>
                        <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            <span>Personal feedback</span>
                        </li>
                    </ul>

                    {currentMode === 'human-tutor' && (
                        <div className="mt-4 text-purple-400 font-semibold">
                            ← Currently Selected
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};
