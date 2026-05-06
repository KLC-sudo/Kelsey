import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for account creation: 5 requests per minute per IP
const createAccountLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5,
    message: { error: 'Too many accounts created from this IP, please try again after a minute' }
});

function generateId() {
    return 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// Create account
router.post('/', createAccountLimiter, (req, res) => {
    const { displayName, role, email } = req.body;
    
    if (!displayName || !role) {
        return res.status(400).json({ error: 'displayName and role are required' });
    }

    const id = generateId();
    const now = Date.now();

    try {
        const stmt = db.prepare(`
            INSERT INTO users (id, display_name, email, role, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, displayName, email || null, role, now, now);
        
        res.status(201).json({ 
            id, 
            displayName, 
            email, 
            role, 
            createdAt: now, 
            lastLoginAt: now,
            token: id // For display-name auth, the ID acts as the bearer token
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Get account
router.get('/:id', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden: can only access your own account' });
    }
    res.json(req.user);
});

// Get user progress
router.get('/:id/progress', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const stmt = db.prepare('SELECT * FROM user_progress WHERE user_id = ?');
        const progress = stmt.get(req.params.id);
        
        if (!progress) {
            return res.json(null);
        }
        
        res.json({
            ...progress,
            completed_lessons: JSON.parse(progress.completed_lessons),
            assessments: JSON.parse(progress.assessments)
        });
    } catch (err) {
        console.error('Error getting progress:', err);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// Save user progress
router.put('/:id/progress', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { 
        language, level, currentLesson, 
        completedLessons, assessments, 
        totalStudyTime, averageScore 
    } = req.body;

    const now = Date.now();

    try {
        const stmt = db.prepare(`
            INSERT INTO user_progress (
                user_id, language, level, current_lesson, completed_lessons, 
                assessments, total_study_time, average_score, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                language = excluded.language,
                level = excluded.level,
                current_lesson = excluded.current_lesson,
                completed_lessons = excluded.completed_lessons,
                assessments = excluded.assessments,
                total_study_time = excluded.total_study_time,
                average_score = excluded.average_score,
                updated_at = excluded.updated_at
        `);
        
        stmt.run(
            req.params.id, 
            language, 
            level, 
            currentLesson, 
            JSON.stringify(completedLessons || []), 
            JSON.stringify(assessments || {}), 
            totalStudyTime || 0, 
            averageScore || 0, 
            now
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving progress:', err);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

// Get user review history
router.get('/:id/history', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const stmt = db.prepare('SELECT * FROM review_sessions WHERE user_id = ? ORDER BY date DESC');
        const sessions = stmt.all(req.params.id);
        
        res.json(sessions.map(s => ({
            ...s,
            cards: JSON.parse(s.cards)
        })));
    } catch (err) {
        console.error('Error getting history:', err);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

// Save review session
router.post('/:id/history', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { 
        sessionId, lessonId, lessonTopic, language, level, 
        date, durationSeconds, tutorName, cards, cardCount, flaggedCount 
    } = req.body;

    try {
        const stmt = db.prepare(`
            INSERT INTO review_sessions (
                session_id, user_id, lesson_id, lesson_topic, language, level, 
                date, duration_seconds, tutor_name, cards, card_count, flagged_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            sessionId || ('sess_' + Date.now()),
            req.params.id,
            lessonId,
            lessonTopic || '',
            language,
            level,
            date || Date.now(),
            durationSeconds || 0,
            tutorName || '',
            JSON.stringify(cards || []),
            cardCount || 0,
            flaggedCount || 0
        );
        
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error saving session:', err);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

export default router;
