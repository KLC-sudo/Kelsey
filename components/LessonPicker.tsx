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

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
            <div key={i} className="border-2 border-gray-800 bg-gray-800/20 rounded-xl p-4 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                        <div className="w-24 h-6 bg-gray-700 rounded-md"></div>
                    </div>
                </div>
                <div className="w-full h-4 bg-gray-700 rounded-md mb-2"></div>
                <div className="w-2/3 h-4 bg-gray-700 rounded-md mb-4"></div>
                <div className="w-16 h-3 bg-gray-700 rounded-md"></div>
            </div>
        ))}
    </div>
);

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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const lessonData = JSON.parse(content) as Lesson;
                if (!lessonData.id || !lessonData.topic || !lessonData.phases) {
                    throw new Error('Invalid lesson format');
                }
                onLessonSelect(lessonData);
            } catch (error) {
                alert('Error parsing lesson JSON. Please make sure it is a valid Kelsey lesson file.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    };

    const [lessons, setLessons] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);

    React.useEffect(() => {
        setIsLoading(true);
        fetch(`/api/lessons?language=${language}&level=${level}`)
            .then(res => res.json())
            .then(data => {
                setLessons(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load lessons', err);
                setIsLoading(false);
            });
    }, [language, level]);

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
                    <div className="text-right hidden sm:block">
                        <div className="text-sm text-gray-400">Your Progress</div>
                        <div className="text-2xl font-bold text-white">
                            {progress.lessonsCompleted} / {lessons.length || 10}
                        </div>
                        <div className="text-sm text-gray-400">
                            Avg Score: {Math.round(progress.averageScore)}%
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Lesson Upload - Collapsible */}
            <div className="mb-8">
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <span className="text-xs">{showAdvanced ? '▼' : '▶'}</span> Advanced Options
                </button>
                
                {showAdvanced && (
                    <div className="mt-4 p-6 border-2 border-dashed border-purple-500/50 bg-purple-900/10 rounded-xl animate-fade-in-down">
                        <h3 className="text-lg font-bold text-purple-300 mb-2">Upload Custom Lesson</h3>
                        <p className="text-gray-400 text-sm mb-4">
                            Load a generated .json lesson file directly into the board.
                        </p>
                        <input 
                            type="file" 
                            accept=".json"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-purple-600 file:text-white
                                hover:file:bg-purple-500
                                cursor-pointer transition-colors"
                        />
                    </div>
                )}
            </div>

            <h3 className="text-xl font-bold text-gray-300 mb-4">Curriculum</h3>

            {isLoading ? (
                <LoadingSkeleton />
            ) : lessons.length === 0 ? (
                <div className="text-center p-12 border border-gray-800 bg-gray-900/50 rounded-2xl">
                    <div className="text-5xl mb-4">✨</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Curriculum Found</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        There are currently no generated lessons for {language} {level} in the database.
                    </p>
                    <button 
                        onClick={() => {
                            setIsGenerating(true);
                            setTimeout(() => {
                                alert('AI Generation endpoint required. For now, use Advanced Options to upload a JSON.');
                                setIsGenerating(false);
                            }, 1000);
                        }}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Generate First Lesson'}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lessons.map(lesson => {
                        const lessonId = lesson.id;
                        const lessonNum = lesson.lesson_number;
                        const status = getLessonStatus(lessonId, lessonNum);
                        const isAvailable = status !== 'locked';

                        return (
                            <button
                                key={lessonId}
                                onClick={async () => {
                                    if (isAvailable) {
                                        try {
                                            const res = await fetch(`/api/lessons/${lessonId}`);
                                            if (res.ok) {
                                                const fullLesson = await res.json();
                                                onLessonSelect(fullLesson);
                                                return;
                                            }
                                        } catch(e) {
                                            console.error('Failed to load lesson', e);
                                        }
                                        alert('⚠️ Failed to load lesson data from server.');
                                    } else if (!isAvailable) {
                                        alert('Complete previous lessons to unlock this one!');
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
                                    {lesson.topic}
                                </p>

                                <div className="flex items-center text-xs text-gray-500">
                                    <span>⏱️ 300 min</span>
                                </div>

                                {status === 'locked' && (
                                    <div className="mt-4">
                                        <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1 relative overflow-hidden">
                                            {/* Progress indicator representing distance to unlock */}
                                            <div className="bg-gray-600 h-1.5 rounded-full w-1/4"></div>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium text-center uppercase tracking-wider mt-2">
                                            Locked
                                        </p>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
