import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { getDB } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { signToken } from '../jwt.js';
import { hashPassword, verifyPassword } from '../password.js';

const router = express.Router();

// Rate limiting
const createAccountLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { error: 'Too many requests. Please try again in a minute.' }
});

const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts. Please try again in a minute.' }
});

function generateId() {
    return 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// ─────────────────────────────────────────────
// REGISTER: email + password + display name + role
// ─────────────────────────────────────────────
router.post('/register', createAccountLimiter, (req, res) => {
    const { email, password, displayName, role } = req.body;

    if (!email || !password || !displayName || !role) {
        return res.status(400).json({ error: 'email, password, displayName, and role are required' });
    }

    const validRoles = ['student', 'teacher', 'school'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'role must be student, teacher, or school' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const id = generateId();
    const now = Date.now();
    const db = getDB();

    try {
        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const pwHash = hashPassword(password);
        db.prepare(`
            INSERT INTO users (id, display_name, email, password_hash, role, created_at, last_login_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, displayName.trim(), emailNorm, pwHash, role, now, now);

        const token = signToken(id, role);

        res.status(201).json({
            id,
            displayName: displayName.trim(),
            email: emailNorm,
            role,
            createdAt: now,
            lastLoginAt: now,
            token
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// ─────────────────────────────────────────────
// LOGIN: email + password → JWT
// ─────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    const emailNorm = email.trim().toLowerCase();
    const db = getDB();

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password if hash exists (legacy accounts without password fail login)
        if (user.password_hash) {
            if (!verifyPassword(password, user.password_hash)) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
        } else {
            return res.status(401).json({ error: 'This account has no password. Please register again.' });
        }

        const now = Date.now();
        db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

        const token = signToken(user.id, user.role);

        res.json({
            id: user.id,
            displayName: user.display_name,
            email: user.email,
            role: user.role,
            createdAt: user.created_at,
            lastLoginAt: now,
            token
        });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// ─────────────────────────────────────────────
// Legacy: create account without password (guest/compat)
// ─────────────────────────────────────────────
router.post('/', createAccountLimiter, (req, res) => {
    const { displayName, role, email } = req.body;
    
    if (!displayName || !role) {
        return res.status(400).json({ error: 'displayName and role are required' });
    }

    const id = generateId();
    const now = Date.now();
    const db = getDB();

    try {
        const stmt = db.prepare(`
            INSERT INTO users (id, display_name, email, password_hash, role, created_at, last_login_at)
            VALUES (?, ?, ?, NULL, ?, ?, ?)
        `);
        stmt.run(id, displayName, email || null, role, now, now);
        
        const token = signToken(id, role);

        res.status(201).json({ 
            id, 
            displayName, 
            email, 
            role, 
            createdAt: now, 
            lastLoginAt: now,
            token
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

    const db = getDB();

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
    const db = getDB();

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

    const db = getDB();

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

    const db = getDB();

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
