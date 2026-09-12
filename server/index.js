import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import RoomManager from './roomManager.js';
import { initDB, getDB, saveDB } from './db.js';

import userRoutes from './routes/users.js';
import lessonRoutes from './routes/lessons.js';
import livekitRoutes from './routes/livekit.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
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
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Create room (tutor)
    socket.on('create-room', ({ lessonId, roomId }) => {
        try {
            const createdRoomId = roomManager.createRoom(socket.id, lessonId, roomId);
            socket.join(createdRoomId);
            socket.emit('room-created', { roomId: createdRoomId });
            console.log(`Tutor ${socket.id} created room: ${createdRoomId}`);
        } catch (error) {
            console.error(`Error creating room:`, error.message);
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
            console.log(`Sent ${currentCards.length} board cards to rejoining student in ${roomId}`);
        }

        // Notify tutor that student has joined
        io.to(result.tutorId).emit('peer-joined', {
            peerId: socket.id,
            roomId
        });

        console.log(`Student ${socket.id} joined room ${roomId}`);
    });

    // WebRTC signaling: Offer
    socket.on('webrtc-offer', ({ roomId, offer }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

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

        io.to(room.tutorId).emit('webrtc-answer', {
            answer,
            peerId: socket.id
        });
    });

    // WebRTC signaling: ICE Candidate
    socket.on('ice-candidate', ({ roomId, candidate }) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return;

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

        console.log(`State update in room ${roomId}:`, stateEvent.type);
    });

    // Student -> Tutor signal relay (flags, annotations)
    socket.on('student-signal', ({ roomId, signal }) => {
        const upperRoomId = (roomId || '').toUpperCase();
        const room = roomManager.getRoom(upperRoomId);
        if (!room || room.studentId !== socket.id) return;

        io.to(room.tutorId).emit('student-signal', {
            signal,
            peerId: socket.id
        });

        console.log(`Student signal in room ${upperRoomId}:`, signal.type);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const disconnectInfo = roomManager.handleDisconnect(socket.id);

        if (disconnectInfo) {
            if (disconnectInfo.otherUserId) {
                io.to(disconnectInfo.otherUserId).emit('peer-left', {
                    roomId: disconnectInfo.roomId,
                    reason: disconnectInfo.isTutor ? 'Tutor disconnected' : 'Student disconnected'
                });
            }
        }

        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

/**
 * Auto-seed lessons from JSON files if the DB is empty
 */
async function autoSeed() {
    const db = getDB();
    const result = db.prepare('SELECT COUNT(*) as count FROM lessons').get();
    if (result.count > 0) {
        console.log(`📚 DB already has ${result.count} lessons, skipping seed`);
        return;
    }

    const lessonsDir = path.resolve(__dirname, '../lessons');
    if (!fs.existsSync(lessonsDir)) {
        console.log('📚 No lessons/ directory found, skipping seed');
        return;
    }

    function walk(dir) {
        const results = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...walk(full));
            else if (entry.name.endsWith('.json') && entry.name.startsWith('lesson-')) results.push(full);
        }
        return results;
    }

    const files = walk(lessonsDir);
    let inserted = 0;

    for (const filePath of files) {
        try {
            const lesson = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (!lesson.id || !lesson.language || !lesson.level || !lesson.topic) continue;

            db.prepare(`
                INSERT INTO lessons (id, language, level, lesson_number, topic, content, generated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at
            `).run(
                lesson.id, lesson.language, lesson.level,
                lesson.lessonNumber || 1, lesson.topic,
                JSON.stringify(lesson), lesson.generatedAt || new Date().toISOString()
            );
            inserted++;
        } catch (err) {
            console.error(`  ❌ Error seeding ${path.basename(filePath)}:`, err.message);
        }
    }

    if (inserted > 0) {
        saveDB();
        console.log(`🌱 Auto-seeded ${inserted} lessons`);
    }
}

// Initialize database, then start server
async function start() {
    try {
        await initDB();
        await autoSeed();
        httpServer.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}`);
            console.log(`Health check: http://0.0.0.0:${PORT}/health`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start();
