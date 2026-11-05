import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { LiveBoard } from '../components/LiveBoard';
import { SessionCodeInput } from '../components/SessionCodeInput';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { PTTButton } from '../components/PTTButton';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { useWebRTC } from '../hooks/useWebRTC';
import { StateSyncManager } from '../utils/stateSync';
import { buildReviewSession, saveSessionToHistory } from '../utils/reviewHistory';
import { loadAccount } from '../utils/account';
import type { BoardCard } from '../types/board';
import { LiveKitRoom } from '@livekit/components-react';
import '@livekit/components-styles';

export function StudentSessionPage() {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const account = loadAccount();
    const { roomCode, showSessionCodeInput, boardCards, connectionError } = state;

    const stateSyncRef = useRef<StateSyncManager | null>(null);
    const sessionBoardStartRef = useRef<number>(Date.now());
    const livekitToken = null;
    const livekitUrl = null;

    const {
        connect, disconnect, connectionState, socket, error: webrtcError,
    } = useWebRTC({
        roomId: roomCode || '',
        isTutor: false,
        displayName: account?.displayName || 'Student',
        onPeerJoined: () => {},
        onPeerLeft: () => {},
    });

    // Connect when code is entered
    useEffect(() => {
        if (roomCode) connect();
    }, [roomCode, connect]);

    // Initialize state sync
    useEffect(() => {
        if (socket && roomCode) {
            const stateSync = new StateSyncManager(socket, roomCode, false);
            stateSyncRef.current = stateSync;

            stateSync.onStateUpdate('PUSH_CARD', (event) => {
                if (event.type === 'PUSH_CARD') {
                    dispatch({ type: 'APPEND_BOARD_CARD', card: { ...event.card, revealState: 'incoming', revealedAt: Date.now() } });
                }
            });
            stateSync.onStateUpdate('RETRACT_CARD', (event) => {
                if (event.type === 'RETRACT_CARD') {
                    dispatch({ type: 'REMOVE_BOARD_CARD', cardId: event.cardId });
                }
            });
            stateSync.onStateUpdate('CLEAR_BOARD', () => {
                dispatch({ type: 'SET_BOARD_CARDS', cards: [] });
            });
            stateSync.onStateUpdate('CHANGE_PHASE', (event) => {
                if (event.type === 'CHANGE_PHASE') dispatch({ type: 'SET_CURRENT_PHASE', phase: event.phase });
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

    const handleFlagCard = useCallback((cardId: string, annotationText?: string) => {
        dispatch({ type: 'UPDATE_BOARD_CARD', cardId, updates: { flagged: true } });
        stateSyncRef.current?.sendStudentSignal({ type: 'STUDENT_FLAG_CARD', cardId, annotationText });
    }, []);

    const handleUnflagCard = useCallback((cardId: string) => {
        dispatch({ type: 'UPDATE_BOARD_CARD', cardId, updates: { flagged: false } });
        stateSyncRef.current?.sendStudentSignal({ type: 'STUDENT_UNFLAG_CARD', cardId });
    }, []);

    const handleEndSession = useCallback(() => {
        if (boardCards.length > 0) {
            const lang = (boardCards[0]?.language as any) ?? 'german';
            const lvl = (boardCards[0]?.level as any) ?? 'A1.1';
            const session = buildReviewSession(
                `session-${Date.now()}`,
                'unknown', 'Session',
                lang, lvl,
                boardCards, sessionBoardStartRef.current,
                undefined,
                account?.id
            );
            saveSessionToHistory(session);
        }
        dispatch({ type: 'RESET_BOARD' });
        disconnect();
        dispatch({ type: 'SET_ROOM_CODE', code: null });
        dispatch({ type: 'SET_IS_TUTOR_MODE', v: false });
        navigate('/');
    }, [boardCards, disconnect, navigate]);

    return (
        <LiveKitRoom serverUrl={livekitUrl || undefined} token={livekitToken || undefined} connect={true} className="bg-gray-900 text-white h-[100dvh] flex flex-col overflow-hidden">
            {showSessionCodeInput && (
                <SessionCodeInput
                    onJoin={(code) => {
                        dispatch({ type: 'SET_ROOM_CODE', code });
                        dispatch({ type: 'SET_SHOW_SESSION_CODE_INPUT', v: false });
                        dispatch({ type: 'SET_CONNECTION_ERROR', e: null });
                        sessionBoardStartRef.current = Date.now();
                    }}
                    onCancel={() => { dispatch({ type: 'SET_SHOW_SESSION_CODE_INPUT', v: false }); navigate('/role-selection'); }}
                    error={connectionError}
                />
            )}

            <header className="bg-gray-800/50 px-2 sm:px-4 py-3 border-b border-gray-700 flex justify-between items-center shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-lg sm:text-xl shrink-0">🎓</span>
                    <h1 className="text-sm sm:text-base font-bold truncate">Student</h1>
                    {account?.displayName && <span className="hidden sm:inline text-xs text-gray-400 truncate">· {account.displayName}</span>}
                    {roomCode && <span className="text-[10px] sm:text-xs text-gray-500 truncate">Room: {roomCode}</span>}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <ConnectionStatus state={connectionState} roomCode={roomCode || undefined} />
                    <button onClick={handleEndSession} className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors">Leave</button>
                    <button onClick={() => navigate('/review-history')} className="text-xs text-gray-400 hover:text-blue-400 transition-colors">📖 History</button>
                </div>
            </header>

            <main className="flex-grow flex flex-col min-h-0 p-3">
                {webrtcError && (
                    <div className="mb-4 bg-red-900/80 border border-red-500 text-red-100 text-sm rounded-xl px-4 py-3">
                        <p className="font-bold">Server offline or unreachable</p>
                        <button onClick={connect} className="mt-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs">Retry</button>
                    </div>
                )}
                {!roomCode ? (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <div>
                            <div className="text-5xl mb-3 opacity-40">⏳</div>
                            <p className="font-medium text-gray-400">Waiting to join</p>
                            <p className="text-sm mt-1 text-gray-600">Enter your tutor's room code to connect</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col min-h-0 gap-4">
                        <div className="flex-1 min-h-0">
                            <LiveBoard cards={boardCards} tutorName="Your Tutor" onFlagCard={handleFlagCard} onUnflagCard={handleUnflagCard} />
                        </div>
                        <div className="shrink-0 flex flex-col items-center gap-3 pb-4">
                            <ConfidenceBar onConfidence={(level) => {
                                stateSyncRef.current?.sendStudentSignal({ type: 'STUDENT_CONFIDENCE', level, timestamp: Date.now() });
                            }} />
                            <PTTButton />
                        </div>
                    </div>
                )}
            </main>
        </LiveKitRoom>
    );
}
