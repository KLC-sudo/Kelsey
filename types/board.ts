/**
 * Board & Curriculum Types
 * Used by the human tutor-to-student interactive board system.
 */

import type { LessonPhase, LanguageCode, CEFRLevel } from './lesson';

// ─────────────────────────────────────────────
// Card Types
// ─────────────────────────────────────────────

export type CardType =
  | 'vocabulary'  // single word or phrase reveal
  | 'grammar'     // grammar concept + examples
  | 'exercise'    // prompt shown to student as a task
  | 'phrase'      // key phrases / common expressions
  | 'cultural'    // cultural note / context
  | 'custom';     // tutor typed freeform during session

export type CardRevealState =
  | 'incoming'   // just arrived — animation playing
  | 'active'     // settled on the board
  | 'flagged'    // student has flagged this card
  | 'retracted'; // tutor retracted — remove from board

// ─────────────────────────────────────────────
// Student Annotation
// ─────────────────────────────────────────────

export interface StudentAnnotation {
  text: string;
  createdAt: number; // timestamp ms
}

// ─────────────────────────────────────────────
// Interactive Exercise Data (Phase 2)
// ─────────────────────────────────────────────

export type ExerciseKind = 'multiple-choice' | 'fill-blank' | 'text-answer';

export interface ExerciseData {
  kind: ExerciseKind;
  question: string;
  /** For multiple-choice: shuffled option strings */
  options?: string[];
  /** For multiple-choice: index into options[] */
  correctIndex?: number;
  /** For fill-blank/text: acceptable answers (case-insensitive, trimmed) */
  acceptedAnswers?: string[];
  /** Progressive hint shown after wrong attempt */
  hint?: string;
  /** Show the correct answer after N wrong attempts */
  revealAfterAttempts?: number;
}

// ─────────────────────────────────────────────
// Board Card — the atomic unit of content
// ─────────────────────────────────────────────

export interface BoardCard {
  id: string;
  type: CardType;
  phase: LessonPhase;

  // ── Content (sent to student) ──
  title: string;               // e.g. "Hallo" or "Verb: sein"
  body: string;                // translation or explanation
  example?: string;            // example sentence in target language
  exampleTranslation?: string; // translation of example

  // ── Tutor-only metadata (never transmitted via stateSync) ──
  teachingNote?: string;       // private tip for the tutor
  suggestedDuration?: number;  // recommended seconds on this card

  // ── Interactive exercise data (Phase 2) ──
  exerciseData?: ExerciseData;

  // ── Board state ──
  revealState: CardRevealState;
  revealedAt: number;          // timestamp when pushed to board

  // ── Student interaction ──
  flagged: boolean;
  studentAnnotation?: StudentAnnotation;

  // ── Source metadata ──
  sourceId?: string;   // original ID from lesson JSON (ex/vocab/grammar id)
  sessionId: string;   // which live session this belongs to
  lessonId: string;
  language: LanguageCode;
  level: CEFRLevel;
}

// ─────────────────────────────────────────────
// Curriculum Deck — tutor-side card queue
// ─────────────────────────────────────────────

export interface CurriculumDeck {
  lessonId: string;
  language: LanguageCode;
  level: CEFRLevel;
  totalCards: number;
  cards: BoardCard[];          // ALL cards for this lesson, phase-ordered
  sentCardIds: string[];       // IDs of cards already pushed to student
}

// ─────────────────────────────────────────────
// Review Session — persisted after session ends
// ─────────────────────────────────────────────

export interface ReviewSession {
  sessionId: string;
  lessonId: string;
  lessonTopic?: string;
  language: LanguageCode;
  level: CEFRLevel;
  date: number;                // session start timestamp
  durationSeconds?: number;    // total session length
  tutorName?: string;
  studentAccountId?: string;   // linked to UserAccount once auth is live
  cards: BoardCard[];          // all pushed cards (including retracted? — no, only active at end)
  cardCount: number;
  flaggedCount: number;
}
