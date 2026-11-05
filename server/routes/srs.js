import express from 'express';
import { getDB, saveDB } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// SM-2 algorithm: calculate next review interval
function sm2Update(card, quality) {
    // quality: 0=Again, 1=Hard, 2=Good, 3=Easy (mapped to 0-5 SM-2 scale)
    const q = [0, 3, 4, 5][quality] ?? quality;
    let { ease_factor, interval_days, repetitions } = card;

    if (q < 3) {
        // Failed: reset
        repetitions = 0;
        interval_days = 0;
    } else {
        repetitions += 1;
        if (repetitions === 1) {
            interval_days = 1;
        } else if (repetitions === 2) {
            interval_days = 3;
        } else {
            interval_days = Math.round(interval_days * ease_factor);
        }
        // Adjust ease factor
        ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    }

    const nextReviewAt = Date.now() + interval_days * 86400000;
    return { ease_factor, interval_days, repetitions, next_review_at: nextReviewAt, last_reviewed_at: Date.now() };
}

// Get cards due today for user
router.get('/:id/srs/due', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

    try {
        const db = getDB();
        const now = Date.now();
        const stmt = db.prepare('SELECT * FROM review_cards WHERE user_id = ? AND next_review_at <= ? ORDER BY next_review_at ASC');
        const cards = stmt.all(req.params.id, now);

        res.json(cards.map(c => ({
            id: c.id,
            cardData: JSON.parse(c.card_data),
            easeFactor: c.ease_factor,
            intervalDays: c.interval_days,
            repetitions: c.repetitions,
            nextReviewAt: c.next_review_at,
            lastReviewedAt: c.last_reviewed_at,
        })));
    } catch (err) {
        console.error('Error getting due cards:', err);
        res.status(500).json({ error: 'Failed to get due cards' });
    }
});

// Get all cards stats (for dashboard)
router.get('/:id/srs/stats', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

    try {
        const db = getDB();
        const now = Date.now();
        const total = db.prepare('SELECT COUNT(*) as count FROM review_cards WHERE user_id = ?').get(req.params.id);
        const due = db.prepare('SELECT COUNT(*) as count FROM review_cards WHERE user_id = ? AND next_review_at <= ?').get(req.params.id, now);
        const learned = db.prepare('SELECT COUNT(*) as count FROM review_cards WHERE user_id = ? AND repetitions >= 3').get(req.params.id);

        res.json({
            total: total.count,
            dueToday: due.count,
            learned: learned.count,
        });
    } catch (err) {
        console.error('Error getting SRS stats:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Submit a review result
router.post('/:id/srs/:cardId', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

    const { quality } = req.body;
    if (quality === undefined || quality < 0 || quality > 3) {
        return res.status(400).json({ error: 'quality must be 0-3 (Again/Hard/Good/Easy)' });
    }

    try {
        const db = getDB();
        const card = db.prepare('SELECT * FROM review_cards WHERE id = ? AND user_id = ?').get(req.params.cardId, req.params.id);
        if (!card) return res.status(404).json({ error: 'Card not found' });

        const updated = sm2Update(card, quality);
        db.prepare(`
            UPDATE review_cards SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review_at = ?, last_reviewed_at = ?
            WHERE id = ?
        `).run(updated.ease_factor, updated.interval_days, updated.repetitions, updated.next_review_at, updated.last_reviewed_at, req.params.cardId);
        saveDB();

        res.json({
            id: req.params.cardId,
            easeFactor: updated.ease_factor,
            intervalDays: updated.interval_days,
            repetitions: updated.repetitions,
            nextReviewAt: updated.next_review_at,
        });
    } catch (err) {
        console.error('Error reviewing card:', err);
        res.status(500).json({ error: 'Failed to review card' });
    }
});

// Bulk import cards (from lesson completion, session end, etc.)
router.post('/:id/srs/bulk', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });

    const { cards } = req.body;
    if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ error: 'cards array required' });
    }

    try {
        const db = getDB();
        const now = Date.now();
        let inserted = 0;

        for (const card of cards) {
            if (!card.front || !card.back) continue;
            const id = `srs_${card.front.replace(/\s+/g, '_').toLowerCase().slice(0, 30)}_${now}_${inserted}`;
            try {
                db.prepare(`
                    INSERT INTO review_cards (id, user_id, card_data, ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at)
                    VALUES (?, ?, ?, 2.5, 0, 0, ?, NULL)
                `).run(id, req.params.id, JSON.stringify(card), now);
                inserted++;
            } catch (e) {
                // Duplicate (id conflict) — skip
            }
        }

        saveDB();
        res.status(201).json({ inserted, total: cards.length });
    } catch (err) {
        console.error('Error importing SRS cards:', err);
        res.status(500).json({ error: 'Failed to import cards' });
    }
});

export default router;
