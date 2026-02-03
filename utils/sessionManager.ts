// Session management and auto-reconnection logic

import type { ClassSession, ClassSegment, SessionState, Lesson, LessonPhase } from '../types/lesson';
import { saveSessionState, getSessionState, clearSessionState } from './progress';

/**
 * Create a new class session with 2-hour structure
 */
export function createClassSession(lessonId: string): ClassSession {
    return {
        id: `session-${Date.now()}`,
        lessonId,
        startTime: Date.now(),
        totalDuration: 120, // 2 hours
        segments: [
            { type: 'teaching', duration: 50, completed: false },
            { type: 'break', duration: 10, completed: false },
            { type: 'teaching', duration: 50, completed: false },
            { type: 'break', duration: 10, completed: false },
            { type: 'teaching', duration: 20, completed: false }
        ],
        currentSegment: 0,
        completedPhases: [],
        completedExercises: [],
        currentPhase: 'introduction',
        reconnectCount: 0
    };
}

/**
 * Monitor session for timeout and trigger reconnection
 */
export class SessionMonitor {
    private sessionStartTime: number = 0;
    private reconnectCallback?: () => void;
    private warningCallback?: (secondsRemaining: number) => void;
    private checkInterval?: NodeJS.Timeout;

    private readonly SESSION_TIMEOUT = 12 * 60 * 1000; // 12 minutes
    private readonly WARNING_TIME = 10 * 60 * 1000;    // Warn at 10 minutes

    start(onReconnect: () => void, onWarning?: (secondsRemaining: number) => void) {
        this.sessionStartTime = Date.now();
        this.reconnectCallback = onReconnect;
        this.warningCallback = onWarning;

        // Check every 30 seconds
        this.checkInterval = setInterval(() => {
            this.checkTimeout();
        }, 30000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    }

    reset() {
        this.sessionStartTime = Date.now();
    }

    private checkTimeout() {
        const elapsed = Date.now() - this.sessionStartTime;
        const remaining = this.SESSION_TIMEOUT - elapsed;

        // Warn at 10 minutes
        if (elapsed >= this.WARNING_TIME && elapsed < this.SESSION_TIMEOUT) {
            const secondsRemaining = Math.floor(remaining / 1000);
            this.warningCallback?.(secondsRemaining);
        }

        // Trigger reconnect at 12 minutes
        if (elapsed >= this.SESSION_TIMEOUT) {
            this.reconnectCallback?.();
            this.reset();
        }
    }
}

/**
 * Save current session state for reconnection
 */
export function saveCurrentSessionState(
    session: ClassSession,
    lesson: Lesson,
    conversationContext: string
): void {
    const state: SessionState = {
        sessionId: session.id,
        lessonId: session.lessonId,
        currentPhase: session.currentPhase,
        completedObjectives: session.completedPhases,
        conversationContext,
        timestamp: Date.now(),
        resumePrompt: generateResumePrompt(session.currentPhase, conversationContext)
    };

    saveSessionState(state);
}

/**
 * Generate a natural resume prompt for the AI
 */
function generateResumePrompt(phase: LessonPhase, context: string): string {
    const prompts: Record<LessonPhase, string> = {
        introduction: `Okay, let's continue with our introduction. We were just getting started.`,
        grammar: `Alright, let's pick up where we left off with our grammar lesson. We were working on ${context}.`,
        vocabulary: `Good, let's continue building our vocabulary. We were learning about ${context}.`,
        practice: `Great, let's keep practicing. We were having a conversation about ${context}.`,
        assessment: `Okay, let's continue with the assessment. We were testing your understanding of ${context}.`,
        review: `Let's wrap up our review. We were summarizing what we learned about ${context}.`
    };

    return prompts[phase] || `Let's continue our lesson.`;
}

/**
 * Handle session reconnection
 */
export async function handleReconnection(
    currentSession: ClassSession,
    lesson: Lesson,
    conversationContext: string,
    reconnectFn: (state: SessionState) => Promise<void>
): Promise<void> {
    // Save current state
    saveCurrentSessionState(currentSession, lesson, conversationContext);

    // Show user-friendly message
    console.log('🔄 Reconnecting session...');

    // Wait briefly for user awareness
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get saved state
    const state = getSessionState();
    if (!state) {
        throw new Error('Failed to retrieve session state');
    }

    // Increment reconnect count
    currentSession.reconnectCount++;
    currentSession.lastReconnectTime = Date.now();

    // Trigger reconnection
    await reconnectFn(state);

    console.log('✅ Reconnected successfully');
}

/**
 * Check if it's time for a break
 */
export function shouldTakeBreak(session: ClassSession): boolean {
    const currentSegment = session.segments[session.currentSegment];
    if (!currentSegment) return false;

    // Check if current segment is complete
    if (currentSegment.type === 'teaching' && currentSegment.completed) {
        // Check if next segment is a break
        const nextSegment = session.segments[session.currentSegment + 1];
        return nextSegment?.type === 'break';
    }

    return false;
}

/**
 * Start a break segment
 */
export function startBreak(session: ClassSession): void {
    const currentSegment = session.segments[session.currentSegment];
    if (currentSegment) {
        currentSegment.completed = true;
        currentSegment.endTime = Date.now();
    }

    session.currentSegment++;
    const breakSegment = session.segments[session.currentSegment];
    if (breakSegment && breakSegment.type === 'break') {
        breakSegment.startTime = Date.now();
    }
}

/**
 * End a break and resume teaching
 */
export function endBreak(session: ClassSession): void {
    const breakSegment = session.segments[session.currentSegment];
    if (breakSegment && breakSegment.type === 'break') {
        breakSegment.completed = true;
        breakSegment.endTime = Date.now();
    }

    session.currentSegment++;
    const nextSegment = session.segments[session.currentSegment];
    if (nextSegment) {
        nextSegment.startTime = Date.now();
    }
}

/**
 * Calculate total study time for session
 */
export function getSessionStudyTime(session: ClassSession): number {
    return session.segments
        .filter(s => s.type === 'teaching' && s.completed)
        .reduce((total, s) => total + s.duration, 0);
}

/**
 * Check if session is complete
 */
export function isSessionComplete(session: ClassSession): boolean {
    return session.currentSegment >= session.segments.length - 1 &&
        session.segments[session.segments.length - 1].completed;
}
