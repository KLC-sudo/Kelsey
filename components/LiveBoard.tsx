/**
 * LiveBoard — Student-facing real-time card display.
 *
 * Cards animate in as the tutor pushes them.
 * Students can flag cards and add custom annotation text.
 * Retracted cards disappear immediately.
 */
import React, { useState, useRef, useEffect } from 'react';
import type { BoardCard, StudentAnnotation } from '../types/board';
import { FlashcardReview } from './FlashcardReview';
import { quickExportNotes } from '../utils/pdfExport';

interface LiveBoardProps {
  cards: BoardCard[];
  tutorName?: string;
  onFlagCard: (cardId: string, annotationText?: string) => void;
  onUnflagCard: (cardId: string) => void;
}

const CARD_TYPE_CONFIG = {
  vocabulary: { icon: '📚', label: 'Vocabulary', color: 'border-blue-500', bg: 'bg-blue-500/10', badge: 'bg-blue-500/20 text-blue-300' },
  grammar:    { icon: '🔤', label: 'Grammar',    color: 'border-green-500', bg: 'bg-green-500/10', badge: 'bg-green-500/20 text-green-300' },
  exercise:   { icon: '✏️', label: 'Exercise',   color: 'border-amber-500', bg: 'bg-amber-500/10', badge: 'bg-amber-500/20 text-amber-300' },
  phrase:     { icon: '💡', label: 'Phrase',     color: 'border-purple-500', bg: 'bg-purple-500/10', badge: 'bg-purple-500/20 text-purple-300' },
  cultural:   { icon: '🌍', label: 'Cultural',   color: 'border-pink-500', bg: 'bg-pink-500/10', badge: 'bg-pink-500/20 text-pink-300' },
  custom:     { icon: '📝', label: 'Note',       color: 'border-gray-500', bg: 'bg-gray-500/10', badge: 'bg-gray-500/20 text-gray-300' },
};

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─────────────────────────────────────────────
// Single Card Component
// ─────────────────────────────────────────────

