import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { ModeSelector } from './components/ModeSelector';
import { RoleSelector } from './components/RoleSelector';
import { LanguageLevelPicker } from './components/LanguageLevelPicker';
import { LessonPicker } from './components/LessonPicker';
import { ReviewHistory } from './components/ReviewHistory';
import { getAuthState, loadAccount, signOut } from './utils/account';
import { buildDeckFromLesson } from './utils/curriculumDeck';
import type { TargetLanguage } from './context/AppContext';
import type { AppMode } from './components/ModeSelector';
import { FreeModeApp } from './pages/FreeModeApp';
import { TutorSessionPage } from './pages/TutorSessionPage';
import { StudentSessionPage } from './pages/StudentSessionPage';

function AuthPage() {
  const { dispatch } = useAppContext();
  return <AuthGate onAuthenticated={() => dispatch({ type: 'SET_AUTH', isAuthed: true })} />;
}

function ModeSelectPage() {
  const { dispatch } = useAppContext();
  const navigate = useNavigate();
  const account = loadAccount();

  return (
    <ModeSelector
      account={account}
      onModeSelect={(mode: AppMode) => {
        dispatch({ type: 'SET_APP_MODE', mode });
        if (mode === 'free') navigate('/setup');
        else if (mode === 'class') navigate('/language-level');
        else if (mode === 'human-tutor') navigate('/role-selection');
      }}
      onReviewHistory={() => navigate('/review-history')}
      onSignOut={() => {
        signOut();
        dispatch({ type: 'SET_AUTH', isAuthed: false });
      }}
    />
  );
}

function RoleSelectionPage() {
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  return (
    <RoleSelector
      onSelectRole={(isTutor) => {
        dispatch({ type: 'SET_IS_TUTOR_MODE', v: isTutor });
        if (isTutor) navigate('/tutor-session');
        else {
          dispatch({ type: 'SET_SHOW_SESSION_CODE_INPUT', v: true });
          navigate('/student-session');
        }
      }}
      onBack={() => navigate('/')}
    />
  );
}

function LanguageLevelPickerPage() {
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  return (
    <LanguageLevelPicker
      onSelect={(language, level) => {
        dispatch({ type: 'SET_TARGET_LANGUAGE', lang: language as TargetLanguage });
        dispatch({ type: 'SET_CLASS_LEVEL', level });
        navigate('/lesson-picker');
      }}
      onBack={() => navigate('/')}
    />
  );
}

function LessonPickerPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  return (
    <div className="bg-gray-900 text-white h-[100dvh] flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-6xl w-full">
        <LessonPicker
          language={state.targetLanguage || 'german'}
          level={state.classLevel as any}
          onLessonSelect={(lesson) => {
            dispatch({ type: 'SET_CURRENT_LESSON', lesson });
            dispatch({ type: 'SET_TARGET_LANGUAGE', lang: lesson.language as TargetLanguage });
            dispatch({ type: 'SET_DIFFICULTY', d: 'beginner' });
            dispatch({ type: 'SET_INSTRUCTION_LANGUAGE', lang: 'english' });
            dispatch({ type: 'SET_CURRENT_PHASE', phase: 'introduction' });
            if (state.appMode === 'human-tutor') {
              const sessionId = `session-${Date.now()}`;
              const deck = buildDeckFromLesson(lesson, sessionId);
              dispatch({ type: 'SET_CURRICULUM_DECK', deck });
              navigate('/tutor-session');
            } else {
              navigate('/conversation');
            }
          }}
          onBack={() => navigate('/')}
        />
      </div>
    </div>
  );
}

function ReviewHistoryPage() {
  const navigate = useNavigate();
  return <ReviewHistory onBack={() => navigate('/')} />;
}

function AppRoutes() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  if (!state.isAuthed) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<ModeSelectPage />} />
      <Route path="/setup" element={<FreeModeApp />} />
      <Route path="/role-selection" element={<RoleSelectionPage />} />
      <Route path="/language-level" element={<LanguageLevelPickerPage />} />
      <Route path="/lesson-picker" element={<LessonPickerPage />} />
      <Route path="/tutor-session" element={<TutorSessionPage />} />
      <Route path="/student-session" element={<StudentSessionPage />} />
      <Route path="/conversation" element={<FreeModeApp />} />
      <Route path="/review-history" element={<ReviewHistoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
