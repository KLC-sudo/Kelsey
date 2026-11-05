import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kelsey-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '30d';

export function signToken(userId, role) {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
