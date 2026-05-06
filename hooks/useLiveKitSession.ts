import { useState, useCallback } from 'react';

export function useLiveKitSession(roomId: string, accountId: string) {
    const [token, setToken] = useState<string | null>(null);
    const [wsUrl, setWsUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const connect = useCallback(async () => {
        try {
            const res = await fetch(`/api/livekit/token?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${accountId}` }
            });
            if (!res.ok) throw new Error('Failed to get token');
            
            const data = await res.json();
            setToken(data.token);
            setWsUrl(data.wsUrl);
            setError(null);
        } catch (err) {
            console.error('Error connecting to LiveKit:', err);
            setError('Failed to connect to media server');
        }
    }, [roomId, accountId]);

    const disconnect = useCallback(() => {
        setToken(null);
        setWsUrl(null);
    }, []);

    return { token, wsUrl, error, connect, disconnect };
}
