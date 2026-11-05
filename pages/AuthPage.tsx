/**
 * AuthPage — sign up / sign in with email, password, and role selection.
 * Roles: student, teacher, school.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerAccount, loginAccount, loadAccount, getAuthState, type RegisterFormData } from '../utils/account';
import type { UserRole } from '../types/account';

type AuthMode = 'signin' | 'signup';

const ROLES: Array<{ key: UserRole; label: string; icon: string; desc: string }> = [
  { key: 'student', label: 'Student', icon: '🎓', desc: 'Take lessons, review flashcards' },
  { key: 'teacher', label: 'Teacher', icon: '👨‍🏫', desc: 'Run live sessions, push content' },
  { key: 'school', label: 'School', icon: '🏫', desc: 'Manage classes and track progress' },
];

export function AuthPage({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const existing = loadAccount();
  const wasAuthed = getAuthState().isAuthenticated;

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!email.trim() || !password || !displayName.trim()) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await registerAccount({ email: email.trim(), password, displayName: displayName.trim(), role } as RegisterFormData);
      } else {
        if (!email.trim() || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        await loginAccount(email.trim(), password);
      }
      onAuthenticated?.();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReturning = () => {
    // Already has an account stored locally — just continue
    onAuthenticated?.();
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5 sm:space-y-6 animate-fade-in my-auto">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🌍</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Kelsey</h1>
          <p className="text-gray-400 text-sm">AI-powered language learning</p>
        </div>

        {/* Returning user quick-continue */}
        {existing && wasAuthed && (
          <button
            onClick={handleReturning}
            className="w-full bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left"
          >
            <span className="text-2xl">👋</span>
            <div>
              <div className="text-white font-medium">Welcome back, {existing.displayName}!</div>
              <div className="text-blue-400 text-sm">Tap to continue →</div>
            </div>
          </button>
        )}

        {/* Mode toggle */}
        <div className="flex bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${mode === 'signin' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Sign In
          </button>
        </div>

        <div className="space-y-4">
          {/* Role selection (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs text-gray-400 block mb-2">I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setRole(r.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${role === r.key
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{r.icon}</span>
                    <span className={`text-xs font-semibold ${role === r.key ? 'text-blue-400' : 'text-gray-300'}`}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-1 text-center">
                {ROLES.find(r => r.key === role)?.desc}
              </p>
            </div>
          )}

          {/* Display name (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Full name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Maria Garcia"
                className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
                autoFocus
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="you@school.com"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
              autoFocus={mode === 'signin'}
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
