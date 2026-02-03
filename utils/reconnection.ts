// Reconnection utility functions
export function getReconnectDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
    return Math.min(1000 * Math.pow(2, attempt), 10000);
}

export function shouldReconnect(closeCode: number, closeReason: string): boolean {
    // Don't reconnect on normal closure or user-initiated close
    if (closeCode === 1000 || closeCode === 1001) {
        return false;
    }

    // Don't reconnect on authentication errors
    if (closeReason.includes('authentication') || closeReason.includes('unauthorized')) {
        return false;
    }

    // Reconnect on all other errors
    return true;
}

export interface ReconnectionState {
    isReconnecting: boolean;
    attempt: number;
    maxAttempts: number;
    nextRetryIn: number;
}
