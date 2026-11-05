/**
 * TutorConfidenceTally — live aggregate of student confidence signals.
 * Tutor sees a real-time pulse of how the class is doing.
 */
import React from 'react';

export interface ConfidenceCounts {
  'got-it': number;
  'too-fast': number;
  'need-example': number;
}

interface TutorConfidenceTallyProps {
  counts: ConfidenceCounts;
  studentCount: number;
}

export const TutorConfidenceTally: React.FC<TutorConfidenceTallyProps> = ({ counts, studentCount }) => {
  const total = counts['got-it'] + counts['too-fast'] + counts['need-example'];
  const max = Math.max(total, 1);

  const rows = [
    { key: 'got-it' as const, label: '✅ Got it', color: 'bg-green-500', count: counts['got-it'] },
    { key: 'too-fast' as const, label: '🚀 Too fast', color: 'bg-amber-500', count: counts['too-fast'] },
    { key: 'need-example' as const, label: '🤔 Need example', color: 'bg-blue-500', count: counts['need-example'] },
  ];

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-300">📊 Class Pulse</h3>
        <span className="text-xs text-gray-500">
          {total} response{total !== 1 ? 's' : ''} · {studentCount} student{studentCount !== 1 ? 's' : ''}
        </span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-gray-600 text-center py-3">Waiting for student responses...</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const pct = total > 0 ? (row.count / total) * 100 : 0;
            return (
              <div key={row.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-28 shrink-0">{row.label}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${row.color} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-300 w-8 text-right">{row.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert if students are struggling */}
      {total >= 2 && counts['too-fast'] + counts['need-example'] > counts['got-it'] && (
        <div className="mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          ⚠️ Most students are struggling — consider slowing down or revisiting the concept.
        </div>
      )}
    </div>
  );
};
