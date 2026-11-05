import crypto from 'crypto';
import { getDB, saveDB } from './db.js';

/**
 * Manages active tutor-student session rooms.
 * Rooms are held in memory for fast access but persisted to SQLite
 * so they survive server restarts.
 */
class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> room object
        this.userRooms = new Map(); // socketId -> roomId

        // Cleanup stale rooms every 5 minutes
        setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
    }

    /**
     * Load persisted rooms from the database into memory.
     * Call once at server startup after initDB().
     */
    loadFromDB() {
        try {
            const db = getDB();
            const rows = db.prepare('SELECT * FROM rooms').all();
            let loaded = 0;

            for (const row of rows) {
                this.rooms.set(row.room_id, {
                    tutorId: `persisted:${row.room_id}`, // placeholder — tutor must rejoin
                    tutorName: row.tutor_name,
                    studentId: null,
                    students: new Map(),
                    createdAt: row.created_at,
                    lessonId: row.lesson_id,
                    state: JSON.parse(row.room_state || '{}'),
                    boardCards: JSON.parse(row.board_cards || '[]'),
                    tutorDisconnected: true, // tutor needs to reconnect
                    studentDisconnected: false,
                    persisted: true,
                });
                loaded++;
            }

            if (loaded > 0) {
                console.log(`📦 Loaded ${loaded} persisted room(s) from database`);
            }
        } catch (err) {
            console.error('Failed to load rooms from DB:', err.message);
        }
    }

    /**
     * Persist a room to the database (upsert).
     */
    _persistRoom(roomId) {
        try {
            const room = this.rooms.get(roomId);
            if (!room) return;

            const db = getDB();
            const now = Date.now();
            db.prepare(`
                INSERT INTO rooms (room_id, tutor_id, tutor_name, lesson_id, board_cards, room_state, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(room_id) DO UPDATE SET
                    tutor_name = excluded.tutor_name,
                    lesson_id = excluded.lesson_id,
                    board_cards = excluded.board_cards,
                    room_state = excluded.room_state,
                    updated_at = excluded.updated_at
            `).run(
                roomId,
                room.tutorId,
                room.tutorName,
                room.lessonId,
                JSON.stringify(room.boardCards),
                JSON.stringify(room.state),
                room.createdAt,
                now
            );
        } catch (err) {
            console.error(`Failed to persist room ${roomId}:`, err.message);
        }
    }

    /**
     * Remove a room from the database.
     */
    _deleteRoomFromDB(roomId) {
        try {
            const db = getDB();
            db.prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
        } catch (err) {
            console.error(`Failed to delete room ${roomId} from DB:`, err.message);
        }
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
        const finalRoomId = (roomId || this.generateRoomCode()).toUpperCase();

        if (this.rooms.has(finalRoomId)) {
            const existingRoom = this.rooms.get(finalRoomId);
            if (existingRoom.tutorDisconnected) {
                return this.reclaimTutorRoom(tutorSocketId, finalRoomId) ? finalRoomId : null;
            }
            if (existingRoom.tutorId === tutorSocketId) {
                return finalRoomId;
            }
            throw new Error('Room code already in use');
        }

        this.rooms.set(finalRoomId, {
            tutorId: tutorSocketId,
            tutorName: 'Tutor',
            studentId: null,
            students: new Map(),
            createdAt: Date.now(),
            lessonId,
            state: {},
            boardCards: [],
            tutorDisconnected: false,
            studentDisconnected: false,
        });

        this.userRooms.set(tutorSocketId, finalRoomId);
        this._persistRoom(finalRoomId);

        console.log(`✅ [RoomManager] Room created: ${finalRoomId} | Tutor: ${tutorSocketId}`);
        return finalRoomId;
    }

    /**
     * Student joins an existing room
     */
    joinRoom(studentSocketId, roomId, studentName = 'Student') {
        if (!roomId) return { success: false, error: 'Missing room code' };

        const upperRoomId = roomId.toUpperCase();
        const room = this.rooms.get(upperRoomId);

        if (!room) {
            const activeRooms = Array.from(this.rooms.keys());
            console.log(`❌ [RoomManager] Join failed: ${upperRoomId} not found. Active rooms (${activeRooms.length}): [${activeRooms.join(', ')}]`);
            return { success: false, error: 'Room not found' };
        }

        room.students.set(studentSocketId, { name: studentName, joinedAt: Date.now() });
        room.studentId = studentSocketId;
        room.studentDisconnected = false;
        this.userRooms.set(studentSocketId, upperRoomId);

        const studentList = this.getStudents(upperRoomId);

        console.log(`✅ [RoomManager] Student ${studentName} (${studentSocketId}) joined room ${upperRoomId}. Total: ${studentList.length}`);
        return { success: true, tutorId: room.tutorId, students: studentList };
    }

    setTutorName(roomId, name) {
        const room = this.rooms.get(roomId?.toUpperCase());
        if (room) {
            room.tutorName = name;
            this._persistRoom(roomId.toUpperCase());
        }
    }

    getStudents(roomId) {
        const room = this.rooms.get(roomId?.toUpperCase());
        if (!room) return [];
        return Array.from(room.students.entries()).map(([socketId, info]) => ({
            socketId,
            name: info.name,
            joinedAt: info.joinedAt
        }));
    }

    getTutor(roomId) {
        const room = this.rooms.get(roomId?.toUpperCase());
        if (!room) return null;
        return { socketId: room.tutorId, name: room.tutorName };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    getRoomBySocket(socketId) {
        const roomId = this.userRooms.get(socketId);
        return roomId ? this.rooms.get(roomId) : null;
    }

    updateRoomState(roomId, stateUpdate) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.state = { ...room.state, ...stateUpdate };
            this._persistRoom(roomId);
            return true;
        }
        return false;
    }

    pushBoardCard(roomId, card) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        room.boardCards.push(card);
        this._persistRoom(roomId);
        return true;
    }

    retractBoardCard(roomId, cardId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        room.boardCards = room.boardCards.filter(c => c.id !== cardId);
        this._persistRoom(roomId);
        return true;
    }

    clearBoardCards(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        room.boardCards = [];
        this._persistRoom(roomId);
        return true;
    }

    getBoardCards(roomId) {
        return this.rooms.get(roomId)?.boardCards ?? [];
    }

    getRoomIdBySocket(socketId) {
        return this.userRooms.get(socketId) ?? null;
    }

    handleDisconnect(socketId) {
        const roomId = this.userRooms.get(socketId);

        if (!roomId) return null;

        const room = this.rooms.get(roomId);
        if (!room) return null;

        const isTutor = room.tutorId === socketId;
        const otherUserId = isTutor ? room.studentId : room.tutorId;

        if (isTutor) {
            room.tutorDisconnected = true;
            console.log(`⚠️ Tutor disconnected from ${roomId}. Waiting for reconnection...`);
        } else {
            room.students.delete(socketId);
            room.studentDisconnected = room.students.size === 0;
            const studentList = this.getStudents(roomId);
            console.log(`⚠️ Student disconnected from ${roomId}. Remaining: ${studentList.length}`);
        }

        this._persistRoom(roomId);

        // Set a timeout to cleanup after 60 seconds of inactivity
        setTimeout(() => {
            const currentRoom = this.rooms.get(roomId);
            if (currentRoom && (currentRoom.tutorDisconnected || (currentRoom.studentId && currentRoom.studentDisconnected))) {
                if (currentRoom.tutorDisconnected) {
                    this.rooms.delete(roomId);
                    this.userRooms.delete(socketId);
                    if (otherUserId) this.userRooms.delete(otherUserId);
                    this._deleteRoomFromDB(roomId);
                    console.log(`❌ Room ${roomId} closed after tutor failed to reconnect`);
                }
            }
        }, 60000);

        return {
            roomId,
            otherUserId,
            isTutor
        };
    }

    reclaimTutorRoom(socketId, roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.tutorId = socketId;
            room.tutorDisconnected = false;
            room.persisted = false;
            this.userRooms.set(socketId, roomId);
            this._persistRoom(roomId);
            console.log(`♻️ Tutor re-claimed room ${roomId}`);
            return true;
        }
        return false;
    }

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
                this._deleteRoomFromDB(roomId);
            }
        }
    }

    getStats() {
        return {
            totalRooms: this.rooms.size,
            activeRooms: Array.from(this.rooms.values()).filter(r => r.studentId).length,
            waitingRooms: Array.from(this.rooms.values()).filter(r => !r.studentId).length
        };
    }
}

export default RoomManager;
