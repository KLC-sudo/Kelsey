import React from 'react';
import { useParticipants, AudioTrack } from '@livekit/components-react';
import { Participant } from 'livekit-client';

export const StudentRoster: React.FC = () => {
    // Get all participants except the local tutor
    const participants = useParticipants().filter(p => !p.isLocal);

    return (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                <span>Student Roster</span>
                <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">
                    {participants.length} Active
                </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2">
                {participants.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p>Waiting for students to join...</p>
                    </div>
                ) : (
                    participants.map((p: Participant) => (
                        <div 
                            key={p.identity} 
                            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                    {p.name ? p.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{p.name || 'Unknown Student'}</p>
                                    <p className="text-xs text-gray-400">
                                        {p.isSpeaking ? (
                                            <span className="text-green-400 animate-pulse">Speaking...</span>
                                        ) : p.isMicrophoneEnabled ? (
                                            <span className="text-gray-300">Mic Open</span>
                                        ) : (
                                            <span className="text-red-400">Mic Muted</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Render their audio track so the tutor can hear them */}
                            <AudioTrack trackRef={{ participant: p, source: 'microphone' as any }} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
