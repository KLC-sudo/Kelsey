/**
 * requireRole — role-based access control middleware.
 * Must be used AFTER requireAuth (which sets req.user).
 *
 * Usage: router.get('/path', requireAuth, requireRole('teacher', 'school'), handler)
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
                yourRole: req.user.role,
            });
        }
        next();
    };
};
