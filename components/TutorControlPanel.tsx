import React, { useState } from 'react';
import { Lesson, LessonPhase } from '../types/lesson';

interface TutorControlPanelProps {
    currentLesson: Lesson | null;
    currentPhase: LessonPhase;
    whiteboardTopics: string[];
    sessionDuration: number; // in seconds
    studentConnected: boolean;
    onPhaseChange: (phase: LessonPhase) => void;
    onAddNote: (note: string) => void;
    onRemoveNote: (index: number) => void;
    onEndSession: () => void;
}

const PHASE_ORDER: LessonPhase[] = ['introduction', 'grammar', 'vocabulary', 'practice', 'review', 'assessment'];

const PHASE_LABELS: Record<LessonPhase, string> = {
    introduction: 'Introduction',
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    practice: 'Practice',
    review: 'Review',
    assessment: 'Assessment',
};

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TutorControlPanel: React.FC<TutorControlPanelProps> = ({
    currentLesson,
    currentPhase,
    whiteboardTopics,
    sessionDuration,
    studentConnected,
    onPhaseChange,
    onAddNote,
    onRemoveNote,
    onEndSession,
}) => {
    const [newNote, setNewNote] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);

    const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);

    const handlePreviousPhase = () => {
        if (currentPhaseIndex > 0) {
            onPhaseChange(PHASE_ORDER[currentPhaseIndex - 1]);
        }
    };

    const handleNextPhase = () => {
        if (currentPhaseIndex < PHASE_ORDER.length - 1) {
            onPhaseChange(PHASE_ORDER[currentPhaseIndex + 1]);
        }
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            onAddNote(newNote.trim());
            setNewNote('');
            setIsAddingNote(false);
        }
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: studentConnected ? '#10b981' : '#ef4444' }}></div>
                    <h3 className="text-lg font-bold text-white">Tutor Controls</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>⏱️</span>
                    <span>{formatTime(sessionDuration)}</span>
                </div>
            </div>

            {/* Student Status */}
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Student Status:</span>
                    <span className={`text-sm font-semibold ${studentConnected ? 'text-green-400' : 'text-red-400'}`}>
                        {studentConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </span>
                </div>
            </div>

            {/* Lesson Info */}
            {currentLesson && (
                <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Lesson</div>
                    <div className="text-sm font-semibold text-white">{currentLesson.title}</div>
                    <div className="text-xs text-gray-400 mt-1">{currentLesson.description}</div>
                </div>
            )}

            {/* Phase Navigation */}
            <div className="space-y-2">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Lesson Phase</div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePreviousPhase}
                        disabled={currentPhaseIndex === 0}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white text-xl"
                    >
                        ◀
                    </button>

                    <div className="flex-grow bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <div className="text-center">
                            <div className="text-sm font-semibold text-white">{PHASE_LABELS[currentPhase]}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {currentPhaseIndex + 1} of {PHASE_ORDER.length}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleNextPhase}
                        disabled={currentPhaseIndex === PHASE_ORDER.length - 1}
                        className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white text-xl"
                    >
                        ▶
                    </button>
                </div>

                {/* Phase Indicators */}
                <div className="flex gap-1">
                    {PHASE_ORDER.map((phase, idx) => (
                        <button
                            key={phase}
                            onClick={() => onPhaseChange(phase)}
                            className={`flex-1 h-2 rounded-full transition-all ${idx === currentPhaseIndex
                                ? 'bg-blue-500'
                                : idx < currentPhaseIndex
                                    ? 'bg-green-600'
                                    : 'bg-gray-700'
                                }`}
                            title={PHASE_LABELS[phase]}
                        />
                    ))}
                </div>
            </div>

            {/* Whiteboard Notes Control */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Whiteboard Notes</div>
                    <button
                        onClick={() => setIsAddingNote(!isAddingNote)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <span className="text-lg">+</span>
                        Add Note
                    </button>
                </div>

                {/* Add Note Input */}
                {isAddingNote && (
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 space-y-2">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Enter a note for the whiteboard..."
                            className="w-full bg-gray-800 text-white text-sm p-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm py-2 rounded transition-colors"
                            >
                                Add to Whiteboard
                            </button>
                            <button
                                onClick={() => {
                                    setIsAddingNote(false);
                                    setNewNote('');
                                }}
                                className="px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Current Notes */}
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
                    {whiteboardTopics.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500 italic">
                            No notes yet. Add notes to guide the student.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {whiteboardTopics.map((note, idx) => (
                                <div key={idx} className="p-3 flex items-start justify-between gap-2 hover:bg-gray-800/50 transition-colors">
                                    <div className="text-sm text-gray-300 flex-grow">{note}</div>
                                    <button
                                        onClick={() => onRemoveNote(idx)}
                                        className="text-red-400 hover:text-red-300 shrink-0 text-xl font-bold"
                                        title="Remove note"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* End Session */}
            <button
                onClick={onEndSession}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
                End Session
            </button>
        </div>
    );
};
