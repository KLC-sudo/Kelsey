// Flashcard Review Component
import React, { useState } from 'react';

interface FlashcardProps {
    notes: Array<{
        term: string;
        translation?: string;
        explanation: string;
        category: string;
    }>;
    onClose: () => void;
}

export const FlashcardReview: React.FC<FlashcardProps> = ({ notes, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [learnedCards, setLearnedCards] = useState<Set<number>>(new Set());

    const currentCard = notes[currentIndex];
    const progress = ((learnedCards.size / notes.length) * 100).toFixed(0);

    const handleNext = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev + 1) % notes.length);
    };

    const handlePrevious = () => {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev - 1 + notes.length) % notes.length);
    };

    const handleMarkLearned = () => {
        setLearnedCards(prev => new Set(prev).add(currentIndex));
        handleNext();
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            vocabulary: '📚',
            grammar: '🔤',
            phrase: '💡',
            context: 'ℹ️',
            cultural: '🌍'
        };
        return icons[category] || '📝';
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            vocabulary: 'from-blue-500 to-blue-600',
            grammar: 'from-green-500 to-green-600',
            phrase: 'from-amber-500 to-amber-600',
            context: 'from-purple-500 to-purple-600',
            cultural: 'from-pink-500 to-pink-600'
        };
        return colors[category] || 'from-gray-500 to-gray-600';
    };

    if (notes.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-4">No Notes Yet</h2>
                    <p className="text-gray-400 mb-6">Start a conversation to collect notes for review!</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full border border-gray-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Flashcard Review</h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Card {currentIndex + 1} of {notes.length}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{learnedCards.size} / {notes.length} learned ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Flashcard */}
                <div
                    className="relative h-80 mb-6 cursor-pointer perspective-1000"
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <div
                        className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''
                            }`}
                    >
                        {/* Front of card */}
                        <div className={`absolute inset-0 backface-hidden rounded-xl bg-gradient-to-br ${getCategoryColor(currentCard.category)} p-8 flex flex-col items-center justify-center shadow-xl`}>
                            <div className="text-6xl mb-4">{getCategoryIcon(currentCard.category)}</div>
                            <h3 className="text-4xl font-bold text-white text-center mb-2">
                                {currentCard.term || 'Tap to flip'}
                            </h3>
                            <p className="text-white/80 text-sm uppercase tracking-wide">
                                {currentCard.category}
                            </p>
                            <p className="text-white/60 text-xs mt-4">Click to reveal</p>
                        </div>

                        {/* Back of card */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-xl bg-gray-800 border-2 border-gray-700 p-8 flex flex-col justify-center shadow-xl">
                            {currentCard.translation && (
                                <div className="mb-6">
                                    <div className="text-sm text-gray-400 uppercase tracking-wide mb-2">Translation</div>
                                    <div className="text-3xl font-bold text-white">{currentCard.translation}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-sm text-gray-400 uppercase tracking-wide mb-2">Explanation</div>
                                <div className="text-lg text-gray-300 leading-relaxed">{currentCard.explanation}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={handlePrevious}
                        disabled={notes.length === 1}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                    </button>

                    <button
                        onClick={handleMarkLearned}
                        className={`flex-1 font-semibold py-3 rounded-lg transition-colors ${learnedCards.has(currentIndex)
                                ? 'bg-green-600/50 text-green-300'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        {learnedCards.has(currentIndex) ? '✓ Learned' : 'Mark as Learned'}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={notes.length === 1}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        Next
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="mt-4 text-center text-xs text-gray-500">
                    <span className="inline-block bg-gray-800 px-2 py-1 rounded mr-2">←</span> Previous
                    <span className="inline-block bg-gray-800 px-2 py-1 rounded mx-2">Space</span> Flip
                    <span className="inline-block bg-gray-800 px-2 py-1 rounded mx-2">→</span> Next
                    <span className="inline-block bg-gray-800 px-2 py-1 rounded ml-2">L</span> Mark Learned
                </div>
            </div>

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
};
