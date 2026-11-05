import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

/**
 * Hash a password using scrypt (Node.js built-in, no dependencies)
 */
export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password, stored) {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const testHash = crypto.scryptSync(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS).toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
    } catch {
        return false;
    }
}
