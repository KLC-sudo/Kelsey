/**
 * AuthGate — Simple name entry screen.
 * Role is determined by the mode selected later in ModeSelector.
 */
import React, { useState } from 'react';
import { createAccount, continueAsGuest, loadAccount } from '../utils/account';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const existing = loadAccount();

  const handleContinue = async () => {
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    try {
      await createAccount({
        displayName: displayName.trim(),
        role: 'student',
      });
      onAuthenticated();
    } catch (err) {
      setError('Failed to create account. Please try again.');
    }
  };

  const handleGuest = async () => {
    try {
      await continueAsGuest('student');
      onAuthenticated();
    } catch (err) {
      setError('Failed to join as guest. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🌍</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Kelsey</h1>
          <p className="text-gray-400 text-sm">AI-powered language learning</p>
        </div>

        {/* Returning user */}
        {existing && (
          <button
            onClick={onAuthenticated}
            className="w-full bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded-xl px-4 py-3 flex items-center gap-3 transition-colors text-left"
          >
            <span className="text-2xl">👋</span>
            <div>
              <div className="text-white font-medium">Welcome back, {existing.displayName}!</div>
              <div className="text-blue-400 text-sm">Tap to continue →</div>
            </div>
          </button>
        )}

        {/* Name input */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
              placeholder="e.g. Maria"
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-600 text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!displayName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Get Started
          </button>

          <div className="text-center">
            <button
              onClick={handleGuest}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              Skip — continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
