import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

export interface UseSignalingOptions {
    roomId: string;
    isTutor: boolean;
    onPeerJoined?: () => void;
    onPeerLeft?: () => void;
}

export const useWebRTC = ({ roomId, isTutor, onPeerJoined, onPeerLeft }: UseSignalingOptions) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
    const [error, setError] = useState<string | null>(null);

    const onPeerJoinedRef = useRef(onPeerJoined);
    const onPeerLeftRef = useRef(onPeerLeft);

    useEffect(() => {
        onPeerJoinedRef.current = onPeerJoined;
        onPeerLeftRef.current = onPeerLeft;
    }, [onPeerJoined, onPeerLeft]);

    /**
     * Initialize Socket.io connection
     */
    useEffect(() => {
        const newSocket = io(SIGNALING_SERVER_URL, {
            transports: ['websocket'],
            reconnection: true,
        });

        newSocket.on('connect', () => {
            console.log('✅ Connected to signaling server');
            setSocket(newSocket);
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ Signaling server connection error:', err);
            setError('Failed to connect to signaling server');
        });

        newSocket.on('peer-joined', () => {
            console.log('👥 Peer joined the room');
            onPeerJoinedRef.current?.();
        });

        newSocket.on('peer-left', ({ reason }) => {
            console.log('👋 Peer left:', reason);
            setConnectionState('disconnected');
            onPeerLeftRef.current?.();
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const connectAttemptsRef = useRef(0);
    const MAX_CONNECT_ATTEMPTS = 20;

    const connect = useCallback(async () => {
        if (!roomId) {
            console.warn('⚠️ Cannot connect: roomId missing');
            return;
        }

        if (!socket) {
            if (connectAttemptsRef.current >= MAX_CONNECT_ATTEMPTS) {
                console.error('❌ Signaling server unreachable');
                setError('Cannot reach signaling server');
                connectAttemptsRef.current = 0;
                return;
            }
            connectAttemptsRef.current += 1;
            setTimeout(connect, 500);
            return;
        }

        connectAttemptsRef.current = 0;
        setConnectionState('connecting');

        if (isTutor) {
            console.log('📝 Tutor attempting to create room:', roomId);
            socket.emit('create-room', { roomId, lessonId: null });

            socket.once('room-created', () => {
                console.log('✅ Room successfully registered');
                setConnectionState('connected');
            });

            socket.once('create-error', ({ error }) => {
                console.error('❌ Server failed to create room:', error);
                setError(error);
                setConnectionState('failed');
            });
        } else {
            console.log('🔍 Student attempting to join room:', roomId);
            socket.emit('join-room', { roomId });

            socket.once('room-joined', () => {
                console.log('✅ Successfully joined room');
                setConnectionState('connected');
            });

            socket.once('join-error', ({ error }) => {
                console.error('❌ Server failed to join room:', error);
                setError(error);
                setConnectionState('failed');
            });
        }
    }, [socket, roomId, isTutor]);

    const disconnect = useCallback(() => {
        setConnectionState('disconnected');
        if (socket) {
            socket.emit('leave-room', { roomId });
            // Don't disconnect the socket entirely, just leave the room, as the socket might be reused.
            // Actually, for simplicity we can just rely on standard socket teardown.
        }
    }, [socket, roomId]);

    return {
        connect,
        disconnect,
        connectionState,
        error,
        socket,
        // Mock remote/local stream variables to avoid breaking App.tsx before we update it
        remoteStream: null as any,
        localStream: null as any,
        audioRef: useRef<HTMLAudioElement | null>(null),
    };
};
