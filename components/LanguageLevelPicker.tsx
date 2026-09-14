import React, { useState } from 'react';
import type { LanguageCode, CEFRLevel } from '../types/lesson';

interface LanguageLevelPickerProps {
    onSelect: (language: LanguageCode, level: CEFRLevel) => void;
    onBack: () => void;
}

const LANGUAGES: { code: LanguageCode; name: string; flag: string; tutor: string }[] = [
    { code: 'german', name: 'German', flag: '🇩🇪', tutor: 'Klaus' },
    { code: 'french', name: 'French', flag: '🇫🇷', tutor: 'Amélie' },
    { code: 'spanish', name: 'Spanish', flag: '🇪🇸', tutor: 'Sofía' },
    { code: 'chinese', name: 'Chinese', flag: '🇨🇳', tutor: 'Lín' },
    { code: 'english', name: 'English', flag: '🇬🇧', tutor: 'David' },
];

const LEVELS: { code: CEFRLevel; label: string; desc: string }[] = [
    { code: 'A1.1', label: 'A1.1', desc: 'Beginner' },
    { code: 'A1.2', label: 'A1.2', desc: 'Beginner+' },
    { code: 'A2.1', label: 'A2.1', desc: 'Elementary' },
    { code: 'A2.2', label: 'A2.2', desc: 'Elementary+' },
    { code: 'B1.1', label: 'B1.1', desc: 'Intermediate' },
    { code: 'B1.2', label: 'B1.2', desc: 'Intermediate+' },
    { code: 'B2.1', label: 'B2.1', desc: 'Upper Intermediate' },
    { code: 'B2.2', label: 'B2.2', desc: 'Upper Intermediate+' },
    { code: 'C1', label: 'C1', desc: 'Advanced' },
    { code: 'C2', label: 'C2', desc: 'Mastery' },
];

export const LanguageLevelPicker: React.FC<LanguageLevelPickerProps> = ({ onSelect, onBack }) => {
    const [language, setLanguage] = useState<LanguageCode | null>(null);
    const [level, setLevel] = useState<CEFRLevel | null>(null);

    const canProceed = language && level;

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
                <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">
                    ← Back
                </button>
                <h2 className="text-white font-bold">Choose Language & Level</h2>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                {/* Language selection */}
                <div className="w-full max-w-2xl mb-10">
                    <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-4 text-center">Language</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                className={`
                                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                                    ${language === lang.code
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                                    }
                                `}
                            >
                                <span className="text-3xl">{lang.flag}</span>
                                <span className="text-white font-medium text-sm">{lang.name}</span>
                                <span className="text-gray-500 text-xs">with {lang.tutor}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Level selection */}
                <div className="w-full max-w-2xl mb-10">
                    <h3 className="text-gray-400 text-sm uppercase tracking-wide mb-4 text-center">CEFR Level</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {LEVELS.map(lvl => (
                            <button
                                key={lvl.code}
                                onClick={() => setLevel(lvl.code)}
                                className={`
                                    flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                                    ${level === lvl.code
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                                    }
                                `}
                            >
                                <span className="text-white font-bold text-lg">{lvl.label}</span>
                                <span className="text-gray-500 text-xs">{lvl.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Continue button */}
                <button
                    onClick={() => canProceed && onSelect(language!, level!)}
                    disabled={!canProceed}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors text-lg"
                >
                    {canProceed
                        ? `Start ${LANGUAGES.find(l => l.code === language)?.name} ${level} Lessons`
                        : 'Select a language and level'
                    }
                </button>
            </main>
        </div>
    );
};
