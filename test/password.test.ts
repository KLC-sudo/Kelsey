import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../server/password.js';

describe('Password hashing', () => {
  it('hashes a password and verifies it correctly', () => {
    const password = 'mySecureP@ss123';
    const hash = hashPassword(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash).toContain(':');
    expect(verifyPassword(password, hash)).toBe(true);
  });

  it('rejects wrong passwords', () => {
    const hash = hashPassword('correct-password');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
    expect(verifyPassword('', hash)).toBe(false);
  });

  it('produces different hashes for the same password (unique salt)', () => {
    const hash1 = hashPassword('same-password');
    const hash2 = hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
    // Both should verify
    expect(verifyPassword('same-password', hash1)).toBe(true);
    expect(verifyPassword('same-password', hash2)).toBe(true);
  });

  it('handles malformed stored hashes gracefully', () => {
    expect(verifyPassword('test', '')).toBe(false);
    expect(verifyPassword('test', 'no-colon')).toBe(false);
    expect(verifyPassword('test', 'abc:def')).toBe(false);
  });
});
