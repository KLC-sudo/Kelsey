import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Student {
    socketId: string;
    name: string;
    joinedAt: number;
}

interface Tutor {
    socketId: string;
    name: string;
}

interface StudentRosterProps {
    socket: Socket | null;
    roomId: string;
    isTutor: boolean;
    tutorName?: string;
}

export const StudentRoster: React.FC<StudentRosterProps> = ({ socket, roomId, isTutor, tutorName }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [tutor, setTutor] = useState<Tutor | null>(null);

    useEffect(() => {
        if (!socket || !roomId) return;

        // Listen for roster updates from server
        const handleRosterUpdate = ({ students: s, tutor: t }: { students: Student[]; tutor: Tutor }) => {
            setStudents(s);
            if (t) setTutor(t);
        };

        socket.on('roster-update', handleRosterUpdate);

        // Also listen for peer-joined (tutor side)
        const handlePeerJoined = ({ students: s, tutor: t }: { students: Student[]; tutor: Tutor }) => {
            setStudents(s);
            if (t) setTutor(t);
        };

        socket.on('peer-joined', handlePeerJoined);

        // Request current roster
        socket.emit('get-roster', { roomId });

        return () => {
            socket.off('roster-update', handleRosterUpdate);
            socket.off('peer-joined', handlePeerJoined);
        };
    }, [socket, roomId]);

    const displayName = isTutor ? tutorName || 'Tutor' : tutor?.name || 'Tutor';

    return (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 h-full flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
                <span>Session Participants</span>
                <span className="bg-blue-600 text-xs px-2 py-1 rounded-full">
                    {students.length + 1} Active
                </span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2">
                {/* Tutor */}
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-purple-500/30">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-white font-medium">{displayName}</p>
                            <p className="text-xs text-purple-400">Tutor</p>
                        </div>
                    </div>
                    <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">Host</span>
                </div>

                {/* Students */}
                {students.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <p className="text-3xl mb-2 opacity-40">👤</p>
                        <p>Waiting for students to join...</p>
                        <p className="text-xs mt-1 text-gray-600">Share the room code with your student</p>
                    </div>
                ) : (
                    students.map((s) => (
                        <div
                            key={s.socketId}
                            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                    {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{s.name}</p>
                                    <p className="text-xs text-gray-400">
                                        Joined {new Date(s.joinedAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
