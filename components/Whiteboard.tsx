// Enhanced Whiteboard with Categorized, Collapsible Cards + Features
import React, { useState, useMemo } from 'react';
import { FlashcardReview } from './FlashcardReview';
import { quickExportNotes } from '../utils/pdfExport';

// Note categories
type NoteCategory = 'vocabulary' | 'grammar' | 'phrase' | 'context' | 'cultural';

interface WhiteboardNote {
  category: NoteCategory;
  term: string;
  translation?: string;
  explanation: string;
  example?: string;
  timestamp: number;
}

interface WhiteboardProps {
  topics: string[];
  tutorName: string;
}

// Category metadata
const categoryConfig = {
  vocabulary: {
    icon: '📚',
    label: 'Vocabulary',
    color: 'border-blue-500 bg-blue-500/10',
    defaultExpanded: true
  },
  grammar: {
    icon: '🔤',
    label: 'Grammar',
    color: 'border-green-500 bg-green-500/10',
    defaultExpanded: true
  },
  phrase: {
    icon: '💡',
    label: 'Phrases',
    color: 'border-amber-500 bg-amber-500/10',
    defaultExpanded: false
  },
  context: {
    icon: 'ℹ️',
    label: 'Context',
    color: 'border-purple-500 bg-purple-500/10',
    defaultExpanded: false
  },
  cultural: {
    icon: '🌍',
    label: 'Cultural Notes',
    color: 'border-pink-500 bg-pink-500/10',
    defaultExpanded: false
  }
};

// Parse raw text into structured note
function parseNote(text: string, index: number): WhiteboardNote {
  const category = categorizeNote(text);

  // Extract term and translation (e.g., "The word 'Hallo' is... equivalent to 'Hello'")
  const termMatch = text.match(/'([^']+)'/);
  const term = termMatch ? termMatch[1] : '';

  // Try to find translation
  const translationPatterns = [
    /equivalent to '([^']+)'/,
    /means '([^']+)'/,
    /translates to '([^']+)'/,
    /→ ([^(]+)/
  ];

  let translation = '';
  for (const pattern of translationPatterns) {
    const match = text.match(pattern);
    if (match) {
      translation = match[1].trim();
      break;
    }
  }

  return {
    category,
    term,
    translation,
    explanation: text,
    timestamp: Date.now() + index
  };
}

// Categorize note based on content
function categorizeNote(text: string): NoteCategory {
  const lower = text.toLowerCase();

  if (lower.includes('word') || lower.includes('greeting') || lower.includes('translates to')) {
    return 'vocabulary';
  }

  if (lower.includes('verb') || lower.includes('conjugation') || lower.includes('tense') ||
    lower.includes('modal') || lower.includes('irregular')) {
    return 'grammar';
  }

  if (lower.includes('phrase') || lower.includes('expression') || lower.includes('means')) {
    return 'phrase';
  }

  if (lower.includes('cefr') || lower.includes('level') || lower.includes('a1.1') ||
    lower.includes('refers to')) {
    return 'context';
  }

  if (lower.includes('culture') || lower.includes('tradition') || lower.includes('custom')) {
    return 'cultural';
  }

  return 'context';
}

// Collapsible category section
const CategorySection: React.FC<{
  category: NoteCategory;
  notes: WhiteboardNote[];
  defaultExpanded: boolean;
}> = ({ category, notes, defaultExpanded }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = categoryConfig[category];

  if (notes.length === 0) return null;

  return (
    <div className={`rounded-lg border-l-4 ${config.color} overflow-hidden animate-fade-in`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-semibold text-white">{config.label}</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {notes.map((note, idx) => (
            <div
              key={note.timestamp}
              className="text-sm animate-fade-in-down"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {note.term && note.translation ? (
                // Structured format (term → translation)
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white">{note.term}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-300">{note.translation}</span>
                  </div>
                  {note.explanation !== note.term && (
                    <div className="text-gray-400 text-xs mt-1 ml-4">
                      {note.explanation.replace(new RegExp(`'${note.term}'`, 'g'), '').replace(new RegExp(`'${note.translation}'`, 'g'), '').trim()}
                    </div>
                  )}
                </div>
              ) : (
                // Fallback: show full explanation
                <div className="text-gray-300 leading-relaxed">
                  {note.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Whiteboard: React.FC<WhiteboardProps> = ({ topics, tutorName }) => {
  const [showFlashcards, setShowFlashcards] = useState(false);

  // Parse and categorize notes
  const categorizedNotes = useMemo(() => {
    const notes = topics.map((topic, index) => parseNote(topic, index));

    const grouped: Record<NoteCategory, WhiteboardNote[]> = {
      vocabulary: [],
      grammar: [],
      phrase: [],
      context: [],
      cultural: []
    };

    notes.forEach(note => {
      grouped[note.category].push(note);
    });

    return grouped;
  }, [topics]);

  const totalNotes = topics.length;

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm text-gray-100 p-4 rounded-lg shadow-lg flex-1 flex flex-col w-full animate-fade-in border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span className="truncate">{tutorName}'s Notes</span>
          </h2>
          {totalNotes > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">
                {totalNotes} {totalNotes === 1 ? 'note' : 'notes'}
              </span>
              <button
                onClick={() => setShowFlashcards(true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                title="Review as flashcards"
              >
                🎴 Review
              </button>
              <button
                onClick={() => quickExportNotes(topics, `${tutorName}'s Notes`)}
                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                title="Download as PDF"
              >
                📥 PDF
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar space-y-3">
          {totalNotes === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-gray-400 italic p-4 text-sm">
              <div>
                <div className="text-4xl mb-2">📝</div>
                <p>Key concepts and notes will appear here</p>
                <p className="text-xs mt-1">Organized by category for easy review</p>
              </div>
            </div>
          ) : (
            <>
              <CategorySection
                category="vocabulary"
                notes={categorizedNotes.vocabulary}
                defaultExpanded={categoryConfig.vocabulary.defaultExpanded}
              />
              <CategorySection
                category="grammar"
                notes={categorizedNotes.grammar}
                defaultExpanded={categoryConfig.grammar.defaultExpanded}
              />
              <CategorySection
                category="phrase"
                notes={categorizedNotes.phrase}
                defaultExpanded={categoryConfig.phrase.defaultExpanded}
              />
              <CategorySection
                category="context"
                notes={categorizedNotes.context}
                defaultExpanded={categoryConfig.context.defaultExpanded}
              />
              <CategorySection
                category="cultural"
                notes={categorizedNotes.cultural}
                defaultExpanded={categoryConfig.cultural.defaultExpanded}
              />
            </>
          )}
        </div>
      </div>

      {/* Flashcard Review Modal */}
      {showFlashcards && (
        <FlashcardReview
          notes={Object.values(categorizedNotes).flat().map(note => ({
            term: note.term,
            translation: note.translation,
            explanation: note.explanation,
            category: note.category
          }))}
          onClose={() => setShowFlashcards(false)}
        />
      )}
    </>
  );
};
