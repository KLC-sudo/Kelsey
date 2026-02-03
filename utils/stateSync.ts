import { Socket } from 'socket.io-client';
import { LessonPhase } from '../types/lesson';

/**
 * State events that can be synchronized between tutor and student
 */
export type StateEvent =
    | { type: 'CHANGE_PHASE'; phase: LessonPhase }
    | { type: 'ADD_WHITEBOARD_NOTE'; note: string }
    | { type: 'REMOVE_WHITEBOARD_NOTE'; index: number }
    | { type: 'CLEAR_WHITEBOARD' }
    | { type: 'TRIGGER_FLASHCARD'; noteIndex: number }
    | { type: 'UPDATE_LESSON'; lessonId: string }
    | { type: 'END_SESSION' };

/**
 * Manages state synchronization between tutor and student
 */
export class StateSyncManager {
    private listeners: Map<string, ((event: StateEvent) => void)[]> = new Map();

    constructor(
        private socket: Socket,
        private roomId: string,
        private isTutor: boolean
    ) {
        this.setupSocketListeners();
    }

    /**
     * Setup Socket.io listeners for state updates
     */
    private setupSocketListeners(): void {
        this.socket.on('state-update', ({ stateEvent }: { stateEvent: StateEvent }) => {
            console.log('🔄 Received state update:', stateEvent.type);
            this.notifyListeners(stateEvent);
        });
    }

    /**
     * Send state update (tutor only)
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
     * Subscribe to state updates
     */
    onStateUpdate(eventType: StateEvent['type'] | 'ALL', callback: (event: StateEvent) => void): void {
        const key = eventType;
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key)!.push(callback);
    }

    /**
     * Unsubscribe from state updates
     */
    offStateUpdate(eventType: StateEvent['type'] | 'ALL', callback: (event: StateEvent) => void): void {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners of a state event
     */
    private notifyListeners(event: StateEvent): void {
        // Notify type-specific listeners
        const typeListeners = this.listeners.get(event.type) || [];
        typeListeners.forEach((callback) => callback(event));

        // Notify 'ALL' listeners
        const allListeners = this.listeners.get('ALL') || [];
        allListeners.forEach((callback) => callback(event));
    }

    /**
     * Cleanup
     */
    disconnect(): void {
        this.listeners.clear();
        this.socket.off('state-update');
    }
}
