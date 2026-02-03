// Lesson Picker Component - Grid of available lessons

import React from 'react';
import type { Lesson, CEFRLevel } from '../types/lesson';
import { getUserProgress } from '../utils/progress';

interface LessonPickerProps {
    language: 'german' | 'french' | 'spanish';
    level: CEFRLevel;
    onLessonSelect: (lesson: Lesson) => void;
    onBack: () => void;
}

export const LessonPicker: React.FC<LessonPickerProps> = ({
    language,
    level,
    onLessonSelect,
    onBack
}) => {
    const progress = getUserProgress();

    const getLessonStatus = (lessonId: string, lessonNum: number): 'locked' | 'available' | 'completed' => {
        // Lesson 1 is ALWAYS available
        if (lessonNum === 1) {
            if (progress?.completedLessons.includes(lessonId)) {
                return 'completed';
            }
            return 'available';
        }

        // Other lessons require previous lesson to be completed
        if (!progress) return 'locked';

        if (progress.completedLessons.includes(lessonId)) {
            return 'completed';
        }

        // Check if previous lesson is completed
        const prevLessonId = `${language}-${level}-lesson-${String(lessonNum - 1).padStart(2, '0')}`;
        if (progress.completedLessons.includes(prevLessonId)) {
            return 'available';
        }

        return 'locked';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return '✅';
            case 'available': return '▶️';
            case 'locked': return '🔒';
            default: return '📝';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'border-green-500 bg-green-500/10';
            case 'available': return 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20';
            case 'locked': return 'border-gray-700 bg-gray-800/30 opacity-50';
            default: return 'border-gray-600';
        }
    };

    return (
        <div className="lesson-picker">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button
                        onClick={onBack}
                        className="text-blue-400 hover:text-blue-300 mb-2 flex items-center"
                    >
                        ← Back to Mode Selection
                    </button>
                    <h2 className="text-3xl font-bold text-white">
                        {language.charAt(0).toUpperCase() + language.slice(1)} {level}
                    </h2>
                    <p className="text-gray-400 mt-1">
                        Choose a lesson to begin your structured class
                    </p>
                </div>

                {progress && (
                    <div className="text-right">
                        <div className="text-sm text-gray-400">Your Progress</div>
                        <div className="text-2xl font-bold text-white">
                            {progress.lessonsCompleted} / 10
                        </div>
                        <div className="text-sm text-gray-400">
                            Avg Score: {Math.round(progress.averageScore)}%
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(lessonNum => {
                    const lessonId = `${language}-${level}-lesson-${String(lessonNum).padStart(2, '0')}`;
                    const status = getLessonStatus(lessonId, lessonNum);
                    const isAvailable = status !== 'locked';

                    // Get lesson data (for now, only lesson 1 exists)
                    const lessonData = lessonNum === 1 ? {
                        topic: 'Alphabet, Phonetics & Greetings',
                        duration: 300
                    } : {
                        topic: `Lesson ${lessonNum}`,
                        duration: 300
                    };

                    return (
                        <button
                            key={lessonId}
                            onClick={() => {
                                if (isAvailable && lessonNum === 1) {
                                    // Load lesson 1 from localStorage
                                    const stored = localStorage.getItem(`lesson_${lessonId}`);
                                    if (stored) {
                                        onLessonSelect(JSON.parse(stored));
                                    } else {
                                        alert('⚠️ Lesson not loaded!\n\n1. Open browser console (F12)\n2. Paste contents of load-lesson-data.js\n3. Press Enter\n4. Refresh page');
                                    }
                                } else if (!isAvailable) {
                                    alert('Complete previous lessons to unlock this one!');
                                } else {
                                    alert('This lesson content is not yet available. Coming soon!');
                                }
                            }}
                            disabled={!isAvailable}
                            className={`${getStatusColor(status)} border-2 rounded-lg p-4 transition-all duration-300 text-left ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-2">{getStatusIcon(status)}</span>
                                    <span className="text-lg font-bold text-white">
                                        Lesson {lessonNum}
                                    </span>
                                </div>
                                {status === 'completed' && progress?.assessments[lessonId] && (
                                    <span className="text-sm text-green-400 font-semibold">
                                        {Math.round(progress.assessments[lessonId].score)}%
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-gray-300 mb-2">
                                {lessonData.topic}
                            </p>

                            <div className="flex items-center text-xs text-gray-500">
                                <span>⏱️ {lessonData.duration} min</span>
                            </div>

                            {status === 'locked' && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Complete previous lessons to unlock
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
