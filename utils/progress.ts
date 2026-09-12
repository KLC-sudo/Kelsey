// Progress tracking utilities using LocalStorage

import { UserProgress, LessonAssessment, SessionState } from '../types/lesson';
import { loadAccount, getAuthState } from './account';
import { updateStreak } from './streakTracking';

const STORAGE_KEYS = {
    PROGRESS: 'languageTutor_userProgress',
    SESSION_STATE: 'languageTutor_sessionState',
} as const;

/**
 * Parse a lesson ID like "german-A1.1-lesson-01" into { language, level, lessonNumber }
 */
function parseLessonId(lessonId: string): { language: string; level: string; lessonNumber: number } | null {
    // Format: language-level-lesson-NN
    const match = lessonId.match(/^([a-z]+)-([A-Z]\d\.\d)-lesson-(\d+)$/);
    if (!match) return null;
    return { language: match[1], level: match[2], lessonNumber: parseInt(match[3], 10) };
}

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
 * Save user progress to LocalStorage and sync to server
 */
export function saveUserProgress(progress: UserProgress): void {
    try {
        progress.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
        
        // Sync to server in background
        const account = loadAccount();
        if (account && !getAuthState().isGuest) {
            fetch(`/api/users/${account.id}/progress`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${account.id}`
                },
                body: JSON.stringify({
                    language: progress.language,
                    level: progress.currentLevel,
                    currentLesson: progress.currentLesson,
                    completedLessons: progress.completedLessons,
                    assessments: progress.assessments,
                    totalStudyTime: progress.totalStudyTime,
                    averageScore: progress.averageScore
                })
            }).catch(e => console.error('Failed to sync progress:', e));
        }
    } catch (error) {
        console.error('Error saving user progress:', error);
    }
}

export async function syncProgressFromServer(): Promise<void> {
    const account = loadAccount();
    if (account && !getAuthState().isGuest) {
        try {
            const res = await fetch(`/api/users/${account.id}/progress`, {
                headers: { 'Authorization': `Bearer ${account.id}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    const mappedProgress: UserProgress = {
                        language: data.language,
                        currentLevel: data.level,
                        currentLesson: data.current_lesson,
                        completedLessons: data.completed_lessons,
                        assessments: data.assessments,
                        totalStudyTime: data.total_study_time,
                        lessonsCompleted: data.completed_lessons.length,
                        averageScore: data.average_score,
                        instructionLanguage: 'english', // default
                        createdAt: data.updated_at,
                        updatedAt: data.updated_at,
                    };
                    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(mappedProgress));
                }
            }
        } catch(e) {
            console.error('Failed to sync progress from server:', e);
        }
    }
}

/**
 * Initialize new user progress
 */
export function initializeProgress(
    language: 'german' | 'french' | 'spanish' | 'english' | 'chinese',
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
    const parsed = parseLessonId(lessonId);
    if (parsed && parsed.level === progress.currentLevel && parsed.lessonNumber === progress.currentLesson) {
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

    // Update streak tracking
    updateStreak();
}

/**
 * Check if a lesson is unlocked
 */
export function isLessonUnlocked(lessonId: string): boolean {
    const progress = getUserProgress();
    if (!progress) return false;

    const parsed = parseLessonId(lessonId);
    if (!parsed) return false;

    const { level, lessonNumber } = parsed;

    // First lesson is always unlocked
    if (level === 'A1.1' && lessonNumber === 1) return true;

    // Check if previous lesson is completed
    const prevLessonId = `${progress.language}-${level}-lesson-${String(lessonNumber - 1).padStart(2, '0')}`;
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
        return 1;
    }

    return 0;
}
