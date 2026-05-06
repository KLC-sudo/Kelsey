import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import RoomManager from './roomManager.js';

import userRoutes from './routes/users.js';
import lessonRoutes from './routes/lessons.js';
import livekitRoutes from './routes/livekit.js';

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

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/livekit', livekitRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        stats: roomManager.getStats(),
        timestamp: new Date().toISOString()
    });
});

// Production: Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (req, res) => {
    // Exclude API routes from fallback
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
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
        socket.emit('room-joined', { roomId });

        // Send current board state to the reconnecting/joining student
        const currentCards = roomManager.getBoardCards(roomId.toUpperCase());
        if (currentCards.length > 0) {
            socket.emit('board-rehydrate', { cards: currentCards });
            console.log(`📦 Sent ${currentCards.length} board cards to rejoining student in ${roomId}`);
        }

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
        if (!room || room.tutorId !== socket.id) return;

        // Maintain server-side board card state
        if (stateEvent.type === 'PUSH_CARD') {
            roomManager.pushBoardCard(roomId, stateEvent.card);
        } else if (stateEvent.type === 'RETRACT_CARD') {
            roomManager.retractBoardCard(roomId, stateEvent.cardId);
        } else if (stateEvent.type === 'CLEAR_BOARD' || stateEvent.type === 'END_SESSION') {
            roomManager.clearBoardCards(roomId);
        }

        roomManager.updateRoomState(roomId, { lastUpdate: stateEvent });

        if (room.studentId) {
            io.to(room.studentId).emit('state-update', { stateEvent });
        }

        console.log(`🔄 State update in room ${roomId}:`, stateEvent.type);
    });

    // Student -> Tutor signal relay (flags, annotations)
    socket.on('student-signal', ({ roomId, signal }) => {
        const upperRoomId = (roomId || '').toUpperCase();
        const room = roomManager.getRoom(upperRoomId);
        if (!room || room.studentId !== socket.id) return;

        // Forward only to tutor
        io.to(room.tutorId).emit('student-signal', {
            signal,
            peerId: socket.id
        });

        console.log(`🚩 Student signal in room ${upperRoomId}:`, signal.type);
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
