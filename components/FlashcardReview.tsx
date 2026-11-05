// Flashcard Review Component with SRS (Phase 4)
import React, { useState, useEffect, useCallback } from 'react';
import { importCards, submitReview, type SRSCardData } from '../utils/srsClient';

interface FlashcardProps {
    notes: Array<{
        term: string;
        translation?: string;
        explanation: string;
        category: string;
    }>;
    onClose: () => void;
}

type Quality = 0 | 1 | 2 | 3; // Again, Hard, Good, Easy

const QUALITY_BUTTONS = [
    { q: 0 as Quality, label: 'Again', color: 'bg-red-600 hover:bg-red-500', desc: 'forgot' },
    { q: 1 as Quality, label: 'Hard', color: 'bg-amber-600 hover:bg-amber-500', desc: 'struggled' },
    { q: 2 as Quality, label: 'Good', color: 'bg-green-600 hover:bg-green-500', desc: 'recalled' },
    { q: 3 as Quality, label: 'Easy', color: 'bg-blue-600 hover:bg-blue-500', desc: 'knew it' },
];

export const FlashcardReview: React.FC<FlashcardProps> = ({ notes, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [reviewedCount, setReviewedCount] = useState(0);
    const [srsIds, setSrsIds] = useState<Record<number, string>>({});
    const [lastInterval, setLastInterval] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentCard = notes[currentIndex];
    const progress = notes.length > 0 ? ((reviewedCount / notes.length) * 100).toFixed(0) : '0';

    // Import cards into SRS on mount to get IDs
    useEffect(() => {
        const cardData: SRSCardData[] = notes.map(n => ({
            front: n.term,
            back: n.translation || '',
            explanation: n.explanation,
            category: n.category,
        }));
        importCards(cardData).catch(() => {});
    }, []);

    const handleRate = useCallback(async (quality: Quality) => {
        setIsSubmitting(true);
        const srsId = srsIds[currentIndex];
        if (srsId) {
            try {
                const result = await submitReview(srsId, quality);
                if (result && 'intervalDays' in result) {
                    setLastInterval(result.intervalDays);
                }
            } catch (e) {
                console.warn('SRS submit failed:', e);
            }
        }
        setIsSubmitting(false);
        setReviewedCount(prev => prev + 1);
        setIsFlipped(false);
        setLastInterval(null);
        // Move to next unreviewed card (or cycle)
        setCurrentIndex(prev => {
            const next = (prev + 1) % notes.length;
            return next;
        });
    }, [currentIndex, notes.length, srsIds]);

    const handleFlip = () => setIsFlipped(!isFlipped);

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            vocabulary: '📚', grammar: '🔤', phrase: '💡', context: 'ℹ️', cultural: '🌍'
        };
        return icons[category] || '📝';
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            vocabulary: 'from-blue-500 to-blue-600', grammar: 'from-green-500 to-green-600',
            phrase: 'from-amber-500 to-amber-600', context: 'from-purple-500 to-purple-600',
            cultural: 'from-pink-500 to-pink-600'
        };
        return colors[category] || 'from-gray-500 to-gray-600';
    };

    if (notes.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
                    <h2 className="text-2xl font-bold text-white mb-4">No Cards Yet</h2>
                    <p className="text-gray-400 mb-6">Complete a lesson or session to collect flashcards!</p>
                    <button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
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
                            Card {currentIndex + 1} of {notes.length} · {reviewedCount} reviewed
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{reviewedCount} / {notes.length} reviewed ({progress}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Flashcard */}
                <div className="relative h-80 mb-6 cursor-pointer perspective-1000" onClick={handleFlip}>
                    <div className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                        {/* Front */}
                        <div className={`absolute inset-0 backface-hidden rounded-xl bg-gradient-to-br ${getCategoryColor(currentCard.category)} p-8 flex flex-col items-center justify-center shadow-xl`}>
                            <div className="text-6xl mb-4">{getCategoryIcon(currentCard.category)}</div>
                            <h3 className="text-4xl font-bold text-white text-center mb-2">{currentCard.term || 'Tap to flip'}</h3>
                            <p className="text-white/80 text-sm uppercase tracking-wide">{currentCard.category}</p>
                            <p className="text-white/60 text-xs mt-4">Click to reveal</p>
                        </div>

                        {/* Back */}
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

                {/* SRS Quality Rating (shown after flip) */}
                {isFlipped && (
                    <div className="mb-4">
                        <p className="text-xs text-gray-500 text-center mb-2">How well did you know this?</p>
                        <div className="grid grid-cols-4 gap-2">
                            {QUALITY_BUTTONS.map(btn => (
                                <button
                                    key={btn.q}
                                    onClick={() => handleRate(btn.q)}
                                    disabled={isSubmitting}
                                    className={`${btn.color} text-white py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 hover:scale-105`}
                                >
                                    <div>{btn.label}</div>
                                    <div className="text-[10px] opacity-70">{btn.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4">
                    <button
                        onClick={() => { setIsFlipped(false); setCurrentIndex(prev => (prev - 1 + notes.length) % notes.length); }}
                        disabled={notes.length === 1}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        ← Previous
                    </button>
                    <button
                        onClick={handleFlip}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {isFlipped ? 'Show Front' : 'Flip Card'}
                    </button>
                    <button
                        onClick={() => { setIsFlipped(false); setCurrentIndex(prev => (prev + 1) % notes.length); }}
                        disabled={notes.length === 1}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        Next →
                    </button>
                </div>

                {/* Last interval info */}
                {lastInterval !== null && (
                    <p className="text-center text-xs text-green-400 mt-3">
                        ✓ Next review in {lastInterval === 0 ? 'today' : `${lastInterval} day${lastInterval > 1 ? 's' : ''}`}
                    </p>
                )}

                <div className="mt-4 text-center text-xs text-gray-500">
                    Rate after flipping to schedule spaced repetition reviews
                </div>
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};
