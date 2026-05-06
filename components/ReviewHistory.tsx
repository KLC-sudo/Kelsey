/**
 * ReviewHistory — Student's persistent post-session card library.
 *
 * Shows all past sessions, filterable by language and level.
 * Each session is reviewable as flashcards and exportable as PDF.
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { ReviewSession } from '../types/board';
import type { LanguageCode, CEFRLevel } from '../types/lesson';
import {
  getFilteredHistory,
  deleteFromHistory,
  exportSessionToPDF,
  exportHistoryToPDF,
} from '../utils/reviewHistory';
import { FlashcardReview } from './FlashcardReview';

interface ReviewHistoryProps {
  onBack: () => void;
}

const LANGUAGE_OPTIONS: { value: LanguageCode | 'all'; label: string }[] = [
  { value: 'all', label: '🌐 All Languages' },
  { value: 'german', label: '🇩🇪 German' },
  { value: 'french', label: '🇫🇷 French' },
  { value: 'spanish', label: '🇪🇸 Spanish' },
  { value: 'english', label: '🇬🇧 English' },
  { value: 'chinese', label: '🇨🇳 Chinese' },
];

const CEFR_LEVELS: { value: CEFRLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Levels' },
  { value: 'A1.1', label: 'A1.1' },
  { value: 'A1.2', label: 'A1.2' },
  { value: 'A2.1', label: 'A2.1' },
  { value: 'A2.2', label: 'A2.2' },
  { value: 'B1.1', label: 'B1.1' },
  { value: 'B1.2', label: 'B1.2' },
  { value: 'B2.1', label: 'B2.1' },
  { value: 'B2.2', label: 'B2.2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(secs?: number): string {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ─────────────────────────────────────────────
// Session Card
// ─────────────────────────────────────────────
const SessionCard: React.FC<{
  session: ReviewSession;
  onStudy: () => void;
  onExport: () => void;
  onDelete: () => void;
}> = ({ session, onStudy, onExport, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white truncate">
              {session.lessonTopic ?? session.lessonId}
            </span>
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full shrink-0">
              {session.language} · {session.level}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
            <span>📅 {formatDate(session.date)}</span>
            {session.tutorName && <span>👤 {session.tutorName}</span>}
            {session.durationSeconds && <span>⏱ {formatDuration(session.durationSeconds)}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>🃏 {session.cardCount} cards</span>
        {session.flaggedCount > 0 && (
          <span>🚩 {session.flaggedCount} flagged</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onStudy}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors font-medium"
        >
          ▶ Study
        </button>
        <button
          onClick={onExport}
          className="bg-green-700 hover:bg-green-600 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          title="Export as PDF"
        >
          📥
        </button>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 text-sm px-3 py-2 rounded-lg transition-colors"
            title="Delete session"
          >
            🗑️
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={() => { onDelete(); setShowConfirm(false); }}
              className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-2 rounded-lg transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="bg-gray-700 text-gray-300 text-xs px-2 py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ReviewHistory
// ─────────────────────────────────────────────
export const ReviewHistory: React.FC<ReviewHistoryProps> = ({ onBack }) => {
  const [langFilter, setLangFilter] = useState<LanguageCode | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<CEFRLevel | 'all'>('all');
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [studyingSession, setStudyingSession] = useState<ReviewSession | null>(null);

  const loadSessions = () => {
    const filtered = getFilteredHistory(
      langFilter === 'all' ? undefined : langFilter,
      levelFilter === 'all' ? undefined : levelFilter
    );
    setSessions(filtered);
  };

  useEffect(() => {
    loadSessions();
  }, [langFilter, levelFilter]);

  const handleDelete = (sessionId: string) => {
    deleteFromHistory(sessionId);
    loadSessions();
  };

  // Flashcard data for study mode
  const studyFlashcards = useMemo(() => {
    if (!studyingSession) return [];
    return studyingSession.cards.map(c => ({
      term: c.title,
      translation: c.body,
      explanation: c.example ?? '',
      category: c.type as any,
    }));
  }, [studyingSession]);

  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Top bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-gray-800"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold flex-1">📖 Review History</h1>
          {sessions.length > 0 && (
            <button
              onClick={() => exportHistoryToPDF(sessions)}
              className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              📥 Export All
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="px-4 py-3 bg-gray-900/60 border-b border-gray-800 flex flex-wrap gap-2 items-center">
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value as LanguageCode | 'all')}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
          >
            {LANGUAGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as CEFRLevel | 'all')}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
          >
            {CEFR_LEVELS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-auto">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Session list */}
        <div className="flex-1 p-4 space-y-3 max-w-2xl w-full mx-auto">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              <div className="text-6xl mb-4 opacity-30">📖</div>
              <p className="font-medium text-gray-400">No sessions yet</p>
              <p className="text-sm mt-1 text-gray-600">Completed session cards will appear here</p>
            </div>
          ) : (
            sessions.map(session => (
              <SessionCard
                key={session.sessionId}
                session={session}
                onStudy={() => setStudyingSession(session)}
                onExport={() => exportSessionToPDF(session)}
                onDelete={() => handleDelete(session.sessionId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Flashcard study modal */}
      {studyingSession && studyFlashcards.length > 0 && (
        <FlashcardReview
          notes={studyFlashcards}
          onClose={() => setStudyingSession(null)}
        />
      )}
    </>
  );
};
