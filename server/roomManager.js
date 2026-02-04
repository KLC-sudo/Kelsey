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
        // If a roomId is provided, ensure it's uppercase and check if it's a reconnection attempt
        const finalRoomId = (roomId || this.generateRoomCode()).toUpperCase();

        if (this.rooms.has(finalRoomId)) {
            const existingRoom = this.rooms.get(finalRoomId);
            // If the room exists and the tutor is disconnected, allow reclaim
            if (existingRoom.tutorDisconnected) {
                return this.reclaimTutorRoom(tutorSocketId, finalRoomId) ? finalRoomId : null;
            }
            // If it's the SAME tutor, just return the id (idempotent)
            if (existingRoom.tutorId === tutorSocketId) {
                return finalRoomId;
            }
            throw new Error('Room code already in use');
        }

        this.rooms.set(finalRoomId, {
            tutorId: tutorSocketId,
            studentId: null,
            createdAt: Date.now(),
            lessonId,
            state: {},
            tutorDisconnected: false,
            studentDisconnected: false
        });

        this.userRooms.set(tutorSocketId, finalRoomId);

        console.log(`✅ [RoomManager] Room created: ${finalRoomId} | Tutor: ${tutorSocketId}`);
        return finalRoomId;
    }

    /**
     * Student joins an existing room
     */
    joinRoom(studentSocketId, roomId) {
        if (!roomId) return { success: false, error: 'Missing room code' };

        const upperRoomId = roomId.toUpperCase();
        const room = this.rooms.get(upperRoomId);

        if (!room) {
            const activeRooms = Array.from(this.rooms.keys());
            console.log(`❌ [RoomManager] Join failed: ${upperRoomId} not found. Active rooms (${activeRooms.length}): [${activeRooms.join(', ')}]`);
            return { success: false, error: 'Room not found' };
        }

        if (room.studentId && room.studentId !== studentSocketId && !room.studentDisconnected) {
            console.log(`❌ [RoomManager] Join failed: ${upperRoomId} is full`);
            return { success: false, error: 'Room is full' };
        }

        // Handle student reconnection
        room.studentId = studentSocketId;
        room.studentDisconnected = false;
        this.userRooms.set(studentSocketId, upperRoomId);

        console.log(`✅ [RoomManager] Student ${studentSocketId} joined room ${upperRoomId}`);
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

        const isTutor = room.tutorId === socketId;
        const otherUserId = isTutor ? room.studentId : room.tutorId;

        // Mark as disconnected but don't delete yet
        if (isTutor) {
            room.tutorDisconnected = true;
            console.log(`⚠️ Tutor disconnected from ${roomId}. Waiting for reconnection...`);
        } else {
            room.studentDisconnected = true;
            console.log(`⚠️ Student disconnected from ${roomId}. Waiting for reconnection...`);
        }

        // Set a timeout to cleanup after 60 seconds of inactivity
        setTimeout(() => {
            const currentRoom = this.rooms.get(roomId);
            if (currentRoom && (currentRoom.tutorDisconnected || (currentRoom.studentId && currentRoom.studentDisconnected))) {
                // If the user hasn't reconnected, delete it
                if (currentRoom.tutorDisconnected) {
                    this.rooms.delete(roomId);
                    this.userRooms.delete(socketId);
                    if (otherUserId) this.userRooms.delete(otherUserId);
                    console.log(`❌ Room ${roomId} closed after tutor failed to reconnect`);
                }
            }
        }, 60000); // 1 minute grace period

        return {
            roomId,
            otherUserId,
            isTutor
        };
    }

    /**
     * Allow tutor to re-claim an existing room if they reconnect
     */
    reclaimTutorRoom(socketId, roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.tutorId = socketId;
            room.tutorDisconnected = false;
            this.userRooms.set(socketId, roomId);
            console.log(`♻️ Tutor re-claimed room ${roomId}`);
            return true;
        }
        return false;
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
