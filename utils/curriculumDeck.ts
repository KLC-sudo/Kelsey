/**
 * Curriculum Deck Utility
 *
 * Builds and manages the tutor's card queue from a loaded lesson JSON.
 * All cards are derived from the existing lesson structure — no new content
 * is created here. The deck respects phase ordering but allows random access.
 */

import type { Lesson, VocabularyItem, GrammarConcept, Exercise, LessonPhase } from '../types/lesson';
import type { BoardCard, CardType, CurriculumDeck } from '../types/board';
import type { LanguageCode, CEFRLevel } from '../types/lesson';

// ─────────────────────────────────────────────
// Phase ordering (determines default card queue order)
// ─────────────────────────────────────────────
const PHASE_ORDER: LessonPhase[] = [
  'introduction',
  'grammar',
  'vocabulary',
  'practice',
  'assessment',
  'review',
];

// ─────────────────────────────────────────────
// Build a full deck from a lesson
// ─────────────────────────────────────────────

export function buildDeckFromLesson(lesson: Lesson, sessionId: string): CurriculumDeck {
  const meta = {
    sessionId,
    lessonId: lesson.id,
    language: lesson.language as LanguageCode,
    level: lesson.level as CEFRLevel,
  };

  const grammarCards = lesson.grammarFocus.flatMap((concept, i) =>
    grammarToCards(concept, 'grammar', meta, i)
  );

  const vocabCards = lesson.vocabulary.map((item, i) =>
    vocabToCard(item, 'vocabulary', meta, i)
  );

  // Map exercises to phases and generate cards
  const exerciseCards = lesson.exercises.map((ex, i) =>
    exerciseToCard(ex, meta, i)
  );

  // Merge all and sort by canonical phase order
  const allCards: BoardCard[] = [
    ...grammarCards,
    ...vocabCards,
    ...exerciseCards,
  ].sort((a, b) => {
    const ai = PHASE_ORDER.indexOf(a.phase);
    const bi = PHASE_ORDER.indexOf(b.phase);
    return ai - bi;
  });

  return {
    lessonId: lesson.id,
    language: lesson.language as LanguageCode,
    level: lesson.level as CEFRLevel,
    totalCards: allCards.length,
    cards: allCards,
    sentCardIds: [],
  };
}

// ─────────────────────────────────────────────
// Convert a VocabularyItem → BoardCard
// ─────────────────────────────────────────────

function vocabToCard(
  item: VocabularyItem,
  phase: LessonPhase,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  index: number
): BoardCard {
  return {
    id: `${meta.lessonId}-card-vocab-${index}`,
    type: 'vocabulary',
    phase,
    title: item.target,
    body: `${item.translation} · ${item.partOfSpeech}`,
    example: item.example,
    exampleTranslation: item.exampleTranslation,
    teachingNote: undefined,
    suggestedDuration: 60,
    revealState: 'active',
    revealedAt: 0,
    flagged: false,
    sourceId: `${meta.lessonId}-vocab-${index}`,
    ...meta,
  };
}

// ─────────────────────────────────────────────
// Convert a GrammarConcept → one or more BoardCards
// Returns multiple cards: one overview card + one card per example
// ─────────────────────────────────────────────

function grammarToCards(
  concept: GrammarConcept,
  phase: LessonPhase,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  index: number
): BoardCard[] {
  const cards: BoardCard[] = [];

  // Overview card
  cards.push({
    id: `${meta.lessonId}-card-grammar-${index}`,
    type: 'grammar',
    phase,
    title: concept.name,
    body: concept.explanation,
    example: concept.examples[0] ?? undefined,
    teachingNote: concept.commonMistakes?.join(' / '),
    suggestedDuration: 120,
    revealState: 'active',
    revealedAt: 0,
    flagged: false,
    sourceId: `${meta.lessonId}-grammar-${index}`,
    ...meta,
  });

  // Additional example cards (one per extra example)
  concept.examples.slice(1).forEach((ex, ei) => {
    cards.push({
      id: `${meta.lessonId}-card-grammar-${index}-ex-${ei}`,
      type: 'grammar',
      phase,
      title: `${concept.name} — Example ${ei + 2}`,
      body: ex,
      suggestedDuration: 60,
      revealState: 'active',
      revealedAt: 0,
      flagged: false,
      sourceId: `${meta.lessonId}-grammar-${index}-ex-${ei}`,
      ...meta,
    });
  });

  return cards;
}

