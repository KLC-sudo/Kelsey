import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from '../server/jwt.js';

describe('JWT utilities', () => {
  it('should sign and verify a valid token', () => {
    const token = signToken('usr_123', 'student');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const payload = verifyToken(token) as { sub: string; role: string };
    expect(payload).not.toBeNull();
    expect(payload.sub).toBe('usr_123');
    expect(payload.role).toBe('student');
  });

  it('should return null for an invalid token', () => {
    const result = verifyToken('invalid.token.here');
    expect(result).toBeNull();
  });

  it('should return null for an empty string', () => {
    const result = verifyToken('');
    expect(result).toBeNull();
  });
});
