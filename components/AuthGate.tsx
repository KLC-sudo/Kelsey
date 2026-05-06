/**
 * AuthGate — Account creation / login screen.
 *
 * Currently localStorage-backed.
 * Provides: create account (name + role + optional email) or continue as guest.
 * Data model is ready for backend auth swap.
 */
import React, { useState } from 'react';
import type { UserRole } from '../types/account';
import { createAccount, continueAsGuest, loadAccount } from '../utils/account';

interface AuthGateProps {
  onAuthenticated: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; icon: string }[] = [
  { value: 'student', label: 'Student', desc: 'Join sessions and track your progress', icon: '🎓' },
  { value: 'tutor', label: 'Tutor', desc: 'Create sessions and control the board', icon: '📋' },
];

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'choose' | 'register'>('choose');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Check if existing account — pre-fill name
  const existing = loadAccount();

  const handleCreateAccount = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    try {
      await createAccount({
        displayName: displayName.trim(),
        role: selectedRole,
        email: email.trim() || undefined,
      });
      onAuthenticated();
    } catch (err) {
      setError('Failed to create account. Please try again.');
    }
  };

  const handleGuest = async (role: UserRole) => {
    try {
      await continueAsGuest(role);
      onAuthenticated();
    } catch (err) {
      setError('Failed to join as guest. Please try again.');
    }
  };

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Logo / Title */}
          <div className="text-center space-y-2">
            <div className="text-5xl">🌐</div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Kelsey</h1>
            <p className="text-gray-400 text-sm">Live language learning with your tutor</p>
          </div>

          {/* Returning user banner */}
          {existing && (
            <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">👋</span>
              <div>
                <div className="text-white font-medium">Welcome back, {existing.displayName}!</div>
                <button
                  onClick={onAuthenticated}
                  className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
                >
                  Continue as {existing.role} →
                </button>
              </div>
            </div>
          )}

          {/* Role selection */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide text-center">I am joining as…</div>
            {ROLE_OPTIONS.map(role => (
              <button
                key={role.value}
                onClick={() => { setSelectedRole(role.value); setMode('register'); }}
                className="w-full bg-gray-800/80 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl p-4 flex items-center gap-4 transition-all text-left group"
              >
                <span className="text-3xl">{role.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">{role.label}</div>
                  <div className="text-sm text-gray-400">{role.desc}</div>
                </div>
                <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
              </button>
            ))}
          </div>

          {/* Guest options */}
          <div className="text-center">
            <div className="text-xs text-gray-600 mb-2">Or jump in without an account</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => handleGuest('student')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline">
                Guest student
              </button>
              <span className="text-gray-700">·</span>
              <button onClick={() => handleGuest('tutor')} className="text-xs text-gray-500 hover:text-gray-300 transition-colors underline">
                Guest tutor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Register form
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setMode('choose'); setError(''); }}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold text-white">
            {ROLE_OPTIONS.find(r => r.value === selectedRole)?.icon} Create Account
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Your name *</label>
            <input
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setError(''); }}
              placeholder="e.g. Maria"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Email <span className="text-gray-600">(optional for now)</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Will be used for cloud sync when backend auth is ready.
            </p>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleCreateAccount}
            disabled={!displayName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Create Account & Continue
          </button>

          <button
            onClick={() => handleGuest(selectedRole)}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors underline"
          >
            Skip — continue as guest {selectedRole}
          </button>
        </div>
      </div>
    </div>
  );
};