// ─────────────────────────────────────────────
// Convert an Exercise → BoardCard
// ─────────────────────────────────────────────

function exerciseToCard(
  exercise: Exercise,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  index: number
): BoardCard {
  const typeMap: Record<string, CardType> = {
    'dialog': 'exercise',
    'roleplay': 'exercise',
    'grammar-drill': 'grammar',
    'vocabulary': 'vocabulary',
    'dictation': 'exercise',
    'comprehension': 'exercise',
  };

  return {
    id: `${meta.lessonId}-card-ex-${index}`,
    type: typeMap[exercise.type] ?? 'exercise',
    phase: exercise.phase,
    title: `Exercise: ${exercise.type.replace('-', ' ')}`,
    body: exercise.prompt,
    example: exercise.hints?.[0],
    teachingNote: exercise.hints?.slice(1).join(' · '),
    suggestedDuration: exercise.duration ?? 180,
    revealState: 'active',
    revealedAt: 0,
    flagged: false,
    sourceId: exercise.id,
    ...meta,
  };
}

// ─────────────────────────────────────────────
// Create a freeform custom card (tutor types during session)
// ─────────────────────────────────────────────

export function createCustomCard(
  title: string,
  body: string,
  currentPhase: LessonPhase,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel }
): BoardCard {
  return {
    id: `${meta.sessionId}-custom-${Date.now()}`,
    type: 'custom',
    phase: currentPhase,
    title,
    body,
    revealState: 'active',
    revealedAt: 0,
    flagged: false,
    ...meta,
  };
}

// ─────────────────────────────────────────────
// Filter cards by phase
// ─────────────────────────────────────────────

export function getCardsForPhase(deck: CurriculumDeck, phase: LessonPhase): BoardCard[] {
  return deck.cards.filter(c => c.phase === phase);
}

// ─────────────────────────────────────────────
// Get next unsent card (respects current phase at top of queue)
// ─────────────────────────────────────────────

export function getNextCard(deck: CurriculumDeck): BoardCard | null {
  return deck.cards.find(c => !deck.sentCardIds.includes(c.id)) ?? null;
}

// ─────────────────────────────────────────────
// Mark a card as sent
// ─────────────────────────────────────────────

export function markCardSent(deck: CurriculumDeck, cardId: string): CurriculumDeck {
  if (deck.sentCardIds.includes(cardId)) return deck;
  return { ...deck, sentCardIds: [...deck.sentCardIds, cardId] };
}

// ─────────────────────────────────────────────
// Mark a card as unsent (after retraction)
// ─────────────────────────────────────────────

export function markCardUnsent(deck: CurriculumDeck, cardId: string): CurriculumDeck {
  return { ...deck, sentCardIds: deck.sentCardIds.filter(id => id !== cardId) };
}

// ─────────────────────────────────────────────
// Get unsent cards (remaining queue)
// ─────────────────────────────────────────────

export function getUnsentCards(deck: CurriculumDeck): BoardCard[] {
  return deck.cards.filter(c => !deck.sentCardIds.includes(c.id));
}

// ─────────────────────────────────────────────
// Get sent cards (for tutor's "Sent" list)
// ─────────────────────────────────────────────

export function getSentCards(deck: CurriculumDeck): BoardCard[] {
  return deck.cards.filter(c => deck.sentCardIds.includes(c.id));
}
