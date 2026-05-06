/**
 * Account Utility
 *
 * Create, persist, and retrieve user accounts.
 * Currently uses localStorage. Structured for easy backend swap
 * (replace read/write helpers with API calls when ready).
 */

import type { UserAccount, AuthState, RegisterInput, LoginInput, UserRole } from '../types/account';

const ACCOUNT_KEY = 'kelsey_user_account';
const AUTH_KEY = 'kelsey_auth_state';

// ─────────────────────────────────────────────
// UUID generator (simple, no dependency)
// ─────────────────────────────────────────────

function generateId(): string {
  return 'usr_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// ─────────────────────────────────────────────
// Create a new account and persist it
// ─────────────────────────────────────────────

export async function createAccount(input: RegisterInput): Promise<UserAccount> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: input.displayName, role: input.role, email: input.email })
  });
  if (!response.ok) throw new Error('Failed to create account');
  const data = await response.json();
  const account: UserAccount = {
    id: data.id,
    role: data.role,
    displayName: data.displayName,
    email: data.email,
    createdAt: data.createdAt,
    lastLoginAt: data.lastLoginAt,
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  setAuthState({ isAuthenticated: true, account, isGuest: false });
  return account;
}

// ─────────────────────────────────────────────
// Continue as guest (limited features)
// ─────────────────────────────────────────────

export async function continueAsGuest(role: UserRole): Promise<UserAccount> {
  return createAccount({
    displayName: 'Guest',
    role,
  });
}

// ─────────────────────────────────────────────
// Load existing account (on app boot)
// ─────────────────────────────────────────────

export function loadAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as UserAccount) : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Update account fields
// ─────────────────────────────────────────────

export function updateAccount(partial: Partial<UserAccount>): UserAccount | null {
  const current = loadAccount();
  if (!current) return null;
  const updated = { ...current, ...partial };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(updated));
  return updated;
}

// ─────────────────────────────────────────────
// Auth state helpers
// ─────────────────────────────────────────────

export function setAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function getAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { isAuthenticated: false, account: null, isGuest: false };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { isAuthenticated: false, account: null, isGuest: false };
  }
}

// ─────────────────────────────────────────────
// Sign out
// ─────────────────────────────────────────────

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
  // Note: keep ACCOUNT_KEY so returning users get their name back
}

// ─────────────────────────────────────────────
// Check if a user is authenticated and not a guest
// ─────────────────────────────────────────────

export function isFullyAuthenticated(): boolean {
  const state = getAuthState();
  return state.isAuthenticated && !state.isGuest;
}
