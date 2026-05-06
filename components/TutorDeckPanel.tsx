/**
 * TutorDeckPanel — Tutor's curriculum card queue and push controls.
 *
 * Displays all lesson content as a phased card queue.
 * Tutor pushes one card at a time to the student's LiveBoard.
 * Private teaching notes are visible only here — never transmitted.
 */
import React, { useState, useMemo } from 'react';
import type { BoardCard, CurriculumDeck, CardType } from '../types/board';
import type { LessonPhase } from '../types/lesson';
import { getCardsForPhase, getNextCard, getUnsentCards, getSentCards, createCustomCard } from '../utils/curriculumDeck';
import type { StudentSignal } from '../utils/stateSync';

interface TutorDeckPanelProps {
  deck: CurriculumDeck;
  currentPhase: LessonPhase;
  flaggedCardIds: Map<string, string | undefined>; // cardId -> annotationText
  onPushCard: (card: BoardCard) => void;
  onRetractLastCard: () => void;
  lastSentCardId: string | null;
}

const PHASE_LABELS: Record<LessonPhase, string> = {
  introduction: 'Intro',
  grammar: 'Grammar',
  vocabulary: 'Vocab',
  practice: 'Practice',
  assessment: 'Assess',
  review: 'Review',
};

const CARD_TYPE_ICONS: Record<CardType, string> = {
  vocabulary: '📚',
  grammar: '🔤',
  exercise: '✏️',
  phrase: '💡',
  cultural: '🌍',
  custom: '📝',
};

const ALL_PHASES: LessonPhase[] = ['introduction', 'grammar', 'vocabulary', 'practice', 'assessment', 'review'];

// ─────────────────────────────────────────────
// Queue Card Row (unsent cards)
// ─────────────────────────────────────────────
const QueueRow: React.FC<{
  card: BoardCard;
  onPush: (card: BoardCard) => void;
}> = ({ card, onPush }) => (
  <div className="flex items-start gap-2 px-3 py-2 hover:bg-gray-800/60 rounded-lg group transition-colors">
    <span className="text-base shrink-0 mt-0.5">{CARD_TYPE_ICONS[card.type]}</span>
    <div className="flex-1 min-w-0">
      <div className="text-sm text-gray-200 font-medium truncate">{card.title}</div>
      <div className="text-xs text-gray-500 truncate">{card.body}</div>
    </div>
    <button
      onClick={() => onPush(card)}
      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded-lg"
      title="Push this card to student board"
    >
      ▲ Send
    </button>
  </div>
);

