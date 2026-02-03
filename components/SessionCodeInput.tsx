import React, { useState } from 'react';

interface SessionCodeInputProps {
    onJoin: (roomCode: string) => void;
    onCancel: () => void;
    error?: string | null;
}

export const SessionCodeInput: React.FC<SessionCodeInputProps> = ({ onJoin, onCancel, error }) => {
    const [code, setCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim().length === 6) {
            onJoin(code.trim().toUpperCase());
        }
    };

    const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length <= 6) {
            setCode(value);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Join Tutor Session</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-white transition-colors text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-gray-400 text-sm mb-6">
                    Enter the 6-character room code provided by your tutor to join the session.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="room-code" className="block text-sm font-medium text-gray-300 mb-2">
                            Room Code
                        </label>
                        <input
                            id="room-code"
                            type="text"
                            value={code}
                            onChange={handleCodeChange}
                            placeholder="ABC123"
                            className="w-full bg-gray-900 text-white text-2xl font-mono text-center tracking-widest p-4 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none uppercase"
                            autoFocus
                            maxLength={6}
                        />
                        <div className="text-xs text-gray-500 mt-2 text-center">
                            {code.length}/6 characters
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={code.length !== 6}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            Join Session
                        </button>
                    </div>
                </form>

                {/* Help Text */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <p className="text-xs text-gray-500 text-center">
                        Don't have a code? Ask your tutor to create a session and share the room code with you.
                    </p>
                </div>
            </div>
        </div>
    );
};
