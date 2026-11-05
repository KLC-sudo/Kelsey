import { getDB } from '../db.js';
import { verifyToken } from '../jwt.js';

export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Try JWT verification first, fall back to raw user ID for backward compat
    const payload = verifyToken(token);
    const userId = payload ? payload.sub : token;

    const db = getDB();
    
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(userId);
        
        if (!user) {
            console.warn(`Auth failure: User not found for ID "${userId}"`);
            return res.status(401).json({ error: 'Invalid token/user not found' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
