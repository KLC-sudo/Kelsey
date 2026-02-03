import crypto from 'crypto';

/**
 * Manages active tutor-student session rooms
 */
class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> { tutorId, studentId, createdAt, lessonId }
        this.userRooms = new Map(); // socketId -> roomId

        // Cleanup stale rooms every 5 minutes
        setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
    }

    /**
     * Generate a unique 6-character room code
     */
    generateRoomCode() {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
        let code = '';
        const bytes = crypto.randomBytes(6);

        for (let i = 0; i < 6; i++) {
            code += characters[bytes[i] % characters.length];
        }

        // Ensure uniqueness
        if (this.rooms.has(code)) {
            return this.generateRoomCode();
        }

        return code;
    }

    /**
     * Create a new room (tutor initiates)
     */
    createRoom(tutorSocketId, lessonId = null, roomId = null) {
        // Use provided roomId or generate new one
        const finalRoomId = roomId || this.generateRoomCode();

        // Check if roomId already exists
        if (this.rooms.has(finalRoomId)) {
            throw new Error('Room code already in use');
        }

        this.rooms.set(finalRoomId, {
            tutorId: tutorSocketId,
            studentId: null,
            createdAt: Date.now(),
            lessonId,
            state: {} // Shared state (phase, whiteboard, etc.)
        });

        this.userRooms.set(tutorSocketId, finalRoomId);

        console.log(`✅ Room created: ${finalRoomId} by tutor ${tutorSocketId}`);
        return finalRoomId;
    }

    /**
     * Student joins an existing room
     */
    joinRoom(studentSocketId, roomId) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        if (room.studentId) {
            return { success: false, error: 'Room is full' };
        }

        room.studentId = studentSocketId;
        this.userRooms.set(studentSocketId, roomId);

        console.log(`✅ Student ${studentSocketId} joined room ${roomId}`);
        return { success: true, tutorId: room.tutorId };
    }

    /**
     * Get room by ID
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Get room ID for a user's socket
     */
    getRoomBySocket(socketId) {
        const roomId = this.userRooms.get(socketId);
        return roomId ? this.rooms.get(roomId) : null;
    }

    /**
     * Update room state (phase, whiteboard, etc.)
     */
    updateRoomState(roomId, stateUpdate) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.state = { ...room.state, ...stateUpdate };
            return true;
        }
        return false;
    }

    /**
     * Handle user disconnect
     */
    handleDisconnect(socketId) {
        const roomId = this.userRooms.get(socketId);

        if (!roomId) return null;

        const room = this.rooms.get(roomId);
        if (!room) return null;

        // Determine who disconnected
        const isTutor = room.tutorId === socketId;
        const otherUserId = isTutor ? room.studentId : room.tutorId;

        // Remove the room entirely (session ends on disconnect)
        this.rooms.delete(roomId);
        this.userRooms.delete(socketId);
        if (otherUserId) {
            this.userRooms.delete(otherUserId);
        }

        console.log(`❌ Room ${roomId} closed due to ${isTutor ? 'tutor' : 'student'} disconnect`);

        return {
            roomId,
            otherUserId,
            isTutor
        };
    }

    /**
     * Clean up rooms older than 2 hours
     */
    cleanupStaleRooms() {
        const now = Date.now();
        const maxAge = 2 * 60 * 60 * 1000; // 2 hours

        for (const [roomId, room] of this.rooms.entries()) {
            if (now - room.createdAt > maxAge) {
                console.log(`🧹 Cleaning up stale room: ${roomId}`);
                this.rooms.delete(roomId);
                this.userRooms.delete(room.tutorId);
                if (room.studentId) {
                    this.userRooms.delete(room.studentId);
                }
            }
        }
    }

    /**
     * Get stats for monitoring
     */
    getStats() {
        return {
            totalRooms: this.rooms.size,
            activeRooms: Array.from(this.rooms.values()).filter(r => r.studentId).length,
            waitingRooms: Array.from(this.rooms.values()).filter(r => !r.studentId).length
        };
    }
}

export default RoomManager;