// ─────────────────────────────────────────────
// Sent Card Row (already pushed)
// ─────────────────────────────────────────────
const SentRow: React.FC<{
  card: BoardCard;
  flagInfo?: string | undefined;
  isLast: boolean;
  onRetract: () => void;
}> = ({ card, flagInfo, isLast, onRetract }) => (
  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-800/30">
    <span className="text-sm shrink-0 mt-0.5">{CARD_TYPE_ICONS[card.type]}</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-300 font-medium truncate">{card.title}</span>
        <span className="text-green-400 text-xs">✓</span>
        {flagInfo !== undefined && (
          <span className="text-red-400 text-xs" title={flagInfo || 'Flagged by student'}>🚩</span>
        )}
      </div>
      {flagInfo && (
        <div className="text-xs text-amber-300 mt-0.5 italic">"{flagInfo}"</div>
      )}
    </div>
    {isLast && (
      <button
        onClick={onRetract}
        className="shrink-0 text-xs text-gray-500 hover:text-red-400 transition-colors px-1"
        title="Retract last card"
      >
        ↩
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────
// TutorDeckPanel
// ─────────────────────────────────────────────
export const TutorDeckPanel: React.FC<TutorDeckPanelProps> = ({
  deck,
  currentPhase,
  flaggedCardIds,
  onPushCard,
  onRetractLastCard,
  lastSentCardId,
}) => {
  const [phaseFilter, setPhaseFilter] = useState<LessonPhase | 'all'>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [showNextCard, setShowNextCard] = useState(true);

  const unsentCards = useMemo(() => {
    const all = getUnsentCards(deck);
    if (phaseFilter === 'all') return all;
    return all.filter(c => c.phase === phaseFilter);
  }, [deck, phaseFilter]);

  const sentCards = useMemo(() => getSentCards(deck), [deck]);
  const nextCard = useMemo(() => getNextCard(deck), [deck]);

  const handlePushNext = () => {
    if (nextCard) onPushCard(nextCard);
  };

  const handlePushCard = (card: BoardCard) => {
    onPushCard(card);
  };

  const handleCustomSubmit = () => {
    if (!customTitle.trim() || !customBody.trim()) return;
    const card = createCustomCard(customTitle.trim(), customBody.trim(), currentPhase, {
      sessionId: `session-${Date.now()}`,
      lessonId: deck.lessonId,
      language: deck.language,
      level: deck.level,
    });
    onPushCard(card);
    setCustomTitle('');
    setCustomBody('');
    setShowCustomForm(false);
  };

  const remainingCount = getUnsentCards(deck).length;

  return (
    <div className="flex flex-col h-full bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white text-sm">📚 Curriculum Deck</span>
          <span className="text-xs text-gray-400">{remainingCount} remaining</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">
          {deck.language.charAt(0).toUpperCase() + deck.language.slice(1)} · {deck.level} · {deck.totalCards} cards
        </div>
      </div>

      {/* Phase filter tabs */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-700/50 shrink-0 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setPhaseFilter('all')}
          className={`shrink-0 text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            phaseFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {ALL_PHASES.map(phase => (
          <button
            key={phase}
            onClick={() => setPhaseFilter(phase)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
              phaseFilter === phase
                ? 'bg-blue-600 text-white'
                : phase === currentPhase
                  ? 'text-blue-300 border border-blue-500/40 hover:bg-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {PHASE_LABELS[phase]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Next card preview */}
        {nextCard && showNextCard && phaseFilter === 'all' && (
          <div className="m-3 bg-gray-900/70 border border-gray-600 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Next Card</span>
              <span className="text-xs text-gray-500">{CARD_TYPE_ICONS[nextCard.type]} {nextCard.type}</span>
            </div>
            <div className="font-bold text-white">{nextCard.title}</div>
            <div className="text-gray-300 text-sm">{nextCard.body}</div>
            {nextCard.example && (
              <div className="text-xs text-gray-400 italic">e.g. "{nextCard.example}"</div>
            )}
            {nextCard.teachingNote && (
              <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
                <span className="text-amber-400 text-xs">🔒</span>
                <span className="text-amber-200 text-xs">{nextCard.teachingNote}</span>
              </div>
            )}
            <button
              onClick={handlePushNext}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors mt-1 flex items-center justify-center gap-2"
            >
              <span>→ Push to Board</span>
            </button>
          </div>
        )}

        {/* Upcoming queue */}
        {unsentCards.length > 0 && (
          <div className="px-1 pb-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide px-2 py-2">
              Upcoming
            </div>
            <div className="space-y-0.5">
              {unsentCards.slice(nextCard && phaseFilter === 'all' ? 1 : 0).map(card => (
                <QueueRow key={card.id} card={card} onPush={handlePushCard} />
              ))}
            </div>
          </div>
        )}

        {unsentCards.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-6 px-4">
            {phaseFilter === 'all' ? 'All cards have been sent.' : `No ${PHASE_LABELS[phaseFilter as LessonPhase]} cards remaining.`}
          </div>
        )}

        {/* Custom card form */}
        {showCustomForm && (
          <div className="mx-3 mb-3 bg-gray-900/80 border border-gray-600 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custom Card</div>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Title / Term"
              className="w-full bg-gray-800 text-white text-sm p-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <textarea
              value={customBody}
              onChange={e => setCustomBody(e.target.value)}
              placeholder="Content / Explanation"
              rows={2}
              className="w-full bg-gray-800 text-white text-sm p-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customTitle.trim() || !customBody.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm py-2 rounded-lg transition-colors"
              >
                Push Custom Card
              </button>
              <button
                onClick={() => { setShowCustomForm(false); setCustomTitle(''); setCustomBody(''); }}
                className="px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sent cards */}
        {sentCards.length > 0 && (
          <div className="px-1 pb-3">
            <div className="flex items-center justify-between px-2 py-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                Sent ({sentCards.length})
              </span>
              {lastSentCardId && (
                <button
                  onClick={onRetractLastCard}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  ↩ Retract last
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {[...sentCards].reverse().map((card, idx) => (
                <SentRow
                  key={card.id}
                  card={card}
                  flagInfo={flaggedCardIds.get(card.id)}
                  isLast={idx === 0}
                  onRetract={onRetractLastCard}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — add custom card */}
      <div className="px-3 py-2 border-t border-gray-700 shrink-0">
        <button
          onClick={() => setShowCustomForm(v => !v)}
          className="w-full text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
        >
          <span className="text-base">+</span> Add Custom Card
        </button>
      </div>
    </div>
  );
};
