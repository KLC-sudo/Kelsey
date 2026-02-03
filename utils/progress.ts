// Progress tracking utilities using LocalStorage

import { UserProgress, LessonAssessment, SessionState } from '../types/lesson';

const STORAGE_KEYS = {
    PROGRESS: 'languageTutor_userProgress',
    SESSION_STATE: 'languageTutor_sessionState',
} as const;

/**
 * Get user progress from LocalStorage
 */
export function getUserProgress(): UserProgress | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading user progress:', error);
        return null;
    }
}

/**
 * Save user progress to LocalStorage
 */
export function saveUserProgress(progress: UserProgress): void {
    try {
        progress.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
    } catch (error) {
        console.error('Error saving user progress:', error);
    }
}

/**
 * Initialize new user progress
 */
export function initializeProgress(
    language: 'german' | 'french' | 'spanish',
    instructionLanguage: 'english' | 'spanish' | 'french'
): UserProgress {
    const progress: UserProgress = {
        language,
        currentLevel: 'A1.1',
        currentLesson: 1,
        completedLessons: [],
        assessments: {},
        totalStudyTime: 0,
        lessonsCompleted: 0,
        averageScore: 0,
        instructionLanguage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    saveUserProgress(progress);
    return progress;
}

/**
 * Mark a lesson as completed
 */
export function completeLesson(
    lessonId: string,
    assessment: LessonAssessment
): void {
    const progress = getUserProgress();
    if (!progress) return;

    // Add to completed lessons
    if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
        progress.lessonsCompleted++;
    }

    // Save assessment
    progress.assessments[lessonId] = assessment;

    // Update average score
    const scores = Object.values(progress.assessments).map(a => a.score);
    progress.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Advance to next lesson if this was the current one
    const [, level, lessonNum] = lessonId.split('-');
    if (level === progress.currentLevel && parseInt(lessonNum) === progress.currentLesson) {
        progress.currentLesson++;

        // Check if we need to advance level
        if (progress.currentLesson > 10) {
            progress.currentLesson = 1;
            // Advance level (A1.1 -> A1.2 -> A2.1, etc.)
            const levelMap: Record<string, string> = {
                'A1.1': 'A1.2',
                'A1.2': 'A2.1',
                'A2.1': 'A2.2',
                'A2.2': 'B1.1',
                'B1.1': 'B1.2',
                'B1.2': 'B2.1',
                'B2.1': 'B2.2',
                'B2.2': 'C1',
                'C1': 'C2',
            };
            progress.currentLevel = (levelMap[progress.currentLevel] || 'C2') as any;
        }
    }

    saveUserProgress(progress);
}

/**
 * Add study time
 */
export function addStudyTime(minutes: number): void {
    const progress = getUserProgress();
    if (!progress) return;

    progress.totalStudyTime += minutes;
    progress.lastStudied = Date.now();
    saveUserProgress(progress);
}

/**
 * Check if a lesson is unlocked
 */
export function isLessonUnlocked(lessonId: string): boolean {
    const progress = getUserProgress();
    if (!progress) return false;

    const [, level, lessonNum] = lessonId.split('-');
    const num = parseInt(lessonNum);

    // First lesson is always unlocked
    if (level === 'A1.1' && num === 1) return true;

    // Check if previous lesson is completed
    const prevLessonId = `${progress.language}-${level}-${num - 1}`;
    return progress.completedLessons.includes(prevLessonId);
}

/**
 * Save session state for reconnection
 */
export function saveSessionState(state: SessionState): void {
    try {
        localStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving session state:', error);
    }
}

/**
 * Get saved session state
 */
export function getSessionState(): SessionState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SESSION_STATE);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading session state:', error);
        return null;
    }
}

/**
 * Clear session state (after successful completion or manual stop)
 */
export function clearSessionState(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSION_STATE);
}

/**
 * Get progress statistics
 */
export function getProgressStats() {
    const progress = getUserProgress();
    if (!progress) return null;

    return {
        level: progress.currentLevel,
        lessonsCompleted: progress.lessonsCompleted,
        totalHours: Math.round(progress.totalStudyTime / 60 * 10) / 10,
        averageScore: Math.round(progress.averageScore),
        currentStreak: calculateStreak(progress),
    };
}

/**
 * Calculate study streak (days)
 */
function calculateStreak(progress: UserProgress): number {
    if (!progress.lastStudied) return 0;

    const now = Date.now();
    const lastStudied = progress.lastStudied;
    const daysSince = Math.floor((now - lastStudied) / (1000 * 60 * 60 * 24));

    // If studied today or yesterday, streak continues
    if (daysSince <= 1) {
        // TODO: Implement full streak tracking
        return 1;
    }

    return 0;
}
