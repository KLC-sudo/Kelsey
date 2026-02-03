import React from 'react';

interface RoomCodeDisplayProps {
    roomCode: string;
    onCopyCode: () => void;
    copied: boolean;
}

export const RoomCodeDisplay: React.FC<RoomCodeDisplayProps> = ({ roomCode, onCopyCode, copied }) => {
    return (
        <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-2 border-purple-500 rounded-lg p-3">
            <div className="text-center">
                <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wide mb-2">
                    Share this code
                </h3>
                <div className="bg-gray-900 rounded-lg p-2 mb-2 border border-purple-700">
                    <div className="text-3xl font-mono font-bold text-white tracking-widest">
                        {roomCode}
                    </div>
                </div>
                <button
                    onClick={onCopyCode}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-1.5 text-sm rounded-lg transition-colors w-full"
                >
                    {copied ? '✓ Copied!' : '📋 Copy Code'}
                </button>
                <p className="text-xs text-purple-300 mt-2">
                    Waiting for student...
                </p>
            </div>
        </div>
    );
};
