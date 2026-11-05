import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setToken, getToken, clearToken, getAuthHeaders, signOut, setAuthState, getAuthState } from '../utils/account';

describe('Account utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Token management', () => {
    it('stores and retrieves JWT token', () => {
      setToken('test-jwt-token-123');
      expect(getToken()).toBe('test-jwt-token-123');
    });

    it('returns null when no token is stored', () => {
      expect(getToken()).toBeNull();
    });

    it('clears token', () => {
      setToken('token-to-clear');
      clearToken();
      expect(getToken()).toBeNull();
    });

    it('returns correct auth headers with token', () => {
      setToken('my-jwt');
      const headers = getAuthHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer my-jwt' });
    });

    it('returns empty headers when no token', () => {
      const headers = getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('Auth state', () => {
    it('stores and retrieves auth state', () => {
      const state = {
        isAuthenticated: true,
        account: { id: 'usr_1', displayName: 'Test', role: 'student' as const, createdAt: 1, lastLoginAt: 1 },
        isGuest: false,
      };
      setAuthState(state);
      const retrieved = getAuthState();
      expect(retrieved.isAuthenticated).toBe(true);
      expect(retrieved.account?.displayName).toBe('Test');
      expect(retrieved.isGuest).toBe(false);
    });

    it('returns default unauthenticated state when empty', () => {
      const state = getAuthState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.account).toBeNull();
      expect(state.isGuest).toBe(false);
    });

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('kelsey_auth_state', 'not-valid-json{{{');
      const state = getAuthState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('signOut', () => {
    it('clears auth state and token', () => {
      setAuthState({ isAuthenticated: true, account: null, isGuest: false });
      setToken('some-token');

      signOut();

      expect(getAuthState().isAuthenticated).toBe(false);
      expect(getToken()).toBeNull();
    });

    it('preserves account key', () => {
      localStorage.setItem('kelsey_user_account', JSON.stringify({ displayName: 'Test' }));
      setAuthState({ isAuthenticated: true, account: null, isGuest: false });

      signOut();

      expect(localStorage.getItem('kelsey_user_account')).not.toBeNull();
    });
  });
});
