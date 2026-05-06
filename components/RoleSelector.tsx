import React from 'react';

interface RoleSelectorProps {
    onSelectRole: (isTutor: boolean) => void;
    onBack: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelectRole, onBack }) => {
    return (
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white min-h-[100dvh] flex flex-col items-center justify-center p-4 overflow-hidden">
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 z-0"></div>

            <div className="max-w-4xl w-full z-10 relative flex flex-col items-center">
                <button 
                    onClick={onBack}
                    className="absolute top-0 left-0 -mt-10 md:mt-0 text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                    ← Back
                </button>

                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-center animate-fade-in-down tracking-tight">
                    Human Tutor Session
                </h1>
                <p className="text-gray-400 text-lg text-center mb-12 animate-fade-in-up">
                    Choose your role to get started
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    {/* Tutor Role */}
                    <button
                        onClick={() => onSelectRole(true)}
                        className="group bg-gradient-to-br from-gray-800 to-gray-900 hover:from-purple-900/40 hover:to-purple-900/20 rounded-3xl p-8 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(168,85,247,0.2)] border border-gray-700 hover:border-purple-500/50 animate-fade-in-up"
                        style={{ animationDelay: '100ms', animationFillMode: 'both' }}
                    >
                        <div className="text-center flex flex-col h-full">
                            <div className="text-7xl mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">👨‍🏫</div>
                            <h2 className="text-3xl font-bold mb-3 text-white group-hover:text-purple-300 transition-colors">I'm a Tutor</h2>
                            <p className="text-gray-400 group-hover:text-purple-200/70 mb-8 transition-colors">
                                Host up to 20 students, control the curriculum deck, and monitor active learners.
                            </p>
                            <ul className="text-left space-y-4 text-sm text-gray-300 mt-auto">
                                <li className="flex items-start">
                                    <span className="mr-3 text-purple-400 text-lg leading-none">•</span>
                                    <span>Control lesson phases & sync boards</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-3 text-purple-400 text-lg leading-none">•</span>
                                    <span>Real-time voice communication</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-3 text-purple-400 text-lg leading-none">•</span>
                                    <span>Monitor student roster and audio</span>
                                </li>
                            </ul>
                        </div>
                    </button>

                    {/* Student Role */}
                    <button
                        onClick={() => onSelectRole(false)}
                        className="group bg-gradient-to-br from-gray-800 to-gray-900 hover:from-blue-900/40 hover:to-blue-900/20 rounded-3xl p-8 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(59,130,246,0.2)] border border-gray-700 hover:border-blue-500/50 animate-fade-in-up"
                        style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                    >
                        <div className="text-center flex flex-col h-full">
                            <div className="text-7xl mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">🎓</div>
                            <h2 className="text-3xl font-bold mb-3 text-white group-hover:text-blue-300 transition-colors">I'm a Student</h2>
                            <p className="text-gray-400 group-hover:text-blue-200/70 mb-8 transition-colors">
                                Join your class with a room code and participate in interactive language exercises.
                            </p>
                            <ul className="text-left space-y-4 text-sm text-gray-300 mt-auto">
                                <li className="flex items-start">
                                    <span className="mr-3 text-blue-400 text-lg leading-none">•</span>
                                    <span>Follow tutor-guided curriculum</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-3 text-blue-400 text-lg leading-none">•</span>
                                    <span>Push-to-talk voice participation</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-3 text-blue-400 text-lg leading-none">•</span>
                                    <span>Flag cards for help or review</span>
                                </li>
                            </ul>
                        </div>
                    </button>
                </div>

                <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm shadow-xl">
                        <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Powered by</span>
                        <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Gemini</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