const BoardCardItem: React.FC<{
  card: BoardCard;
  onFlag: (cardId: string, text?: string) => void;
  onUnflag: (cardId: string) => void;
  isNew: boolean;
}> = ({ card, onFlag, onUnflag, isNew }) => {
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState(card.studentAnnotation?.text ?? '');
  const cfg = CARD_TYPE_CONFIG[card.type];

  const handleFlag = () => {
    if (card.flagged) {
      onUnflag(card.id);
    } else {
      onFlag(card.id, annotationDraft.trim() || undefined);
      setShowAnnotationInput(false);
    }
  };

  const handleAnnotationSubmit = () => {
    onFlag(card.id, annotationDraft.trim() || undefined);
    setShowAnnotationInput(false);
  };

  return (
    <div
      className={`
        rounded-xl border-l-4 ${cfg.color} ${cfg.bg}
        p-3 sm:p-4 space-y-1.5 sm:space-y-2 transition-all duration-300
        ${isNew ? 'animate-slide-in-top ring-2 ring-white/20' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base">{cfg.icon}</span>
          <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500">{timeAgo(card.revealedAt)}</span>
      </div>

      {/* Title */}
      <div className="text-white font-bold text-base sm:text-lg leading-tight">{card.title}</div>

      {/* Body */}
      <div className="text-gray-300 text-xs sm:text-sm leading-relaxed">{card.body}</div>

      {/* Example */}
      {card.example && (
        <div className="mt-1 pl-2 sm:pl-3 border-l-2 border-gray-600 space-y-0.5">
          <div className="text-gray-200 text-xs sm:text-sm italic">"{card.example}"</div>
          {card.exampleTranslation && (
            <div className="text-gray-400 text-[10px] sm:text-xs">— {card.exampleTranslation}</div>
          )}
        </div>
      )}

      {/* Student annotation (if already set) */}
      {card.studentAnnotation && !showAnnotationInput && (
        <div className="flex items-start gap-1.5 mt-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
          <span className="text-amber-400 text-[10px] sm:text-xs mt-0.5">📝</span>
          <span className="text-amber-200 text-[10px] sm:text-xs">{card.studentAnnotation.text}</span>
        </div>
      )}

      {/* Annotation input */}
      {showAnnotationInput && (
        <div className="space-y-2 pt-1">
          <textarea
            value={annotationDraft}
            onChange={e => setAnnotationDraft(e.target.value)}
            placeholder="What's your question or note about this?"
            className="w-full bg-gray-900 text-white text-xs sm:text-sm p-2 rounded-lg border border-gray-600 focus:border-amber-400 focus:outline-none resize-none placeholder-gray-500"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAnnotationSubmit}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] sm:text-xs py-1.5 rounded-lg transition-colors font-medium"
            >
              🚩 Flag & Send Note
            </button>
            <button
              onClick={() => setShowAnnotationInput(false)}
              className="px-3 bg-gray-700 hover:bg-gray-600 text-white text-[10px] sm:text-xs py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action row */}
      {!showAnnotationInput && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              if (!card.flagged) {
                setShowAnnotationInput(true);
              } else {
                handleFlag();
              }
            }}
            className={`
              flex items-center gap-1 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-colors
              ${card.flagged
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-gray-700/60 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-600'
              }
            `}
          >
            {card.flagged ? '🚩 Flagged' : '🏳 Flag'}
          </button>
          {card.flagged && !card.studentAnnotation && (
            <button
              onClick={() => setShowAnnotationInput(true)}
              className="text-[10px] sm:text-xs text-gray-400 hover:text-amber-300 transition-colors"
            >
              ✏️ Add note
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// LiveBoard
// ─────────────────────────────────────────────

export const LiveBoard: React.FC<LiveBoardProps> = ({
  cards,
  tutorName,
  onFlagCard,
  onUnflagCard,
}) => {
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [newCardIds, setNewCardIds] = useState<Set<string>>(new Set());
  const prevCardCount = useRef(0);
  const boardEndRef = useRef<HTMLDivElement>(null);

  // Track new cards for entrance animation
  useEffect(() => {
    if (cards.length > prevCardCount.current) {
      const latestCard = cards[0]; // newest at top
      if (latestCard) {
        setNewCardIds(prev => new Set([...prev, latestCard.id]));
        // Remove "new" state after animation completes
        setTimeout(() => {
          setNewCardIds(prev => {
            const next = new Set(prev);
            next.delete(latestCard.id);
            return next;
          });
        }, 800);
      }
    }
    prevCardCount.current = cards.length;
  }, [cards.length]);

  const handleExportPDF = () => {
    const lines = cards.map(c => {
      let line = `[${c.type.toUpperCase()}] ${c.title}: ${c.body}`;
      if (c.example) line += ` | "${c.example}"`;
      if (c.studentAnnotation) line += ` | My note: "${c.studentAnnotation.text}"`;
      return line;
    });
    quickExportNotes(lines, `${tutorName ? `${tutorName}'s ` : ''}Board`);
  };

  // Flashcard data from current board
  const flashcardData = cards.map(c => ({
    term: c.title,
    translation: c.body,
    explanation: c.example ?? '',
    category: c.type as any,
  }));

  return (
    <>
      <div className="flex flex-col h-full bg-gray-900/60 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">📋 Live Board</span>
            {cards.length > 0 && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                {cards.length} {cards.length === 1 ? 'card' : 'cards'}
              </span>
            )}
          </div>
          {cards.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFlashcards(true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                🎴 Review
              </button>
              <button
                onClick={handleExportPDF}
                className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                📥 PDF
              </button>
            </div>
          )}
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-6">
              <div className="text-5xl mb-3 opacity-40">📋</div>
              <p className="font-medium text-gray-400">Your board is empty</p>
              <p className="text-sm mt-1 text-gray-600">Cards from your tutor will appear here</p>
            </div>
          ) : (
            // Newest cards at top
            [...cards].reverse().map(card => (
              <BoardCardItem
                key={card.id}
                card={card}
                onFlag={onFlagCard}
                onUnflag={onUnflagCard}
                isNew={newCardIds.has(card.id)}
              />
            ))
          )}
          <div ref={boardEndRef} />
        </div>
      </div>

      {/* Flashcard modal */}
      {showFlashcards && (
        <FlashcardReview
          notes={flashcardData}
          onClose={() => setShowFlashcards(false)}
        />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes slide-in-top {
          from { opacity: 0; transform: translateY(-16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slide-in-top {
          animation: slide-in-top 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </>
  );
};
