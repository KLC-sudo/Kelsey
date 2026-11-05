/**
 * Account Utility
 *
 * Create, persist, and retrieve user accounts.
 * Uses JWT tokens for API authentication.
 */

import type { UserAccount, AuthState, RegisterInput, LoginInput, UserRole } from '../types/account';

const ACCOUNT_KEY = 'kelsey_user_account';
const AUTH_KEY = 'kelsey_auth_state';
const TOKEN_KEY = 'kelsey_jwt_token';

// ─────────────────────────────────────────────
// UUID generator (simple, no dependency)
// ─────────────────────────────────────────────

function generateId(): string {
  return 'usr_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// ─────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────
// Register with email + password
// ─────────────────────────────────────────────

export interface RegisterFormData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export async function registerAccount(input: RegisterFormData): Promise<UserAccount> {
  const response = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(data.error || 'Registration failed');
  }

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
  if (data.token) setToken(data.token);
  setAuthState({ isAuthenticated: true, account, isGuest: false });
  return account;
}

// ─────────────────────────────────────────────
// Login with email + password
// ─────────────────────────────────────────────

export async function loginAccount(email: string, password: string): Promise<UserAccount> {
  const response = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(data.error || 'Login failed');
  }

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
  if (data.token) setToken(data.token);
  setAuthState({ isAuthenticated: true, account, isGuest: false });
  return account;
}

// ─────────────────────────────────────────────
// Create a new account and persist it (legacy/guest)
// ─────────────────────────────────────────────

export async function createAccount(input: RegisterInput): Promise<UserAccount> {
  try {
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
    if (data.token) setToken(data.token);
    setAuthState({ isAuthenticated: true, account, isGuest: false });
    return account;
  } catch (err) {
    // Fallback: create account locally if server is unreachable
    console.warn('Server unavailable, creating account locally:', err);
    const now = Date.now();
    const account: UserAccount = {
      id: generateId(),
      role: input.role,
      displayName: input.displayName,
      email: input.email,
      createdAt: now,
      lastLoginAt: now,
    };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    setAuthState({ isAuthenticated: true, account, isGuest: false });
    return account;
  }
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
  clearToken();
  // Note: keep ACCOUNT_KEY so returning users get their name back
}

// ─────────────────────────────────────────────
// Check if a user is authenticated and not a guest
// ─────────────────────────────────────────────

export function isFullyAuthenticated(): boolean {
  const state = getAuthState();
  return state.isAuthenticated && !state.isGuest;
}
