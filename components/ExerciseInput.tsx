/**
 * ExerciseInput — interactive answer input rendered inside a BoardCard.
 * Supports multiple-choice, fill-blank, and text-answer.
 * Shows instant feedback and tracks attempts.
 */
import React, { useState, useCallback } from 'react';
import type { ExerciseData } from '../types/board';
import { validateExerciseAnswer } from '../utils/curriculumDeck';

interface ExerciseInputProps {
  exerciseData: ExerciseData;
  cardId: string;
  onResult?: (cardId: string, correct: boolean) => void;
}

export const ExerciseInput: React.FC<ExerciseInputProps> = ({ exerciseData, cardId, onResult }) => {
  const [answer, setAnswer] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const showHint = attempts >= 1 && exerciseData.hint;
  const showAnswer = revealed || (attempts >= (exerciseData.revealAfterAttempts ?? 3));

  const handleSubmit = useCallback(() => {
    const result = validateExerciseExerciseSafe(exerciseData, answer);
    setAttempts(prev => prev + 1);
    setFeedback({ correct: result.correct, text: result.feedback });
    if (result.correct) {
      onResult?.(cardId, true);
    } else if (attempts + 1 >= (exerciseData.revealAfterAttempts ?? 3)) {
      setRevealed(true);
      onResult?.(cardId, false);
    }
  }, [exerciseData, answer, attempts, cardId, onResult]);

  const handleOptionClick = useCallback((option: string, index: number) => {
    const isCorrect = index === exerciseData.correctIndex;
    setAttempts(prev => prev + 1);
    if (isCorrect) {
      setFeedback({ correct: true, text: '✅ Correct!' });
      onResult?.(cardId, true);
    } else {
      setFeedback({ correct: false, text: '❌ Not quite. Try again.' });
      if (attempts + 1 >= (exerciseData.revealAfterAttempts ?? 3)) {
        setRevealed(true);
        onResult?.(cardId, false);
      }
    }
  }, [exerciseData, attempts, cardId, onResult]);

  const isCorrect = feedback?.correct;

  // ── Multiple Choice ──
  if (exerciseData.kind === 'multiple-choice' && exerciseData.options) {
    return (
      <div className="mt-2 space-y-2">
        {exerciseData.options.map((opt, i) => {
          const showState = revealed && i === exerciseData.correctIndex;
          const isWrongPick = isCorrect === false && feedback && !showState;
          return (
            <button
              key={i}
              onClick={() => !isCorrect && !revealed && handleOptionClick(opt, i)}
              disabled={isCorrect === true || revealed}
              className={`
                w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all
                ${showState
                  ? 'border-green-500 bg-green-500/20 text-green-200'
                  : isCorrect === true
                    ? i === exerciseData.correctIndex
                      ? 'border-green-500 bg-green-500/20 text-green-200'
                      : 'border-gray-600 bg-gray-800 text-gray-400 opacity-50'
                    : 'border-gray-600 bg-gray-800 text-gray-200 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer'
                }
                ${revealed && i !== exerciseData.correctIndex ? 'opacity-40' : ''}
              `}
            >
              <span className="font-mono text-xs mr-2 text-gray-500">{String.fromCharCode(65 + i)}.</span>
              {opt}
              {showState && <span className="ml-2 text-green-400">✓</span>}
            </button>
          );
        })}
        {feedback && !isCorrect && showHint && (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            💡 {exerciseData.hint}
          </div>
        )}
        {feedback && (
          <div className={`text-xs font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.text}
          </div>
        )}
        {revealed && (
          <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
            Answer: {exerciseData.options[exerciseData.correctIndex]}
          </div>
        )}
      </div>
    );
  }

  // ── Fill-blank / Text-answer ──
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={e => { setAnswer(e.target.value); setFeedback(null); }}
          onKeyDown={e => e.key === 'Enter' && !isCorrect && !revealed && handleSubmit()}
          placeholder={exerciseData.kind === 'fill-blank' ? 'Type the missing word...' : 'Type your answer...'}
          disabled={isCorrect === true || revealed}
          className="flex-1 bg-gray-900 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none placeholder-gray-500 disabled:opacity-50"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={isCorrect === true || revealed || !answer.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {isCorrect ? '✅' : 'Check'}
        </button>
      </div>

      {feedback && !isCorrect && showHint && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          💡 {exerciseData.hint}
        </div>
      )}

      {feedback && (
        <div className={`text-xs font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {feedback.text}
        </div>
      )}

      {revealed && exerciseData.acceptedAnswers && exerciseData.acceptedAnswers[0] && (
        <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
          Answer: <span className="font-semibold">{exerciseData.acceptedAnswers[0]}</span>
        </div>
      )}
    </div>
  );
};

// Safe wrapper to avoid circular import issues at runtime
function validateExerciseExerciseSafe(data: ExerciseData, answer: string) {
  // Inline validation (same logic as validateExerciseAnswer but without import)
  const trimmed = answer.trim();
  if (!trimmed) return { correct: false, feedback: 'Please enter an answer.' };

  if (data.kind === 'multiple-choice') {
    const idx = data.options?.indexOf(trimmed);
    if (idx !== undefined && idx === data.correctIndex) return { correct: true, feedback: '✅ Correct!' };
    return { correct: false, feedback: '❌ Not quite. Try again.' };
  }

  const normalized = trimmed.toLowerCase().replace(/[.!?]+$/, '');
  const accepted = (data.acceptedAnswers ?? []).map(a => a.toLowerCase().replace(/[.!?]+$/, '').trim());
  if (accepted.includes(normalized)) return { correct: true, feedback: '✅ Correct!' };

  if (data.kind === 'text-answer') {
    const answerWords = normalized.split(/\s+/).filter(w => w.length > 2);
    const matched = answerWords.some(w => accepted.some(a => a.includes(w)));
    if (matched && answerWords.length >= 2) return { correct: true, feedback: '✅ Correct!' };
  }

  return { correct: false, feedback: '❌ Not quite. Try again.' };
}
