import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import RoomManager from './roomManager.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

const roomManager = new RoomManager();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        stats: roomManager.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Create room (tutor)
    socket.on('create-room', ({ lessonId, roomId }) => {
        try {
            const createdRoomId = roomManager.createRoom(socket.id, lessonId, roomId);
            socket.join(createdRoomId);
            socket.emit('room-created', { roomId: createdRoomId });
            console.log(`📝 Tutor ${socket.id} created room: ${createdRoomId}`);
        } catch (error) {
            console.error(`❌ Error creating room:`, error.message);
            socket.emit('create-error', { error: error.message });
        }
    });

    // Student joins an existing room
    socket.on('join-room', ({ roomId }) => {
        const result = roomManager.joinRoom(socket.id, roomId);

        if (!result.success) {
            socket.emit('join-error', { error: result.error });
            return;
        }

        socket.join(roomId);

        // Notify student of successful join
        socket.emit('room-joined', { roomId });

        // Notify tutor that student has joined
        io.to(result.tutorId).emit('peer-joined', {
            peerId: socket.id,
            roomId
        });

        console.log(`👥 Student ${socket.id} joined room ${roomId}`);
    });

    // WebRTC signaling: Offer
    socket.on('webrtc-offer', ({ roomId, offer }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        // Forward offer to student
        if (room.studentId) {
            io.to(room.studentId).emit('webrtc-offer', {
                offer,
                peerId: socket.id
            });
        }
    });

    // WebRTC signaling: Answer
    socket.on('webrtc-answer', ({ roomId, answer }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        // Forward answer to tutor
        io.to(room.tutorId).emit('webrtc-answer', {
            answer,
            peerId: socket.id
        });
    });

    // WebRTC signaling: ICE Candidate
    socket.on('ice-candidate', ({ roomId, candidate }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

        // Forward to the other peer
        const targetId = room.tutorId === socket.id ? room.studentId : room.tutorId;
        if (targetId) {
            io.to(targetId).emit('ice-candidate', {
                candidate,
                peerId: socket.id
            });
        }
    });

    // State synchronization (tutor -> student)
    socket.on('state-update', ({ roomId, stateEvent }) => {
        const room = roomManager.getRoom(roomId);
        if (!room || room.tutorId !== socket.id) {
            // Only tutors can send state updates
            return;
        }

        // Update room state
        roomManager.updateRoomState(roomId, { lastUpdate: stateEvent });

        // Forward to student
        if (room.studentId) {
            io.to(room.studentId).emit('state-update', { stateEvent });
        }

        console.log(`🔄 State update in room ${roomId}:`, stateEvent.type);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const disconnectInfo = roomManager.handleDisconnect(socket.id);

        if (disconnectInfo) {
            // Notify the other peer
            if (disconnectInfo.otherUserId) {
                io.to(disconnectInfo.otherUserId).emit('peer-left', {
                    roomId: disconnectInfo.roomId,
                    reason: disconnectInfo.isTutor ? 'Tutor disconnected' : 'Student disconnected'
                });
            }
        }

        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${PORT}`);
    console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});
