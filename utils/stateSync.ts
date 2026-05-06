import { Socket } from 'socket.io-client';
import { LessonPhase } from '../types/lesson';
import type { BoardCard } from '../types/board';

/**
 * Student-to-tutor signal events (bidirectional channel)
 * These travel on the 'student-signal' socket event, not 'state-update'.
 */
export type StudentSignal =
    | { type: 'STUDENT_FLAG_CARD'; cardId: string; annotationText?: string }
    | { type: 'STUDENT_UNFLAG_CARD'; cardId: string };

/**
 * State events — tutor-to-student (via 'state-update' socket event)
 */
export type StateEvent =
    // ── Board card events (new) ──
    | { type: 'PUSH_CARD'; card: BoardCard }
    | { type: 'RETRACT_CARD'; cardId: string }
    | { type: 'CLEAR_BOARD' }
    // ── Phase / lesson control ──
    | { type: 'CHANGE_PHASE'; phase: LessonPhase }
    | { type: 'UPDATE_LESSON'; lessonId: string }
    | { type: 'END_SESSION' }
    // ── Legacy whiteboard events (kept for backwards compat) ──
    | { type: 'ADD_WHITEBOARD_NOTE'; note: string }
    | { type: 'REMOVE_WHITEBOARD_NOTE'; index: number }
    | { type: 'CLEAR_WHITEBOARD' }
    | { type: 'TRIGGER_FLASHCARD'; noteIndex: number };

/**
 * Manages state synchronization between tutor and student.
 *
 * Tutor → Student: via 'state-update' (StateEvent)
 * Student → Tutor: via 'student-signal' (StudentSignal)
 */
export class StateSyncManager {
    private listeners: Map<string, ((event: StateEvent) => void)[]> = new Map();
    private studentSignalListeners: Map<string, ((signal: StudentSignal) => void)[]> = new Map();

    constructor(
        private socket: Socket,
        private roomId: string,
        private isTutor: boolean
    ) {
        this.setupSocketListeners();
    }

    /**
     * Setup Socket.io listeners for state updates and student signals
     */
    private setupSocketListeners(): void {
        // Tutor → student state events
        this.socket.on('state-update', ({ stateEvent }: { stateEvent: StateEvent }) => {
            console.log('🔄 Received state update:', stateEvent.type);
            this.notifyListeners(stateEvent);
        });

        // Student → tutor signals (tutor side only)
        if (this.isTutor) {
            this.socket.on('student-signal', ({ signal }: { signal: StudentSignal }) => {
                console.log('🚩 Received student signal:', signal.type);
                this.notifyStudentSignalListeners(signal);
            });
        }
    }

    /**
     * Send state update to student (tutor only)
     */
    sendStateUpdate(event: StateEvent): void {
        if (!this.isTutor) {
            console.warn('⚠️ Only tutors can send state updates');
            return;
        }
        console.log('📤 Sending state update:', event.type);
        this.socket.emit('state-update', {
            roomId: this.roomId,
            stateEvent: event,
        });
        // Also apply locally for tutor
        this.notifyListeners(event);
    }

    /**
     * Send a signal from student to tutor (student only)
     */
    sendStudentSignal(signal: StudentSignal): void {
        if (this.isTutor) {
            console.warn('⚠️ Only students can send student signals');
            return;
        }
        console.log('🚩 Sending student signal:', signal.type);
        this.socket.emit('student-signal', {
            roomId: this.roomId,
            signal,
        });
    }

    /**
     * Subscribe to tutor→student state updates
     */
    onStateUpdate(eventType: StateEvent['type'] | 'ALL', callback: (event: StateEvent) => void): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(callback);
    }

    /**
     * Subscribe to student→tutor signals (tutor only)
     */
    onStudentSignal(signalType: StudentSignal['type'] | 'ALL', callback: (signal: StudentSignal) => void): void {
        if (!this.studentSignalListeners.has(signalType)) {
            this.studentSignalListeners.set(signalType, []);
        }
        this.studentSignalListeners.get(signalType)!.push(callback);
    }

    /**
     * Unsubscribe from state updates
     */
    offStateUpdate(eventType: StateEvent['type'] | 'ALL', callback: (event: StateEvent) => void): void {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) listeners.splice(index, 1);
        }
    }

    private notifyListeners(event: StateEvent): void {
        (this.listeners.get(event.type) || []).forEach(cb => cb(event));
        (this.listeners.get('ALL') || []).forEach(cb => cb(event));
    }

    private notifyStudentSignalListeners(signal: StudentSignal): void {
        (this.studentSignalListeners.get(signal.type) || []).forEach(cb => cb(signal));
        (this.studentSignalListeners.get('ALL') || []).forEach(cb => cb(signal));
    }

    disconnect(): void {
        this.listeners.clear();
        this.studentSignalListeners.clear();
        this.socket.off('state-update');
        this.socket.off('student-signal');
    }
}
