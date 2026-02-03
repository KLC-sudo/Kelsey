// Class HUD - Minimal sticky header for class sessions with phase navigation

import React from 'react';
import type { Lesson, LessonPhase, ClassSession } from '../types/lesson';

interface ClassHUDProps {
    lesson: Lesson;
    session: ClassSession;
    currentPhase: LessonPhase;
    elapsedTime: number; // seconds
    onNextPhase?: () => void;
    onPreviousPhase?: () => void; // NEW: callback for going back
}

export const ClassHUD: React.FC<ClassHUDProps> = ({
    lesson,
    session,
    currentPhase,
    elapsedTime,
    onNextPhase,
    onPreviousPhase
}) => {
    const phaseIndex = lesson.phases.findIndex(p => p.phase === currentPhase);
    const totalPhases = lesson.phases.length;
    const isLastPhase = phaseIndex === totalPhases - 1;
    const currentPhaseConfig = lesson.phases[phaseIndex];

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const getPhaseIcon = (phase: LessonPhase) => {
        const icons: Record<LessonPhase, string> = {
            introduction: '👋',
            grammar: '📖',
            vocabulary: '📝',
            practice: '💬',
            assessment: '✅',
            review: '🎯'
        };
        return icons[phase] || '📚';
    };

    const getPhaseColor = (phase: LessonPhase) => {
        const colors: Record<LessonPhase, string> = {
            introduction: 'bg-blue-500',
            grammar: 'bg-purple-500',
            vocabulary: 'bg-green-500',
            practice: 'bg-yellow-500',
            assessment: 'bg-red-500',
            review: 'bg-gray-500'
        };
        return colors[phase] || 'bg-gray-500';
    };

    return (
        <div className="class-hud-minimal bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 px-3 py-2 mb-2">
            {/* Top Row: Lesson info + Phase controls + Timer */}
            <div className="flex items-center justify-between mb-2">
                {/* Left: Lesson info */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-semibold text-white">
                        {lesson.language.charAt(0).toUpperCase() + lesson.language.slice(1)} {lesson.level}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">{lesson.topic}</span>
                </div>

                {/* Center: Current phase + Navigation buttons */}
                <div className="flex items-center gap-2">
                    {/* Previous Phase Button */}
                    {onPreviousPhase && phaseIndex > 0 && (
                        <button
                            onClick={onPreviousPhase}
                            className="bg-gray-600 hover:bg-gray-500 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                            title="Previous Phase"
                        >
                            ← Back
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 bg-gray-700/50 px-2 py-1 rounded-full">
                        <span className="text-sm">{getPhaseIcon(currentPhase)}</span>
                        <span className="text-xs font-semibold text-white capitalize">{currentPhase}</span>
                        <span className="text-[10px] text-gray-400">({phaseIndex + 1}/{totalPhases})</span>
                    </div>

                    {/* Next Phase Button */}
                    {onNextPhase && (
                        <button
                            onClick={onNextPhase}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                            title={isLastPhase ? "Complete Lesson" : "Next Phase"}
                        >
                            {isLastPhase ? '🎉 Complete' : '→ Next'}
                        </button>
                    )}
                </div>

                {/* Right: Timer */}
                <div className="text-right">
                    <div className="text-sm font-mono text-white tabular-nums">{formatTime(elapsedTime)}</div>
                    <div className="text-[10px] text-gray-400">Elapsed</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-1 mb-2 overflow-hidden">
                <div
                    className={`h-full ${getPhaseColor(currentPhase)} transition-all duration-500`}
                    style={{ width: `${((phaseIndex + 1) / totalPhases) * 100}%` }}
                />
            </div>

            {/* Bottom Row: Phase timeline + Current objectives */}
            <div className="flex items-start justify-between gap-4">
                {/* Phase Timeline - Compact */}
                <div className="flex items-center gap-1">
                    {lesson.phases.map((phase, i) => (
                        <div
                            key={phase.phase}
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${i === phaseIndex
                                ? 'bg-blue-500/30 ring-2 ring-blue-500'
                                : i < phaseIndex
                                    ? 'bg-green-500/20'
                                    : 'bg-gray-700/30'
                                }`}
                            title={`${phase.phase} (${phase.duration}min)`}
                        >
                            <span className={
                                i === phaseIndex
                                    ? 'text-white'
                                    : i < phaseIndex
                                        ? 'text-green-400'
                                        : 'text-gray-600'
                            }>
                                {i < phaseIndex ? '✓' : getPhaseIcon(phase.phase)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Current Phase Objectives - Compact */}
                {currentPhaseConfig && currentPhaseConfig.objectives.length > 0 && (
                    <div className="flex-1 text-xs text-gray-400">
                        <span className="font-semibold">Goals: </span>
                        <span>{currentPhaseConfig.objectives.join(' • ')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
