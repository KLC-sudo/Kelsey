// Lesson and Class Mode Type Definitions

export type LanguageCode = 'german' | 'french' | 'spanish';
export type CEFRLevel = 'A1.1' | 'A1.2' | 'A2.1' | 'A2.2' | 'B1.1' | 'B1.2' | 'B2.1' | 'B2.2' | 'C1' | 'C2';
export type LessonPhase = 'introduction' | 'grammar' | 'vocabulary' | 'practice' | 'assessment' | 'review';
export type ExerciseType = 'dialog' | 'roleplay' | 'grammar-drill' | 'vocabulary' | 'dictation' | 'comprehension';

/**
 * Represents a single vocabulary item
 */
export interface VocabularyItem {
    target: string;           // Word in target language (e.g., "spielen")
    translation: string;      // Translation (e.g., "to play")
    partOfSpeech: string;     // e.g., "verb", "noun", "adjective"
    example?: string;         // Example sentence in target language
    exampleTranslation?: string;
    audioUrl?: string;        // Future: pre-recorded pronunciation
}

/**
 * Represents a grammar concept to be taught
 */
export interface GrammarConcept {
    name: string;             // e.g., "Present Tense - Regular Verbs"
    explanation: string;      // Brief explanation in instruction language
    examples: string[];       // Example sentences
    commonMistakes?: string[]; // What students often get wrong
}

/**
 * Represents an exercise within a lesson
 */
export interface Exercise {
    id: string;
    type: ExerciseType;
    phase: LessonPhase;
    prompt: string;           // What the AI should ask/instruct
    expectedPatterns?: RegExp[]; // For pattern matching validation
    hints?: string[];         // Progressive hints if student struggles
    duration?: number;        // Expected duration in seconds
    metadata?: {
        difficulty?: 'easy' | 'medium' | 'hard';
        focusGrammar?: string;
        focusVocab?: string[];
    };
}

/**
 * Represents a complete lesson (typically 5 hours, but broken into segments)
 */
export interface Lesson {
    id: string;               // e.g., "german-A1.1-lesson-03"
    language: LanguageCode;
    level: CEFRLevel;
    lessonNumber: number;     // 1-10

    // Content
    topic: string;
    grammarFocus: GrammarConcept[];
    vocabulary: VocabularyItem[];
    exercises: Exercise[];

    // Structure
    totalDuration: number;    // Total minutes (e.g., 300 for 5 hours)
    phases: LessonPhaseConfig[];

    // Metadata
    prerequisites?: string[]; // IDs of lessons that must be completed first
    learningObjectives: string[];

    // Generated content metadata
    generatedAt?: string;
    generatedBy?: string;
    reviewed?: boolean;
    reviewedBy?: string;
}

/**
 * Configuration for a lesson phase
 */
export interface LessonPhaseConfig {
    phase: LessonPhase;
    duration: number;         // Minutes
    objectives: string[];
    exercises: string[];      // Exercise IDs for this phase
}

/**
 * Represents a 2-hour class session (broken into segments)
 */
export interface ClassSession {
    id: string;
    lessonId: string;
    startTime: number;        // Timestamp
    totalDuration: number;    // 120 minutes

    segments: ClassSegment[];
    currentSegment: number;

    // State
    completedPhases: LessonPhase[];
    completedExercises: string[];
    currentPhase: LessonPhase;

    // Reconnection support
    lastReconnectTime?: number;
    reconnectCount: number;
}

/**
 * A segment of a class session (to handle reconnections)
 */
export interface ClassSegment {
    type: 'teaching' | 'break';
    duration: number;         // Minutes
    startTime?: number;
    endTime?: number;
    completed: boolean;
}

/**
 * Exercise attempt and result
 */
export interface ExerciseAttempt {
    exerciseId: string;
    timestamp: number;
    studentResponse?: string; // May be unreliable due to transcription
    correct: boolean;
    feedback: string;
    validationMethod: 'pattern' | 'ai' | 'hybrid';
    tokensUsed?: number;
}

/**
 * Assessment result for a lesson
 */
export interface LessonAssessment {
    lessonId: string;
    timestamp: number;
    score: number;            // 0-100
    exerciseAttempts: ExerciseAttempt[];
    strengths: string[];
    weaknesses: string[];
    recommendedReview: string[];
}

/**
 * User progress tracking
 */
export interface UserProgress {
    userId?: string;          // Future: for backend sync
    language: LanguageCode;
    currentLevel: CEFRLevel;
    currentLesson: number;

    // Completed lessons
    completedLessons: string[]; // Lesson IDs
    assessments: Record<string, LessonAssessment>;

    // Statistics
    totalStudyTime: number;   // Minutes
    lessonsCompleted: number;
    averageScore: number;

    // Preferences
    instructionLanguage: 'english' | 'spanish' | 'french';

    // Timestamps
    lastStudied?: number;
    createdAt: number;
    updatedAt: number;
}

/**
 * Session state for reconnection
 */
export interface SessionState {
    sessionId: string;
    lessonId: string;
    currentPhase: LessonPhase;
    completedObjectives: string[];
    conversationContext: string; // Last topic discussed
    timestamp: number;

    // For seamless resume
    resumePrompt?: string;    // What AI should say when resuming
}

/**
 * Lesson content generation request
 */
export interface LessonGenerationRequest {
    language: LanguageCode;
    level: CEFRLevel;
    lessonNumber: number;
    topic: string;
    grammarFocus: string[];

    // Generation parameters
    vocabularyCount?: number;  // Default: 30
    exampleCount?: number;     // Default: 10
    exerciseCount?: number;    // Default: 20
}

/**
 * Tool call for lesson progression
 */
export interface AdvanceLessonToolCall {
    currentPhase: LessonPhase;
    objectivesMet: string[];
    studentScore: number;      // 0-100
    readyForNext: boolean;
    feedback?: string;
}

/**
 * Tool call for student assessment
 */
export interface AssessStudentToolCall {
    exerciseId: string;
    correctness: number;       // 0-100
    feedback: string;
    suggestedHint?: string;
}
