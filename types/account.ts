/**
 * User Account Types
 *
 * Forward-compatible account model.
 * Currently backed by localStorage — structured for easy migration
 * to a real auth backend (Supabase, Firebase, custom JWT, etc.)
 * when account creation is fully implemented.
 */

// ─────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────

export type UserRole = 'student' | 'tutor' | 'admin';

// ─────────────────────────────────────────────
// User Account
// ─────────────────────────────────────────────

export interface UserAccount {
  id: string;              // UUID (generated locally for now)
  role: UserRole;
  displayName: string;
  email?: string;          // optional until backend auth is added

  // Preferences
  preferredLanguage?: string;  // target language they study/teach
  preferredLevel?: string;     // CEFR level preference

  // Metadata
  createdAt: number;       // timestamp ms
  lastLoginAt: number;     // timestamp ms

  // ── Future backend fields (stubs — not used yet) ──
  // authProvider?: 'email' | 'google' | 'github';
  // avatarUrl?: string;
  // backendSynced?: boolean;
}

// ─────────────────────────────────────────────
// Auth State
// ─────────────────────────────────────────────

export interface AuthState {
  isAuthenticated: boolean;
  account: UserAccount | null;
  isGuest: boolean;        // true = user skipped login, limited features
}

// ─────────────────────────────────────────────
// Registration / Login inputs
// ─────────────────────────────────────────────

export interface RegisterInput {
  displayName: string;
  role: UserRole;
  email?: string;
}

export interface LoginInput {
  email: string;
}
