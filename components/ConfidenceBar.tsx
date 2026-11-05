/**
 * ConfidenceBar — persistent 3-button comprehension bar.
 * Students tap during class to signal understanding.
 * Signals are sent via the student-signal socket channel.
 */
import React, { useState } from 'react';

interface ConfidenceBarProps {
  onConfidence: (level: 'got-it' | 'too-fast' | 'need-example') => void;
}

const LEVELS = [
  { key: 'got-it', label: '✅ Got it', color: 'bg-green-600 hover:bg-green-500', activeColor: 'bg-green-500 ring-2 ring-green-300' },
  { key: 'too-fast', label: '🚀 Too fast', color: 'bg-amber-600 hover:bg-amber-500', activeColor: 'bg-amber-500 ring-2 ring-amber-300' },
  { key: 'need-example', label: '🤔 Need example', color: 'bg-blue-600 hover:bg-blue-500', activeColor: 'bg-blue-500 ring-2 ring-blue-300' },
] as const;

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ onConfidence }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClick = (key: string) => {
    setSelected(key);
    onConfidence(key as any);
    // Reset selection after a moment so they can signal again
    setTimeout(() => setSelected(null), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">How's it going?</span>
      <div className="flex gap-2">
        {LEVELS.map(level => (
          <button
            key={level.key}
            onClick={() => handleClick(level.key)}
            className={`
              px-3 py-2 rounded-lg text-xs font-semibold transition-all
              ${selected === level.key
                ? level.activeColor
                : `${level.color} opacity-70 hover:opacity-100`
              }
            `}
          >
            {level.label}
          </button>
        ))}
      </div>
      {selected && (
        <span className="text-[10px] text-green-400 animate-pulse">Sent to tutor ✓</span>
      )}
    </div>
  );
};
