import React from 'react';
import { ConnectionState } from '../utils/webrtc';

interface ConnectionStatusProps {
    state: ConnectionState;
    roomCode?: string;
}

const STATE_CONFIG: Record<ConnectionState, { label: string; color: string; icon: string }> = {
    disconnected: { label: 'Disconnected', color: 'text-gray-400', icon: '⚪' },
    connecting: { label: 'Connecting...', color: 'text-yellow-400', icon: '🟡' },
    connected: { label: 'Connected', color: 'text-green-400', icon: '🟢' },
    failed: { label: 'Connection Failed', color: 'text-red-400', icon: '🔴' },
};

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state, roomCode }) => {
    const config = STATE_CONFIG[state];

    return (
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700">
            <span className="text-sm">{config.icon}</span>
            <div className="flex flex-col">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                {roomCode && state === 'connected' && (
                    <span className="text-[10px] text-gray-500 font-mono">Room: {roomCode}</span>
                )}
            </div>
        </div>
    );
};
