import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LiveBoard } from '../components/LiveBoard';
import { TutorDeckPanel } from '../components/TutorDeckPanel';
import { RoomCodeDisplay } from '../components/RoomCodeDisplay';
import { StudentRoster } from '../components/StudentRoster';
import { TutorConfidenceTally } from '../components/TutorConfidenceTally';
import { useWebRTC } from '../hooks/useWebRTC';
import { StateSyncManager } from '../utils/stateSync';
import { buildReviewSession, saveSessionToHistory } from '../utils/reviewHistory';
import { loadAccount } from '../utils/account';
import type { BoardCard } from '../types/board';
import { markCardSent, markCardUnsent } from '../utils/curriculumDeck';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';

export function TutorSessionPage() {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const account = loadAccount();
    const {
        currentLesson, currentPhase, roomCode, boardCards, curriculumDeck,
        lastSentCardId, flaggedCards, connectionError,
    } = state;

    const stateSyncRef = useRef<StateSyncManager | null>(null);
    const sessionBoardStartRef = useRef<number>(Date.now());
    const livekitToken = null;
    const livekitUrl = null;

    // Generate room code
    useEffect(() => {
        if (!roomCode) {
            const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
                code += characters[Math.floor(Math.random() * characters.length)];
            }
            dispatch({ type: 'SET_ROOM_CODE', code });
        }
    }, []);

    const {
        connect, disconnect, connectionState, socket, error: webrtcError,
    } = useWebRTC({
        roomId: roomCode || '',
        isTutor: true,
        displayName: account?.displayName || 'Tutor',
        onPeerJoined: () => {},
        onPeerLeft: () => {},
    });

    // Connect when room is ready
    useEffect(() => {
        if (roomCode) connect();
    }, [roomCode, connect]);

    // Initialize state sync
    useEffect(() => {
        if (socket && roomCode) {
            const stateSync = new StateSyncManager(socket, roomCode, true);
            stateSyncRef.current = stateSync;

            stateSync.onStudentSignal('STUDENT_FLAG_CARD', (signal) => {
                if (signal.type === 'STUDENT_FLAG_CARD') {
                    dispatch({ type: 'SET_FLAGGED_CARD', cardId: signal.cardId, annotation: signal.annotationText });
                    dispatch({ type: 'UPDATE_BOARD_CARD', cardId: signal.cardId, updates: { flagged: true } });
                }
            });
            stateSync.onStudentSignal('STUDENT_UNFLAG_CARD', (signal) => {
                if (signal.type === 'STUDENT_UNFLAG_CARD') {
                    dispatch({ type: 'REMOVE_FLAGGED_CARD', cardId: signal.cardId });
                    dispatch({ type: 'UPDATE_BOARD_CARD', cardId: signal.cardId, updates: { flagged: false } });
                }
            });
            stateSync.onStudentSignal('STUDENT_CONFIDENCE', (signal) => {
                if (signal.type === 'STUDENT_CONFIDENCE') {
                    dispatch({ type: 'INCREMENT_CONFIDENCE', level: signal.level });
                }
            });

            socket.on('board-rehydrate', ({ cards }: { cards: BoardCard[] }) => {
                dispatch({ type: 'SET_BOARD_CARDS', cards });
            });

            return () => {
                stateSync.disconnect();
                stateSyncRef.current = null;
                socket.off('board-rehydrate');
            };
        }
    }, [socket, roomCode]);

    const handlePushCard = useCallback((card: BoardCard) => {
        const stamped = { ...card, revealedAt: Date.now(), revealState: 'active' as const };
        dispatch({ type: 'APPEND_BOARD_CARD', card: stamped });
        dispatch({ type: 'SET_LAST_SENT_CARD_ID', id: stamped.id });
        if (curriculumDeck) dispatch({ type: 'SET_CURRICULUM_DECK', deck: markCardSent(curriculumDeck, stamped.id) });
        stateSyncRef.current?.sendStateUpdate({ type: 'PUSH_CARD', card: stamped });
    }, [curriculumDeck]);

    const handleRetractLastCard = useCallback(() => {
        if (!lastSentCardId) return;
        dispatch({ type: 'REMOVE_BOARD_CARD', cardId: lastSentCardId });
        if (curriculumDeck) dispatch({ type: 'SET_CURRICULUM_DECK', deck: markCardUnsent(curriculumDeck, lastSentCardId) });
        stateSyncRef.current?.sendStateUpdate({ type: 'RETRACT_CARD', cardId: lastSentCardId });
        dispatch({ type: 'SET_LAST_SENT_CARD_ID', id: null });
    }, [lastSentCardId, curriculumDeck]);

    const handleEndSession = useCallback(() => {
        if (boardCards.length > 0) {
            const lang = (boardCards[0]?.language as any) ?? currentLesson?.language ?? 'german';
            const lvl = (boardCards[0]?.level as any) ?? currentLesson?.level ?? 'A1.1';
            const session = buildReviewSession(
                `session-${Date.now()}`,
                currentLesson?.id ?? 'unknown',
                currentLesson?.topic ?? 'Session',
                lang, lvl,
                boardCards, sessionBoardStartRef.current,
                account?.displayName ?? 'Tutor',
                account?.id
            );
            saveSessionToHistory(session);
        }
        dispatch({ type: 'RESET_BOARD' });
        disconnect();
        dispatch({ type: 'SET_ROOM_CODE', code: null });
        dispatch({ type: 'SET_IS_TUTOR_MODE', v: false });
        navigate('/');
    }, [boardCards, currentLesson, disconnect, navigate]);

    return (
        <LiveKitRoom serverUrl={livekitUrl || undefined} token={livekitToken || undefined} connect={true} className="bg-gray-900 text-white h-[100dvh] flex flex-col overflow-hidden">
            <header className="bg-gray-800/50 px-2 sm:px-4 py-3 border-b border-gray-700 flex justify-between items-center shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">👨‍🏫</span>
                    <h1 className="text-sm sm:text-base font-bold truncate">Tutor</h1>
                    {account?.displayName && <span className="hidden sm:inline text-xs text-gray-400 truncate">· {account.displayName}</span>}
                    {currentLesson && <span className="hidden xs:inline text-[10px] sm:text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full truncate">{currentLesson.topic}</span>}
                </div>
                <div className="flex items-center gap-3">
                    {roomCode && <RoomCodeDisplay roomCode={roomCode} onCopyCode={() => navigator.clipboard.writeText(roomCode)} copied={false} studentConnected={connectionState === 'connected'} />}
                    <button onClick={handleEndSession} className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">End Session</button>
                </div>
            </header>

            <main className="flex-grow flex flex-col md:flex-row gap-3 p-2 sm:p-3 min-h-0 overflow-hidden">
                {webrtcError && (
                    <div className="absolute top-16 left-0 right-0 mx-3 bg-red-900/80 border border-red-500 text-red-100 text-sm rounded-xl px-4 py-3 z-50">
                        <p className="font-bold">Server offline or unreachable</p>
                        <p className="text-red-200 text-xs mt-1">Make sure the backend is running with <code className="bg-red-950 px-1 rounded">npm run server</code></p>
                        <button onClick={connect} className="mt-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs">Retry</button>
                    </div>
                )}
                <div className="w-full md:w-72 shrink-0 flex flex-col min-h-0 h-1/2 md:h-full">
                    {curriculumDeck ? (
                        <TutorDeckPanel deck={curriculumDeck} currentPhase={currentPhase} flaggedCardIds={flaggedCards} onPushCard={handlePushCard} onRetractLastCard={handleRetractLastCard} lastSentCardId={lastSentCardId} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm text-center gap-2">
                            <span className="text-4xl">📚</span>
                            <p>No lesson loaded.</p>
                            <button onClick={() => navigate('/lesson-picker')} className="mt-2 text-blue-400 hover:text-blue-300 text-xs underline">Pick a lesson</button>
                        </div>
                    )}
                </div>
                <div className="flex-1 flex flex-col min-h-0 h-1/2 md:h-full gap-3">
                    <div className="flex-1 flex flex-col min-h-0 bg-gray-800/50 rounded-xl border border-gray-700">
                        <div className="text-xs text-gray-500 mb-2 px-3 pt-3">👁 Student board preview</div>
                        <div className="flex-1 min-h-0">
                            <LiveBoard cards={boardCards} tutorName="You (Tutor)" onFlagCard={() => {}} onUnflagCard={() => {}} />
                        </div>
                    </div>
                    <TutorConfidenceTally counts={state.confidenceCounts} studentCount={state.boardCards.length > 0 ? 1 : 0} />
                    <div className="h-48 shrink-0">
                        <StudentRoster socket={socket} roomId={roomCode || ''} isTutor={true} tutorName={account?.displayName || 'Tutor'} />
                    </div>
                </div>
            </main>
        </LiveKitRoom>
    );
}
