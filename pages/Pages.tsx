import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ModeSelector, type AppMode } from '../components/ModeSelector';
import { RoleSelector } from '../components/RoleSelector';
import { LanguageLevelPicker } from '../components/LanguageLevelPicker';
import { LessonPicker } from '../components/LessonPicker';
import { ReviewHistory } from '../components/ReviewHistory';
import { getAuthState, loadAccount, signOut } from '../utils/account';
import { buildDeckFromLesson } from '../utils/curriculumDeck';
import type { TargetLanguage } from '../context/AppContext';

export function ModeSelectPage() {
  const { state, dispatch } = useAppContext();
  const account = loadAccount();

  return (
    <ModeSelector
      account={account}
      onModeSelect={(mode) => {
        dispatch({ type: 'SET_APP_MODE', mode });
        if (mode === 'free') {
          // Navigate to setup — handled by parent
          (window as any).__kelseyNavigate?.('/setup');
        } else if (mode === 'class') {
          (window as any).__kelseyNavigate?.('/language-level');
        } else if (mode === 'human-tutor') {
          (window as any).__kelseyNavigate?.('/role-selection');
        }
      }}
      onReviewHistory={() => (window as any).__kelseyNavigate?.('/review-history')}
      onSignOut={() => {
        signOut();
        dispatch({ type: 'SET_AUTH', isAuthed: false });
      }}
    />
  );
}

export function RoleSelectionPage() {
  const { dispatch } = useAppContext();

  return (
    <RoleSelector
      onSelectRole={(isTutor) => {
        dispatch({ type: 'SET_IS_TUTOR_MODE', v: isTutor });
        if (isTutor) {
          (window as any).__kelseyNavigate?.('/tutor-session');
        } else {
          dispatch({ type: 'SET_SHOW_SESSION_CODE_INPUT', v: true });
          (window as any).__kelseyNavigate?.('/student-session');
        }
      }}
      onBack={() => (window as any).__kelseyNavigate?.('/')}
    />
  );
}

export function LanguageLevelPickerPage() {
  const { dispatch } = useAppContext();

  return (
    <LanguageLevelPicker
      onSelect={(language, level) => {
        dispatch({ type: 'SET_TARGET_LANGUAGE', lang: language as TargetLanguage });
        dispatch({ type: 'SET_CLASS_LEVEL', level });
        (window as any).__kelseyNavigate?.('/lesson-picker');
      }}
      onBack={() => (window as any).__kelseyNavigate?.('/')}
    />
  );
}

export function LessonPickerPage() {
  const { state, dispatch } = useAppContext();

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
              (window as any).__kelseyNavigate?.('/tutor-session');
            } else {
              (window as any).__kelseyNavigate?.('/conversation');
            }
          }}
          onBack={() => (window as any).__kelseyNavigate?.('/')}
        />
      </div>
    </div>
  );
}

export function ReviewHistoryPage() {
  return <ReviewHistory onBack={() => (window as any).__kelseyNavigate?.('/')} />;
}
