import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SIGNALING_SERVER_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');

export interface UseSignalingOptions {
    roomId: string;
    isTutor: boolean;
    displayName?: string;
    onPeerJoined?: () => void;
    onPeerLeft?: () => void;
}

export const useWebRTC = ({ roomId, isTutor, displayName, onPeerJoined, onPeerLeft }: UseSignalingOptions) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const connectingRef = useRef(false);
    const connectedRoomRef = useRef<string | null>(null);
    const onPeerJoinedRef = useRef(onPeerJoined);
    const onPeerLeftRef = useRef(onPeerLeft);

    useEffect(() => {
        onPeerJoinedRef.current = onPeerJoined;
        onPeerLeftRef.current = onPeerLeft;
    }, [onPeerJoined, onPeerLeft]);

    /**
     * Initialize Socket.io connection — runs once
     */
    useEffect(() => {
        const newSocket = io(SIGNALING_SERVER_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('✅ Connected to signaling server');
            setSocket(newSocket);
            connectingRef.current = false;

            // Re-join room if we were in one before a disconnect
            if (connectedRoomRef.current) {
                const room = connectedRoomRef.current;
                if (newSocket.connected) {
                    console.log(`🔄 Rejoining room ${room} after reconnect`);
                    newSocket.emit(isTutorRef.current ? 'create-room' : 'join-room', {
                        roomId: room,
                        tutorName: displayNameRef.current,
                        studentName: displayNameRef.current,
                    });
                }
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected from signaling server:', reason);
            setConnectionState('disconnected');
            connectingRef.current = false;
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ Signaling server connection error:', err.message);
            setError('Failed to connect to signaling server');
            connectingRef.current = false;
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
            socketRef.current = null;
        };
    }, []);

    // Track current values for use inside the socket handlers
    const isTutorRef = useRef(isTutor);
    const displayNameRef = useRef(displayName);
    useEffect(() => { isTutorRef.current = isTutor; }, [isTutor]);
    useEffect(() => { displayNameRef.current = displayName; }, [displayName]);

    /**
     * Connect to a room — waits for socket, guarded against duplicate calls
     */
    const connect = useCallback(() => {
        if (!roomId) {
            console.warn('⚠️ Cannot connect: roomId missing');
            return;
        }

        // Already connected to this room
        if (connectedRoomRef.current === roomId && connectionState === 'connected') {
            return;
        }

        // Already trying to connect
        if (connectingRef.current) {
            console.log('⏳ Already connecting, skipping duplicate call');
            return;
        }

        const attemptConnection = (retries = 0) => {
            const s = socketRef.current;

            if (!s) {
                if (retries >= 30) { // 15 seconds max
                    console.error('❌ Signaling server unreachable after 30 attempts');
                    setError('Cannot reach signaling server');
                    connectingRef.current = false;
                    return;
                }
                setTimeout(() => attemptConnection(retries + 1), 500);
                return;
            }

            if (!s.connected) {
                if (retries >= 30) {
                    console.error('❌ Socket exists but not connected after 30 attempts');
                    setError('Cannot reach signaling server');
                    connectingRef.current = false;
                    return;
                }
                setTimeout(() => attemptConnection(retries + 1), 500);
                return;
            }

            // Socket is ready — proceed
            connectingRef.current = true;
            connectedRoomRef.current = roomId;
            setConnectionState('connecting');
            setError(null);

            // Remove any previous once-handlers to avoid stacking
            s.off('room-created');
            s.off('create-error');
            s.off('room-joined');
            s.off('join-error');

            if (isTutorRef.current) {
                console.log('📝 Tutor attempting to create room:', roomId);
                s.emit('create-room', { roomId, lessonId: null, tutorName: displayNameRef.current });

                s.once('room-created', () => {
                    console.log('✅ Room successfully registered');
                    setConnectionState('connected');
                    connectingRef.current = false;
                });

                s.once('create-error', ({ error: err }) => {
                    console.error('❌ Server failed to create room:', err);
                    setError(err);
                    setConnectionState('failed');
                    connectingRef.current = false;
                });
            } else {
                console.log('🔍 Student attempting to join room:', roomId);
                s.emit('join-room', { roomId, studentName: displayNameRef.current });

                s.once('room-joined', () => {
                    console.log('✅ Successfully joined room');
                    setConnectionState('connected');
                    connectingRef.current = false;
                });

                s.once('join-error', ({ error: err }) => {
                    console.error('❌ Server failed to join room:', err);
                    setError(err);
                    setConnectionState('failed');
                    connectingRef.current = false;
                });
            }
        };

        attemptConnection();
    }, [roomId, connectionState]);

    const disconnect = useCallback(() => {
        setConnectionState('disconnected');
        connectedRoomRef.current = null;
        connectingRef.current = false;
        const s = socketRef.current;
        if (s && roomId) {
            s.emit('leave-room', { roomId });
        }
    }, [roomId]);

    return {
        connect,
        disconnect,
        connectionState,
        error,
        socket,
        remoteStream: null as any,
        localStream: null as any,
        audioRef: useRef<HTMLAudioElement | null>(null),
    };
};
