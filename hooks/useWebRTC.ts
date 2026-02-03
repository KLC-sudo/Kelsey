import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WebRTCConnection, ConnectionState } from '../utils/webrtc';

const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'http://localhost:3001';

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN server when deployed
        // {
        //   urls: 'turn:your-vps-ip:3478',
        //   username: 'turnuser',
        //   credential: 'turnpassword'
        // }
    ],
};

export interface UseWebRTCOptions {
    roomId: string;
    isTutor: boolean;
    onPeerJoined?: () => void;
    onPeerLeft?: () => void;
}

export const useWebRTC = ({ roomId, isTutor, onPeerJoined, onPeerLeft }: UseWebRTCOptions) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const webrtcRef = useRef<WebRTCConnection | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Use refs for callbacks to prevent socket reconnection on every render
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
    }, []); // Empty deps - only create socket once

    /**
     * Initialize WebRTC connection when socket is ready
     */
    const initializeConnection = useCallback(async () => {
        if (!socket || !roomId) return;

        try {
            setConnectionState('connecting');

            // Create WebRTC connection
            const webrtc = new WebRTCConnection(socket, roomId, isTutor, rtcConfig);
            webrtcRef.current = webrtc;

            // Initialize local audio stream
            const stream = await webrtc.initializeLocalStream();
            setLocalStream(stream);

            // Setup callbacks
            webrtc.onRemoteStream((stream) => {
                console.log('🎵 Remote stream received');
                setRemoteStream(stream);

                // Play remote audio
                if (audioRef.current) {
                    audioRef.current.srcObject = stream;
                    audioRef.current.play().catch((err) => {
                        console.error('❌ Failed to play remote audio:', err);
                    });
                }
            });

            webrtc.onConnectionStateChange((state) => {
                setConnectionState(state);
            });

            // If tutor, create offer after student joins
            if (isTutor) {
                socket.once('peer-joined', async () => {
                    await webrtc.createOffer();
                });
            }

            setError(null);
        } catch (err) {
            console.error('❌ Failed to initialize WebRTC:', err);
            setError(err instanceof Error ? err.message : 'Failed to initialize connection');
            setConnectionState('failed');
        }
    }, [socket, roomId, isTutor]);

    /**
     * Join or create room
     */
    const connect = useCallback(async () => {
        if (!socket || !roomId) {
            console.warn('⚠️ Cannot connect: socket or roomId missing');
            return;
        }

        if (isTutor) {
            // Tutor creates room with their pre-generated room code
            socket.emit('create-room', { roomId, lessonId: null });

            socket.once('room-created', async ({ roomId: createdRoomId }) => {
                console.log('📝 Room created on server:', createdRoomId);
                await initializeConnection();
            });

            socket.once('create-error', ({ error }) => {
                console.error('❌ Failed to create room:', error);
                setError(error);
            });
        } else {
            // Student joins room
            socket.emit('join-room', { roomId });

            socket.once('room-joined', async () => {
                console.log('✅ Joined room:', roomId);
                await initializeConnection();
            });

            socket.once('join-error', ({ error }) => {
                console.error('❌ Failed to join room:', error);
                setError(error);
            });
        }
    }, [socket, roomId, isTutor, initializeConnection]);

    /**
     * Disconnect and cleanup
     */
    const disconnect = useCallback(() => {
        if (webrtcRef.current) {
            webrtcRef.current.disconnect();
            webrtcRef.current = null;
        }

        if (localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }

        setRemoteStream(null);
        setConnectionState('disconnected');

        if (socket) {
            socket.disconnect();
        }
    }, [socket, localStream]);

    // Note: Removed cleanup effect to prevent React Strict Mode from disconnecting
    // Users should manually call disconnect() when leaving the session

    return {
        connect,
        disconnect,
        connectionState,
        remoteStream,
        localStream,
        error,
        socket, // Expose socket for state synchronization
        audioRef, // Attach this to an <audio> element in your component
    };
};
