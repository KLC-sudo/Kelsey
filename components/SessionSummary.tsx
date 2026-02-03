import React from 'react';
import { SessionSummary } from '../types';
import { CheckCircleIcon, FeedbackIcon, LightbulbIcon, TargetIcon, TrophyIcon } from './icons';

interface SessionSummaryProps {
  summary: SessionSummary;
  duration: string | null;
  onStartNewSession: () => void;
}

const SummaryCard: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6 animate-fade-in-down">
        <h3 className="text-xl font-semibold text-blue-300 mb-3 flex items-center gap-2">
            {icon}
            <span>{title}</span>
        </h3>
        <div className="text-gray-300 space-y-2">{children}</div>
    </div>
);

export const SessionSummaryComponent: React.FC<SessionSummaryProps> = ({ summary, duration, onStartNewSession }) => {
    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
            <header className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 animate-fade-in-down">Session Summary</h1>
                <p className="text-lg text-gray-400 animate-fade-in-down" style={{animationDelay: '100ms'}}>Great work! Here's a breakdown of your conversation.</p>
                {duration && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>Session Duration: {duration}</span>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    <SummaryCard title="Overall Feedback" icon={<FeedbackIcon className="w-6 h-6"/>}>
                        <p>{summary.overallFeedback}</p>
                    </SummaryCard>
                    <SummaryCard title="Fluency" icon={<TrophyIcon className="w-6 h-6"/>}>
                        <p><span className="font-semibold text-white">{summary.fluency.rating}:</span> {summary.fluency.explanation}</p>
                    </SummaryCard>
                     <SummaryCard title="Next Steps" icon={<TargetIcon className="w-6 h-6"/>}>
                        <p>{summary.nextSteps}</p>
                    </SummaryCard>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <SummaryCard title="Key Corrections" icon={<CheckCircleIcon className="w-6 h-6"/>}>
                        {summary.corrections.length > 0 ? (
                            <ul className="space-y-4">
                                {summary.corrections.map((c, i) => (
                                    <li key={i} className="border-l-4 border-gray-600 pl-4">
                                        <p className="text-red-400 break-words">
                                            <span className="font-semibold">You said:</span> "{c.mistake}"
                                        </p>
                                        <p className="text-green-400 break-words">
                                            <span className="font-semibold">Correction:</span> "{c.correction}"
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">{c.explanation}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No major corrections noted. Great job!</p>
                        )}
                    </SummaryCard>
                     <SummaryCard title="New Vocabulary" icon={<LightbulbIcon className="w-6 h-6"/>}>
                        {summary.newVocabulary.length > 0 ? (
                             <ul className="space-y-3">
                                {summary.newVocabulary.map((v, i) => (
                                    <li key={i}>
                                        <p className="font-semibold text-white">{v.term}: <span className="font-normal text-gray-300">{v.definition}</span></p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No new vocabulary was introduced in this session.</p>
                        )}
                    </SummaryCard>
                </div>
            </div>

            <footer className="text-center mt-10 mb-6">
                <button
                    onClick={onStartNewSession}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                    Start New Session
                </button>
            </footer>
        </div>
    );
};
