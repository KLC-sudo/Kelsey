import React, { createContext, useContext, useReducer, useRef, useCallback, useEffect, type ReactNode } from 'react';
import type { TranscriptEntry, SessionSummary, PaceUpdate } from '../types';
import type { Lesson, ClassSession, LessonPhase } from '../types/lesson';
import type { BoardCard, CurriculumDeck } from '../types/board';
import type { AppMode } from '../components/ModeSelector';

// ── Types ──

export type TargetLanguage = 'german' | 'french' | 'spanish' | 'chinese' | 'english';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type InstructionLanguage = 'english' | 'spanish' | 'french';
export type Audibility = 'silent' | 'poor' | 'good' | 'clipping';

interface AppState {
  // Auth
  isAuthed: boolean;

  // Free mode
  targetLanguage: TargetLanguage | null;
  difficulty: Difficulty | null;
  instructionLanguage: InstructionLanguage | null;
  isRecording: boolean;
  status: string;
  transcripts: TranscriptEntry[];
  liveTranscript: { user: string; ai: string };
  whiteboardTopics: string[];
  audibility: Audibility;
  latency: number | null;
  isGeneratingSummary: boolean;
  sessionSummary: SessionSummary | null;
  sessionDuration: string | null;
  devMode: boolean;
  paceHistory: PaceUpdate[];

  // Class mode
  appMode: AppMode;
  currentLesson: Lesson | null;
  classSession: ClassSession | null;
  currentPhase: LessonPhase;
  sessionElapsedTime: number;
  showCompletion: boolean;
  completionScore: number;
  classLevel: string;

  // Reconnection
  isReconnecting: boolean;
  reconnectAttempts: number;

  // Human tutor
  isTutorMode: boolean;
  roomCode: string | null;
  showSessionCodeInput: boolean;
  connectionError: string | null;
  copiedRoomCode: boolean;

  // Board
  boardCards: BoardCard[];
  curriculumDeck: CurriculumDeck | null;
  lastSentCardId: string | null;
  flaggedCards: Map<string, string | undefined>;

  // Exercise scoring (Phase 2)
  exerciseResults: Record<string, boolean>; // cardId -> correct

  // Confidence / polling (Phase 3)
  confidenceCounts: { 'got-it': number; 'too-fast': number; 'need-example': number };
  activePoll: { pollId: string; question: string; options: string[]; durationSeconds: number } | null;
  pollResults: Record<number, number>; // choiceIndex -> count
}

type AppAction =
  | { type: 'SET_AUTH'; isAuthed: boolean }
  | { type: 'SET_TARGET_LANGUAGE'; lang: TargetLanguage | null }
  | { type: 'SET_DIFFICULTY'; d: Difficulty | null }
  | { type: 'SET_INSTRUCTION_LANGUAGE'; lang: InstructionLanguage | null }
  | { type: 'SET_APP_MODE'; mode: AppMode }
  | { type: 'SET_CURRENT_LESSON'; lesson: Lesson | null }
  | { type: 'SET_CLASS_SESSION'; session: ClassSession | null }
  | { type: 'SET_CURRENT_PHASE'; phase: LessonPhase }
  | { type: 'SET_SESSION_ELAPSED_TIME'; time: number }
  | { type: 'SET_SHOW_COMPLETION'; show: boolean }
  | { type: 'SET_COMPLETION_SCORE'; score: number }
  | { type: 'SET_CLASS_LEVEL'; level: string }
  | { type: 'SET_IS_RECORDING'; v: boolean }
  | { type: 'SET_STATUS'; s: string }
  | { type: 'SET_TRANSCRIPTS'; t: TranscriptEntry[] }
  | { type: 'APPEND_TRANSCRIPTS'; t: TranscriptEntry[] }
  | { type: 'SET_LIVE_TRANSCRIPT'; lt: { user: string; ai: string } }
  | { type: 'SET_WHITEBOARD_TOPICS'; topics: string[] }
  | { type: 'APPEND_WHITEBOARD_TOPICS'; topics: string[] }
  | { type: 'SET_AUDIBILITY'; a: Audibility }
  | { type: 'SET_LATENCY'; l: number | null }
  | { type: 'SET_IS_GENERATING_SUMMARY'; v: boolean }
  | { type: 'SET_SESSION_SUMMARY'; s: SessionSummary | null }
  | { type: 'SET_SESSION_DURATION'; d: string | null }
  | { type: 'SET_DEV_MODE'; v: boolean }
  | { type: 'SET_PACE_HISTORY'; h: PaceUpdate[] }
  | { type: 'APPEND_PACE_HISTORY'; h: PaceUpdate[] }
  | { type: 'SET_IS_RECONNECTING'; v: boolean }
  | { type: 'SET_RECONNECT_ATTEMPTS'; n: number }
  | { type: 'SET_IS_TUTOR_MODE'; v: boolean }
  | { type: 'SET_ROOM_CODE'; code: string | null }
  | { type: 'SET_SHOW_SESSION_CODE_INPUT'; v: boolean }
  | { type: 'SET_CONNECTION_ERROR'; e: string | null }
  | { type: 'SET_COPIED_ROOM_CODE'; v: boolean }
  | { type: 'SET_BOARD_CARDS'; cards: BoardCard[] }
  | { type: 'APPEND_BOARD_CARD'; card: BoardCard }
  | { type: 'REMOVE_BOARD_CARD'; cardId: string }
  | { type: 'UPDATE_BOARD_CARD'; cardId: string; updates: Partial<BoardCard> }
  | { type: 'SET_CURRICULUM_DECK'; deck: CurriculumDeck | null }
  | { type: 'SET_LAST_SENT_CARD_ID'; id: string | null }
  | { type: 'SET_FLAGGED_CARDS'; cards: Map<string, string | undefined> }
  | { type: 'SET_FLAGGED_CARD'; cardId: string; annotation?: string }
  | { type: 'REMOVE_FLAGGED_CARD'; cardId: string }
  | { type: 'SET_EXERCISE_RESULT'; cardId: string; correct: boolean }
  | { type: 'RESET_EXERCISE_RESULTS' }
  | { type: 'INCREMENT_CONFIDENCE'; level: 'got-it' | 'too-fast' | 'need-example' }
  | { type: 'RESET_CONFIDENCE' }
  | { type: 'SET_ACTIVE_POLL'; poll: { pollId: string; question: string; options: string[]; durationSeconds: number } | null }
  | { type: 'SET_POLL_VOTE'; choiceIndex: number }
  | { type: 'RESET_POLL' }
  | { type: 'RESET_FREE_MODE' }
  | { type: 'RESET_CLASS_MODE' }
  | { type: 'RESET_BOARD' }
  | { type: 'BATCH'; updates: Partial<AppState> };

