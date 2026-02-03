
export interface TranscriptEntry {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: number;
  translations?: Map<string, string>;
}

export interface PaceUpdate {
  timestamp: number;
  evaluation: string;
  strategy: string;
  targetLanguageRatio: number;
}

export interface SessionSummary {
  overallFeedback: string;
  fluency: {
    rating: string;
    explanation: string;
  };
  corrections: {
    mistake: string;
    correction: string;
    explanation: string;
  }[];
  newVocabulary: {
    term: string;
    definition: string;
  }[];
  nextSteps: string;
}
