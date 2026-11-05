/**
 * Curriculum Deck Utility
 *
 * Builds and manages the tutor's card queue from a loaded lesson JSON.
 * All cards are derived from the existing lesson structure — no new content
 * is created here. The deck respects phase ordering but allows random access.
 */

import type { Lesson, VocabularyItem, GrammarConcept, Exercise, LessonPhase } from '../types/lesson';
import type { BoardCard, CardType, CurriculumDeck, ExerciseData } from '../types/board';
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

// ─────────────────────────────────────────────
// Interactive Exercise Generation (Phase 2)
// Derives structured exercises from lesson vocabulary & grammar
// ─────────────────────────────────────────────

/**
 * Build multiple-choice vocabulary cards from lesson vocabulary.
 * Shuffles distractors from other vocab items.
 */
export function buildVocabQuizCards(
  lesson: Lesson,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  count: number = 5
): BoardCard[] {
  const vocab = lesson.vocabulary;
  if (vocab.length < 4) return [];

  const shuffled = [...vocab].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((item, i) => {
    // Pick 3 random distractors (not the correct answer)
    const distractors = vocab
      .filter(v => v.target !== item.target)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(v => v.translation);

    const options = [...distractors, item.translation].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(item.translation);

    return {
      id: `${meta.lessonId}-quiz-vocab-${i}`,
      type: 'exercise' as CardType,
      phase: 'assessment' as LessonPhase,
      title: `What does "${item.target}" mean?`,
      body: `Select the correct translation for: ${item.target}`,
      exerciseData: {
        kind: 'multiple-choice' as const,
        question: `What does "${item.target}" mean?`,
        options,
        correctIndex,
        hint: item.example ? `Hint: "${item.example}"` : item.partOfSpeech,
        revealAfterAttempts: 2,
      },
      suggestedDuration: 30,
      revealState: 'active' as const,
      revealedAt: 0,
      flagged: false,
      sourceId: item.target,
      ...meta,
    };
  });
}

/**
 * Build fill-blank cards from grammar examples.
 * Picks a word from the example to blank out.
 */
export function buildGrammarFillBlankCards(
  lesson: Lesson,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  count: number = 3
): BoardCard[] {
  const examples = lesson.grammarFocus
    .flatMap(g => g.examples)
    .filter(e => e && e.split(/\s+/).length >= 3);

  if (examples.length === 0) return [];

  const shuffled = [...examples].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((example, i) => {
    const words = example.split(/\s+/);
    // Pick a content word (not first or last, length > 2) to blank
    let blankIndex = -1;
    for (let j = 1; j < words.length - 1; j++) {
      if (words[j].replace(/[.,!?]/g, '').length > 2) {
        blankIndex = j;
        break;
      }
    }
    if (blankIndex === -1) blankIndex = Math.min(1, words.length - 1);

    const originalWord = words[blankIndex].replace(/[.,!?]/g, '');
    const blanked = words.map((w, j) => (j === blankIndex ? '____' : w)).join(' ');

    return {
      id: `${meta.lessonId}-quiz-blank-${i}`,
      type: 'exercise' as CardType,
      phase: 'practice' as LessonPhase,
      title: 'Fill in the blank',
      body: blanked,
      exerciseData: {
        kind: 'fill-blank' as const,
        question: `Fill in the missing word: "${blanked}"`,
        acceptedAnswers: [originalWord.toLowerCase()],
        hint: `The word has ${originalWord.length} letters and starts with "${originalWord[0]}"`,
        revealAfterAttempts: 3,
      },
      suggestedDuration: 45,
      revealState: 'active' as const,
      revealedAt: 0,
      flagged: false,
      ...meta,
    };
  });
}

/**
 * Build text-answer cards from vocabulary examples.
 * Student types the translation.
 */
export function buildTranslationCards(
  lesson: Lesson,
  meta: { sessionId: string; lessonId: string; language: LanguageCode; level: CEFRLevel },
  count: number = 3
): BoardCard[] {
  const withExamples = lesson.vocabulary.filter(v => v.example && v.exampleTranslation);
  if (withExamples.length === 0) return [];

  const shuffled = [...withExamples].sort(() => Math.random() - 0.5).slice(0, count);

  return shuffled.map((item, i) => ({
    id: `${meta.lessonId}-quiz-trans-${i}`,
    type: 'exercise' as CardType,
    phase: 'assessment' as LessonPhase,
    title: 'Translate',
    body: `Translate: "${item.example}"`,
    exerciseData: {
      kind: 'text-answer' as const,
      question: `Translate this sentence: "${item.example}"`,
      acceptedAnswers: [
        (item.exampleTranslation ?? '').toLowerCase().trim(),
      ],
      hint: `Key word: ${item.target} (${item.translation})`,
      revealAfterAttempts: 2,
    },
    suggestedDuration: 60,
    revealState: 'active' as const,
    revealedAt: 0,
    flagged: false,
    sourceId: item.target,
    ...meta,
  }));
}

/**
 * Validate an exercise answer.
 * Returns { correct, feedback } for immediate display.
 */
export function validateExerciseAnswer(
  exerciseData: ExerciseData,
  answer: string
): { correct: boolean; feedback: string } {
  const trimmed = answer.trim();

  if (!trimmed) {
    return { correct: false, feedback: 'Please enter an answer.' };
  }

  if (exerciseData.kind === 'multiple-choice') {
    // Multiple choice is handled by option click, but support string too
    const idx = exerciseData.options?.indexOf(trimmed);
    if (idx !== undefined && idx === exerciseData.correctIndex) {
      return { correct: true, feedback: '✅ Correct!' };
    }
    return { correct: false, feedback: '❌ Not quite. Try again.' };
  }

  // fill-blank and text-answer: case-insensitive comparison
  const normalized = trimmed.toLowerCase().replace(/[.!?]+$/, '');
  const accepted = (exerciseData.acceptedAnswers ?? []).map(a =>
    a.toLowerCase().replace(/[.!?]+$/, '').trim()
  );

  if (accepted.includes(normalized)) {
    return { correct: true, feedback: '✅ Correct!' };
  }

  // Partial match for translations (check if core words overlap)
  if (exerciseData.kind === 'text-answer') {
    const answerWords = normalized.split(/\s+/).filter(w => w.length > 2);
    const matched = answerWords.some(w => accepted.some(a => a.includes(w)));
    if (matched && answerWords.length >= 2) {
      return { correct: true, feedback: '✅ Correct!' };
    }
  }

  return { correct: false, feedback: '❌ Not quite. Try again.' };
}
