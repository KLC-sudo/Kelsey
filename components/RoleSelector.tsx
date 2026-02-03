import React from 'react';

interface RoleSelectorProps {
    onSelectRole: (isTutor: boolean) => void;
    onBack: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelectRole, onBack }) => {
    return (
        <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <h1 className="text-4xl font-bold mb-4 text-center animate-fade-in-down">Human Tutor Session</h1>
                <p className="text-gray-400 text-center mb-10">Choose your role to get started</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Tutor Role */}
                    <button
                        onClick={() => onSelectRole(true)}
                        className="group bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-purple-500"
                    >
                        <div className="text-center">
                            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">👨‍🏫</div>
                            <h2 className="text-3xl font-bold mb-4">I'm a Tutor</h2>
                            <p className="text-purple-200 mb-6">
                                Create a session, get a room code, and guide your student through lessons.
                            </p>
                            <ul className="text-left space-y-3 text-sm text-purple-100">
                                <li className="flex items-start">
                                    <span className="mr-2 text-purple-300">✓</span>
                                    <span>Control lesson phases</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-purple-300">✓</span>
                                    <span>Add whiteboard notes</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-purple-300">✓</span>
                                    <span>Real-time voice communication</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-purple-300">✓</span>
                                    <span>Monitor student progress</span>
                                </li>
                            </ul>
                        </div>
                    </button>

                    {/* Student Role */}
                    <button
                        onClick={() => onSelectRole(false)}
                        className="group bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 rounded-2xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl border-2 border-blue-500"
                    >
                        <div className="text-center">
                            <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">🎓</div>
                            <h2 className="text-3xl font-bold mb-4">I'm a Student</h2>
                            <p className="text-blue-200 mb-6">
                                Join your tutor's session using a room code and start learning.
                            </p>
                            <ul className="text-left space-y-3 text-sm text-blue-100">
                                <li className="flex items-start">
                                    <span className="mr-2 text-blue-300">✓</span>
                                    <span>Follow tutor-guided lessons</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-blue-300">✓</span>
                                    <span>See synchronized whiteboard</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-blue-300">✓</span>
                                    <span>Real-time voice communication</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2 text-blue-300">✓</span>
                                    <span>Interactive learning experience</span>
                                </li>
                            </ul>
                        </div>
                    </button>
                </div>

                <button
                    onClick={onBack}
                    className="mt-10 mx-auto block text-gray-400 hover:text-white transition-colors"
                >
                    ← Back to Mode Selection
                </button>
            </div>
        </div>
    );
};
