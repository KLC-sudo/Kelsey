// Lesson Completion Modal - Celebration screen when finishing a lesson

import React from 'react';
import type { Lesson } from '../types/lesson';

interface LessonCompleteProps {
    lesson: Lesson;
    score: number;
    timeSpent: number; // seconds
    onContinue: () => void;
    onBackToMenu: () => void;
}

export const LessonComplete: React.FC<LessonCompleteProps> = ({
    lesson,
    score,
    timeSpent,
    onContinue,
    onBackToMenu
}) => {
    const minutes = Math.floor(timeSpent / 60);
    const nextLessonNum = lesson.lessonNumber + 1;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-green-500/50 shadow-2xl animate-scale-in">
                {/* Celebration Header */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Lesson Complete!
                    </h2>
                    <p className="text-gray-400">
                        {lesson.topic}
                    </p>
                </div>

                {/* Stats */}
                <div className="bg-gray-700/50 rounded-xl p-6 mb-6 space-y-4">
                    {/* Score */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300 flex items-center gap-2">
                            <span className="text-2xl">⭐</span>
                            <span>Score</span>
                        </span>
                        <span className="text-2xl font-bold text-green-400">
                            {score}%
                        </span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300 flex items-center gap-2">
                            <span className="text-2xl">⏱️</span>
                            <span>Time</span>
                        </span>
                        <span className="text-xl font-semibold text-blue-400">
                            {minutes} min
                        </span>
                    </div>

                    {/* Phases Completed */}
                    <div className="flex items-center justify-between">
                        <span className="text-gray-300 flex items-center gap-2">
                            <span className="text-2xl">✅</span>
                            <span>Phases</span>
                        </span>
                        <span className="text-xl font-semibold text-purple-400">
                            {lesson.phases.length}/{lesson.phases.length}
                        </span>
                    </div>
                </div>

                {/* Achievement Message */}
                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-6">
                    <p className="text-green-300 text-center text-sm">
                        🔓 <strong>Lesson {nextLessonNum} Unlocked!</strong>
                        <br />
                        <span className="text-green-400/80">
                            Keep up the great work!
                        </span>
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={onContinue}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                        Continue to Lesson {nextLessonNum} →
                    </button>

                    <button
                        onClick={onBackToMenu}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                        Back to Lesson Menu
                    </button>
                </div>

                {/* Confetti Effect (CSS animation) */}
                <style>{`
                    @keyframes scale-in {
                        from {
                            transform: scale(0.8);
                            opacity: 0;
                        }
                        to {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                    .animate-scale-in {
                        animation: scale-in 0.3s ease-out;
                    }
                `}</style>
            </div>
        </div>
    );
};
