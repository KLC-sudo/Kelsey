import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all lessons (with optional filtering)
router.get('/', (req, res) => {
    const { language, level } = req.query;
    let query = 'SELECT id, language, level, lesson_number, topic, generated_at FROM lessons';
    const params = [];
    
    if (language && level) {
        query += ' WHERE language = ? AND level = ?';
        params.push(language, level);
    } else if (language) {
        query += ' WHERE language = ?';
        params.push(language);
    } else if (level) {
        query += ' WHERE level = ?';
        params.push(level);
    }
    
    query += ' ORDER BY lesson_number ASC';

    try {
        const stmt = db.prepare(query);
        const lessons = stmt.all(...params);
        res.json(lessons);
    } catch (err) {
        console.error('Error getting lessons:', err);
        res.status(500).json({ error: 'Failed to get lessons' });
    }
});

// Get a single lesson by ID
router.get('/:id', (req, res) => {
    try {
        const stmt = db.prepare('SELECT content FROM lessons WHERE id = ?');
        const lesson = stmt.get(req.params.id);
        
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        
        res.json(JSON.parse(lesson.content));
    } catch (err) {
        console.error('Error getting lesson:', err);
        res.status(500).json({ error: 'Failed to get lesson' });
    }
});

// Save a newly generated lesson
router.post('/', (req, res) => {
    const lessonData = req.body;
    
    if (!lessonData || !lessonData.id) {
        return res.status(400).json({ error: 'Invalid lesson data' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO lessons (id, language, level, lesson_number, topic, content, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                content = excluded.content,
                generated_at = excluded.generated_at
        `);
        
        stmt.run(
            lessonData.id,
            lessonData.language,
            lessonData.level,
            lessonData.lessonNumber,
            lessonData.topic,
            JSON.stringify(lessonData),
            lessonData.generatedAt || new Date().toISOString()
        );
        
        res.status(201).json({ success: true, id: lessonData.id });
    } catch (err) {
        console.error('Error saving lesson:', err);
        res.status(500).json({ error: 'Failed to save lesson' });
    }
});

export default router;
