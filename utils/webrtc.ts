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
    private pendingIceCandidates: RTCIceCandidateInit[] = [];
    private localStreamInitialized: boolean = false;

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
    async initializeLocalStream(): Promise<MediaStream | null> {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('⚠️ navigator.mediaDevices is undefined. Proceeding without microphone.');
                this.localStream = null;
            } else {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                    video: false,
                });
                console.log('🎤 Local audio stream initialized');
            }
        } catch (error) {
            console.warn('⚠️ Microphone access denied or unavailable, proceeding without it:', error);
            this.localStream = null;
        }

        this.localStreamInitialized = true;

        // Process any pending offer that arrived before stream was ready
        if (this.pendingOffer) {
            console.log('📨 Processing pending WebRTC offer...');
            await this.handleOffer(this.pendingOffer.offer);
            this.pendingOffer = null;
        }

        return this.localStream;
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

    private onWebrtcOffer = async ({ offer, peerId }: any) => {
        console.log('📨 Received WebRTC offer from', peerId);
        // Wait for local stream to be ready before processing offer
        if (!this.localStreamInitialized) {
            console.log('⏳ Waiting for local stream before processing offer...');
            // Store the offer and process when ready
            this.pendingOffer = { offer, peerId };
            return;
        }
        await this.handleOffer(offer);
    };

    private onWebrtcAnswer = async ({ answer, peerId }: any) => {
        console.log('📨 Received WebRTC answer from', peerId);
        await this.handleAnswer(answer);
    };

    private onIceCandidate = async ({ candidate, peerId }: any) => {
        console.log('🧊 Received ICE candidate from', peerId);
        await this.handleIceCandidate(candidate);
    };

    /**
     * Setup Socket.io listeners for WebRTC signaling
     */
    private setupSocketListeners(): void {
        this.socket.on('webrtc-offer', this.onWebrtcOffer);
        this.socket.on('webrtc-answer', this.onWebrtcAnswer);
        this.socket.on('ice-candidate', this.onIceCandidate);
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
            this.processQueuedIceCandidates();
            
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
        if (!this.peerConnection) return;

        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('✅ Remote description set (answer)');
            this.processQueuedIceCandidates();
        } catch (error) {
            console.error('❌ Failed to handle answer:', error);
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection || !this.peerConnection.remoteDescription) {
            console.log('⏳ Queuing ICE candidate (no remote description yet)');
            this.pendingIceCandidates.push(candidate);
            return;
        }

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ Added remote ICE candidate');
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    /**
     * Process any queued ICE candidates
     */
    private processQueuedIceCandidates(): void {
        if (this.peerConnection && this.pendingIceCandidates.length > 0) {
            console.log(`🧊 Processing ${this.pendingIceCandidates.length} queued ICE candidates`);
            this.pendingIceCandidates.forEach(candidate => {
                this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate)).catch(e =>
                    console.error('❌ Error adding queued ICE candidate:', e)
                );
            });
            this.pendingIceCandidates = [];
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

        this.socket.off('webrtc-offer', this.onWebrtcOffer);
        this.socket.off('webrtc-answer', this.onWebrtcAnswer);
        this.socket.off('ice-candidate', this.onIceCandidate);

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
