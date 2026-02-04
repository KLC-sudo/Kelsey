import { Socket } from 'socket.io-client';

export interface WebRTCConfig {
    iceServers: RTCIceServer[];
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * Manages WebRTC peer connection for tutor-student audio streaming
 */
export class WebRTCConnection {
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
    private onConnectionStateCallback: ((state: ConnectionState) => void) | null = null;
    private pendingOffer: { offer: RTCSessionDescriptionInit; peerId: string } | null = null;

    constructor(
        private socket: Socket,
        private roomId: string,
        private isTutor: boolean,
        private config: WebRTCConfig
    ) {
        this.setupSocketListeners();
    }

    /**
     * Initialize local media stream (microphone)
     */
    async initializeLocalStream(): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            console.log('🎤 Local audio stream initialized');

            // Process any pending offer that arrived before stream was ready
            if (this.pendingOffer) {
                console.log('📨 Processing pending WebRTC offer...');
                await this.handleOffer(this.pendingOffer.offer);
                this.pendingOffer = null;
            }

            return this.localStream;
        } catch (error) {
            console.error('❌ Failed to get local stream:', error);
            throw new Error('Microphone access denied');
        }
    }

    /**
     * Create peer connection and setup event handlers
     */
    private createPeerConnection(): RTCPeerConnection {
        const pc = new RTCPeerConnection(this.config);

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                this.socket.emit('ice-candidate', {
                    roomId: this.roomId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', pc.connectionState);

            // Map RTCPeerConnection states to our ConnectionState type
            let mappedState: ConnectionState;
            switch (pc.connectionState) {
                case 'new':
                case 'connecting':
                    mappedState = 'connecting';
                    break;
                case 'connected':
                    mappedState = 'connected';
                    break;
                case 'disconnected':
                case 'closed':
                    mappedState = 'disconnected';
                    break;
                case 'failed':
                    mappedState = 'failed';
                    break;
                default:
                    mappedState = 'disconnected';
            }

            console.log('📊 Mapped state:', mappedState);
            this.onConnectionStateCallback?.(mappedState);
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('🎵 Received remote track');
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
                this.onRemoteStreamCallback?.(this.remoteStream);
            }
        };

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream!);
            });
        }

        return pc;
    }

    /**
     * Setup Socket.io listeners for WebRTC signaling
     */
    private setupSocketListeners(): void {
        this.socket.on('webrtc-offer', async ({ offer, peerId }) => {
            console.log('📨 Received WebRTC offer from', peerId);
            // Wait for local stream to be ready before processing offer
            if (!this.localStream) {
                console.log('⏳ Waiting for local stream before processing offer...');
                // Store the offer and process when ready
                this.pendingOffer = { offer, peerId };
                return;
            }
            await this.handleOffer(offer);
        });

        this.socket.on('webrtc-answer', async ({ answer, peerId }) => {
            console.log('📨 Received WebRTC answer from', peerId);
            await this.handleAnswer(answer);
        });

        this.socket.on('ice-candidate', async ({ candidate, peerId }) => {
            console.log('🧊 Received ICE candidate from', peerId);
            await this.handleIceCandidate(candidate);
        });
    }

    /**
     * Tutor initiates connection by creating offer
     */
    async createOffer(): Promise<void> {
        if (!this.isTutor) {
            throw new Error('Only tutors can create offers');
        }

        this.peerConnection = this.createPeerConnection();

        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            console.log('📤 Sending WebRTC offer');
            this.socket.emit('webrtc-offer', {
                roomId: this.roomId,
                offer: this.peerConnection.localDescription,
            });
        } catch (error) {
            console.error('❌ Failed to create offer:', error);
            throw error;
        }
    }

    /**
     * Student handles incoming offer and creates answer
     */
    private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (this.isTutor) return; // Only students handle offers

        this.peerConnection = this.createPeerConnection();

        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            console.log('📤 Sending WebRTC answer');
            this.socket.emit('webrtc-answer', {
                roomId: this.roomId,
                answer: this.peerConnection.localDescription,
            });
        } catch (error) {
            console.error('❌ Failed to handle offer:', error);
            throw error;
        }
    }

    /**
     * Tutor handles incoming answer
     */
    private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.isTutor || !this.peerConnection) return;

        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ WebRTC answer processed');
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
            throw error;
        }
    }

    /**
     * Handle incoming ICE candidates
     */
    private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) return;

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ ICE candidate added');
        } catch (error) {
            console.error('❌ Failed to add ICE candidate:', error);
        }
    }

    /**
     * Register callback for remote stream
     */
    onRemoteStream(callback: (stream: MediaStream) => void): void {
        this.onRemoteStreamCallback = callback;
    }

    /**
     * Register callback for connection state changes
     */
    onConnectionStateChange(callback: (state: ConnectionState) => void): void {
        this.onConnectionStateCallback = callback;
    }

    /**
     * Disconnect and cleanup
     */
    disconnect(): void {
        console.log('🔌 Disconnecting WebRTC');

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.remoteStream = null;
        this.onRemoteStreamCallback = null;
        this.onConnectionStateCallback = null;
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        if (!this.peerConnection) return 'disconnected';
        return this.peerConnection.connectionState as ConnectionState;
    }
}
