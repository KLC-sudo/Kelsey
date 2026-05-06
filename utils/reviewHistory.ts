/**
 * Review History Utility
 *
 * Persists, queries, and exports past session cards for student review.
 * Currently backed by localStorage. Structured for backend migration.
 */

import type { ReviewSession, BoardCard } from '../types/board';
import type { LanguageCode, CEFRLevel } from '../types/lesson';
import { quickExportNotes } from './pdfExport';

const STORAGE_KEY = 'kelsey_review_history';

// ─────────────────────────────────────────────
// Internal read/write helpers
// ─────────────────────────────────────────────

function readHistory(): ReviewSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReviewSession[];
  } catch {
    return [];
  }
}

import { loadAccount, getAuthState } from './account';

function writeHistory(sessions: ReviewSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    // sync latest session to backend
    const account = loadAccount();
    if (account && !getAuthState().isGuest && sessions.length > 0) {
        const latest = sessions[0];
        fetch(`/api/users/${account.id}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${account.id}`
            },
            body: JSON.stringify(latest)
        }).catch(e => console.error('Failed to sync history', e));
    }
  } catch (e) {
    console.error('[ReviewHistory] Failed to persist:', e);
  }
}

// ─────────────────────────────────────────────
// Save a completed session
// Only cards that were on the board at session end (not retracted) are saved.
// ─────────────────────────────────────────────

export function saveSessionToHistory(session: ReviewSession): void {
  const history = readHistory();
  // Avoid duplicates
  const existing = history.findIndex(s => s.sessionId === session.sessionId);
  if (existing !== -1) {
    history[existing] = session;
  } else {
    history.unshift(session); // newest first
  }
  writeHistory(history);
}

// ─────────────────────────────────────────────
// Build a ReviewSession from live board state
// Call this when session ends
// ─────────────────────────────────────────────

export function buildReviewSession(
  sessionId: string,
  lessonId: string,
  lessonTopic: string,
  language: LanguageCode,
  level: CEFRLevel,
  boardCards: BoardCard[],  // current board state (only active/flagged)
  sessionStartTime: number,
  tutorName?: string,
  studentAccountId?: string,
): ReviewSession {
  // Filter to only non-retracted cards
  const cards = boardCards.filter(c => c.revealState !== 'retracted');
  return {
    sessionId,
    lessonId,
    lessonTopic,
    language,
    level,
    date: sessionStartTime,
    durationSeconds: Math.round((Date.now() - sessionStartTime) / 1000),
    tutorName,
    studentAccountId,
    cards,
    cardCount: cards.length,
    flaggedCount: cards.filter(c => c.flagged).length,
  };
}

// ─────────────────────────────────────────────
// Get all sessions (newest first)
// ─────────────────────────────────────────────

export function getReviewHistory(): ReviewSession[] {
  return readHistory().sort((a, b) => b.date - a.date);
}

// ─────────────────────────────────────────────
// Filter sessions by language and/or level
// ─────────────────────────────────────────────

export function getFilteredHistory(
  language?: LanguageCode,
  level?: CEFRLevel
): ReviewSession[] {
  const all = readHistory();
  return all
    .filter(s => (!language || s.language === language))
    .filter(s => (!level || s.level === level))
    .sort((a, b) => b.date - a.date);
}

// ─────────────────────────────────────────────
// Get a single session by ID
// ─────────────────────────────────────────────

export function getSession(sessionId: string): ReviewSession | null {
  return readHistory().find(s => s.sessionId === sessionId) ?? null;
}

// ─────────────────────────────────────────────
// Delete a session
// ─────────────────────────────────────────────

export function deleteFromHistory(sessionId: string): void {
  const history = readHistory().filter(s => s.sessionId !== sessionId);
  writeHistory(history);
}

// ─────────────────────────────────────────────
// Export a single session as PDF
// ─────────────────────────────────────────────

export function exportSessionToPDF(session: ReviewSession): void {
  const lines = session.cards.map(card => {
    let line = `[${card.type.toUpperCase()}] ${card.title}: ${card.body}`;
    if (card.example) line += ` | e.g. "${card.example}"`;
    if (card.studentAnnotation?.text) line += ` | 📝 "${card.studentAnnotation.text}"`;
    return line;
  });
  const title = `${session.language.charAt(0).toUpperCase() + session.language.slice(1)} ${session.level} · ${session.lessonTopic ?? session.lessonId}`;
  quickExportNotes(lines, title);
}

// ─────────────────────────────────────────────
// Export multiple sessions merged into one PDF
// ─────────────────────────────────────────────

export function exportHistoryToPDF(sessions: ReviewSession[]): void {
  const lines: string[] = [];
  sessions.forEach(session => {
    lines.push(`── ${session.lessonTopic ?? session.lessonId} (${new Date(session.date).toLocaleDateString()}) ──`);
    session.cards.forEach(card => {
      let line = `  [${card.type.toUpperCase()}] ${card.title}: ${card.body}`;
      if (card.example) line += ` | e.g. "${card.example}"`;
      if (card.studentAnnotation?.text) line += ` | 📝 "${card.studentAnnotation.text}"`;
      lines.push(line);
    });
    lines.push('');
  });
  quickExportNotes(lines, 'Kelsey — Review History');
}