const initialState: AppState = {
  isAuthed: false,
  targetLanguage: null,
  difficulty: null,
  instructionLanguage: null,
  isRecording: false,
  status: '',
  transcripts: [],
  liveTranscript: { user: '', ai: '' },
  whiteboardTopics: [],
  audibility: 'silent',
  latency: null,
  isGeneratingSummary: false,
  sessionSummary: null,
  sessionDuration: null,
  devMode: false,
  paceHistory: [],
  appMode: 'free',
  currentLesson: null,
  classSession: null,
  currentPhase: 'introduction',
  sessionElapsedTime: 0,
  showCompletion: false,
  completionScore: 85,
  classLevel: 'A1.1',
  isReconnecting: false,
  reconnectAttempts: 0,
  isTutorMode: false,
  roomCode: null,
  showSessionCodeInput: false,
  connectionError: null,
  copiedRoomCode: false,
  boardCards: [],
  curriculumDeck: null,
  lastSentCardId: null,
  flaggedCards: new Map(),
  exerciseResults: {},
  confidenceCounts: { 'got-it': 0, 'too-fast': 0, 'need-example': 0 },
  activePoll: null,
  pollResults: {},
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH': return { ...state, isAuthed: action.isAuthed };
    case 'SET_TARGET_LANGUAGE': return { ...state, targetLanguage: action.lang };
    case 'SET_DIFFICULTY': return { ...state, difficulty: action.d };
    case 'SET_INSTRUCTION_LANGUAGE': return { ...state, instructionLanguage: action.lang };
    case 'SET_APP_MODE': return { ...state, appMode: action.mode };
    case 'SET_CURRENT_LESSON': return { ...state, currentLesson: action.lesson };
    case 'SET_CLASS_SESSION': return { ...state, classSession: action.session };
    case 'SET_CURRENT_PHASE': return { ...state, currentPhase: action.phase };
    case 'SET_SESSION_ELAPSED_TIME': return { ...state, sessionElapsedTime: action.time };
    case 'SET_SHOW_COMPLETION': return { ...state, showCompletion: action.show };
    case 'SET_COMPLETION_SCORE': return { ...state, completionScore: action.score };
    case 'SET_CLASS_LEVEL': return { ...state, classLevel: action.level };
    case 'SET_IS_RECORDING': return { ...state, isRecording: action.v };
    case 'SET_STATUS': return { ...state, status: action.s };
    case 'SET_TRANSCRIPTS': return { ...state, transcripts: action.t };
    case 'APPEND_TRANSCRIPTS': return { ...state, transcripts: [...state.transcripts, ...action.t] };
    case 'SET_LIVE_TRANSCRIPT': return { ...state, liveTranscript: action.lt };
    case 'SET_WHITEBOARD_TOPICS': return { ...state, whiteboardTopics: action.topics };
    case 'APPEND_WHITEBOARD_TOPICS': return { ...state, whiteboardTopics: [...state.whiteboardTopics, ...action.topics.filter(t => !state.whiteboardTopics.includes(t))] };
    case 'SET_AUDIBILITY': return { ...state, audibility: action.a };
    case 'SET_LATENCY': return { ...state, latency: action.l };
    case 'SET_IS_GENERATING_SUMMARY': return { ...state, isGeneratingSummary: action.v };
    case 'SET_SESSION_SUMMARY': return { ...state, sessionSummary: action.s };
    case 'SET_SESSION_DURATION': return { ...state, sessionDuration: action.d };
    case 'SET_DEV_MODE': return { ...state, devMode: action.v };
    case 'SET_PACE_HISTORY': return { ...state, paceHistory: action.h };
    case 'APPEND_PACE_HISTORY': return { ...state, paceHistory: [...state.paceHistory, ...action.h] };
    case 'SET_IS_RECONNECTING': return { ...state, isReconnecting: action.v };
    case 'SET_RECONNECT_ATTEMPTS': return { ...state, reconnectAttempts: action.n };
    case 'SET_IS_TUTOR_MODE': return { ...state, isTutorMode: action.v };
    case 'SET_ROOM_CODE': return { ...state, roomCode: action.code };
    case 'SET_SHOW_SESSION_CODE_INPUT': return { ...state, showSessionCodeInput: action.v };
    case 'SET_CONNECTION_ERROR': return { ...state, connectionError: action.e };
    case 'SET_COPIED_ROOM_CODE': return { ...state, copiedRoomCode: action.v };
    case 'SET_BOARD_CARDS': return { ...state, boardCards: action.cards };
    case 'APPEND_BOARD_CARD': return { ...state, boardCards: [...state.boardCards, action.card] };
    case 'REMOVE_BOARD_CARD': return { ...state, boardCards: state.boardCards.filter(c => c.id !== action.cardId) };
    case 'UPDATE_BOARD_CARD': return {
      ...state,
      boardCards: state.boardCards.map(c => c.id === action.cardId ? { ...c, ...action.updates } : c)
    };
    case 'SET_CURRICULUM_DECK': return { ...state, curriculumDeck: action.deck };
    case 'SET_LAST_SENT_CARD_ID': return { ...state, lastSentCardId: action.id };
    case 'SET_FLAGGED_CARDS': return { ...state, flaggedCards: action.cards };
    case 'SET_FLAGGED_CARD': {
      const m = new Map(state.flaggedCards);
      m.set(action.cardId, action.annotation);
      return { ...state, flaggedCards: m };
    }
    case 'REMOVE_FLAGGED_CARD': {
      const m = new Map(state.flaggedCards);
      m.delete(action.cardId);
      return { ...state, flaggedCards: m };
    }
    case 'SET_EXERCISE_RESULT':
      return { ...state, exerciseResults: { ...state.exerciseResults, [action.cardId]: action.correct } };
    case 'RESET_EXERCISE_RESULTS':
      return { ...state, exerciseResults: {} };
    case 'INCREMENT_CONFIDENCE':
      return {
        ...state,
        confidenceCounts: { ...state.confidenceCounts, [action.level]: state.confidenceCounts[action.level] + 1 }
      };
    case 'RESET_CONFIDENCE':
      return { ...state, confidenceCounts: { 'got-it': 0, 'too-fast': 0, 'need-example': 0 } };
    case 'SET_ACTIVE_POLL':
      return { ...state, activePoll: action.poll, pollResults: {} };
    case 'SET_POLL_VOTE':
      return { ...state, pollResults: { ...state.pollResults, [action.choiceIndex]: (state.pollResults[action.choiceIndex] || 0) + 1 } };
    case 'RESET_POLL':
      return { ...state, activePoll: null, pollResults: {} };
    case 'RESET_FREE_MODE': return {
      ...state,
      targetLanguage: null,
      difficulty: null,
      instructionLanguage: null,
      isRecording: false,
      status: '',
      transcripts: [],
      liveTranscript: { user: '', ai: '' },
      whiteboardTopics: [],
      paceHistory: [],
      sessionSummary: null,
      sessionDuration: null,
      latency: null,
    };
    case 'RESET_CLASS_MODE': return {
      ...state,
      currentLesson: null,
      classSession: null,
      currentPhase: 'introduction',
      sessionElapsedTime: 0,
      showCompletion: false,
      exerciseResults: {},
    };
    case 'RESET_BOARD': return {
      ...state,
      boardCards: [],
      curriculumDeck: null,
      lastSentCardId: null,
      flaggedCards: new Map(),
    };
    case 'BATCH': return { ...state, ...action.updates };
    default: return state;
  }
}

// ── Context ──

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Sync progress from server on boot (Phase 5)
  useEffect(() => {
    const sync = async () => {
      try {
        const { syncProgressFromServer } = await import('../utils/progress');
        await syncProgressFromServer();
      } catch (e) {
        console.warn('Boot sync failed:', e);
      }
    };
    sync();
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
