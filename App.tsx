
import React, { useState, useRef, useEffect, useCallback } from 'react';
// Fixed: Removed non-existent LiveSession export from @google/genai
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type, FunctionDeclaration } from "@google/genai";
import { TranscriptEntry, SessionSummary, PaceUpdate } from './types';
import { decode, decodeAudioData, encode } from './utils/audio';
import { MicrophoneIcon, StopIcon, LoadingSpinner } from './components/icons';
import { HoverToTranslate } from './components/HoverToTranslate';
import { Whiteboard } from './components/Whiteboard';
import { NetworkIndicator } from './components/NetworkIndicator';
import { SessionSummaryComponent } from './components/SessionSummary';
import { PaceSetterLog } from './components/PaceSetterLog';
// Class mode imports
import { ModeSelector, type AppMode } from './components/ModeSelector';
import { LessonPicker } from './components/LessonPicker';
import { ClassHUD } from './components/ClassHUD';
import { LessonComplete } from './components/LessonComplete';
import { ReconnectionIndicator } from './components/ReconnectionIndicator';
import type { Lesson, ClassSession, LessonPhase } from './types/lesson';
import { getUserProgress, initializeProgress, completeLesson, addStudyTime } from './utils/progress';
import { createClassSession } from './utils/sessionManager';
import { getClassModeSystemInstruction } from './utils/classInstructions';
// Human tutor connectivity imports
import { TutorControlPanel } from './components/TutorControlPanel';
import { SessionCodeInput } from './components/SessionCodeInput';
import { ConnectionStatus } from './components/ConnectionStatus';
import { AudioIndicator } from './components/AudioIndicator';
import { useWebRTC } from './hooks/useWebRTC';
import { StateSyncManager } from './utils/stateSync';
import { RoleSelector } from './components/RoleSelector';
import { RoomCodeDisplay } from './components/RoomCodeDisplay';

const languageConfig = {
    german: { name: 'German', tutor: 'Klaus', flag: 'https://img.icons8.com/color/48/germany.png', startPhrase: 'Hallo! Ich bin Klaus. Wie heißt du?' },
    french: { name: 'French', tutor: 'Amélie', flag: 'https://img.icons8.com/color/48/france.png', startPhrase: 'Bonjour! Je m\'appelle Amélie. Comment t\'appelles-tu?' },
    spanish: { name: 'Spanish', tutor: 'Sofía', flag: 'https://img.icons8.com/color/48/spain.png', startPhrase: '¡Hola! Soy Sofía. ¿Cómo te llamas?' },
    chinese: { name: 'Chinese', tutor: 'Lín', flag: 'https://img.icons8.com/color/48/china.png', startPhrase: '你好！我叫林。你叫什么名字？' },
    english: { name: 'English', tutor: 'David', flag: 'https://img.icons8.com/color/48/great-britain.png', startPhrase: 'Hello! My name is David. What\'s your name?' },
};
type TargetLanguage = keyof typeof languageConfig;
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type InstructionLanguage = 'english' | 'spanish' | 'french';
type Audibility = 'silent' | 'poor' | 'good' | 'clipping';
type View = 'setup' | 'conversation' | 'summary' | 'mode-select' | 'lesson-picker' | 'role-selection' | 'tutor-session' | 'student-session';

const App: React.FC = () => {
    const [view, setView] = useState<View>('mode-select');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    const [liveTranscript, setLiveTranscript] = useState({ user: '', ai: '' });
    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [instructionLanguage, setInstructionLanguage] = useState<InstructionLanguage | null>(null);
    const [whiteboardTopics, setWhiteboardTopics] = useState<string[]>([]);
    const [audibility, setAudibility] = useState<Audibility>('silent');
    const [latency, setLatency] = useState<number | null>(null);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
    const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
    const [sessionDuration, setSessionDuration] = useState<string | null>(null);
    const [devMode, setDevMode] = useState<boolean>(false);
    const [paceHistory, setPaceHistory] = useState<PaceUpdate[]>([]);

    // Class mode state
    const [appMode, setAppMode] = useState<AppMode>('free');
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [classSession, setClassSession] = useState<ClassSession | null>(null);
    const [currentPhase, setCurrentPhase] = useState<LessonPhase>('introduction');
    const [sessionElapsedTime, setSessionElapsedTime] = useState<number>(0);
    const [showCompletion, setShowCompletion] = useState(false);
    const [completionScore, setCompletionScore] = useState(85);

    // Reconnection state
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const maxReconnectAttempts = 3;
    const reconnectTimeoutRef = useRef<number | null>(null);

    // Human tutor connectivity state
    const [isTutorMode, setIsTutorMode] = useState(false); // true = tutor, false = student
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [showSessionCodeInput, setShowSessionCodeInput] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [copiedRoomCode, setCopiedRoomCode] = useState(false);
    const stateSyncRef = useRef<StateSyncManager | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);

    // Initialize WebRTC for human tutor mode
    const {
        connect,
        disconnect,
        connectionState,
        localStream,
        remoteStream,
        socket,
        error: webrtcError,
        audioRef: webrtcAudioRef,
    } = useWebRTC({
        roomId: roomCode || '',
        isTutor: isTutorMode,
        onPeerJoined: () => {
            console.log('👥 Peer connected!');
        },
        onPeerLeft: () => {
            console.log('👋 Peer disconnected');
        },
    });


    // Fixed: Changed sessionPromiseRef type to any since LiveSession is not exported from @google/genai
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextsRef = useRef<{ input: AudioContext | null; output: AudioContext | null }>({ input: null, output: null });
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // Changed from processorNodeRef
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const audibilityRef = useRef<Audibility>('silent');
    const userTurnEndTimestampRef = useRef<number | null>(null);
    const sessionStartTimeRef = useRef<number | null>(null);

    const currentInputTranscriptionRef = useRef<string>('');
    const currentOutputTranscriptionRef = useRef<string>('');
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [transcripts, liveTranscript]);

    // Create class session when lesson is selected
    useEffect(() => {
        if (appMode === 'class' && currentLesson && !classSession) {
            const newSession = createClassSession(currentLesson.id);
            setClassSession(newSession);
            setCurrentPhase('introduction');
            console.log('✅ Class session created:', newSession.id);
        }
    }, [appMode, currentLesson, classSession]);

    // Session timer for class mode
    useEffect(() => {
        if (appMode === 'class' && classSession && isRecording) {
            const interval = setInterval(() => {
                setSessionElapsedTime(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [appMode, classSession, isRecording]);

    // Create room code for tutor when entering tutor session
    useEffect(() => {
        if (view === 'tutor-session' && isTutorMode && !roomCode) {
            // Check localStorage first
            const savedCode = localStorage.getItem('kelsey_tutor_room_code');
            if (savedCode) {
                setRoomCode(savedCode);
                console.log('♻️ Restored room code from storage:', savedCode);
            } else {
                // Generate a simple 6-character room code
                const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                let code = '';
                for (let i = 0; i < 6; i++) {
                    code += characters[Math.floor(Math.random() * characters.length)];
                }
                setRoomCode(code);
                localStorage.setItem('kelsey_tutor_room_code', code);
                console.log('📝 Room generated locally:', code);
            }
        }
    }, [view, isTutorMode, roomCode]);

    // Connect tutor to WebRTC when room is ready
    useEffect(() => {
        if (view === 'tutor-session' && roomCode && isTutorMode) {
            console.log('🔌 Tutor connecting to room:', roomCode);
            connect();
        }
    }, [view, roomCode, isTutorMode, connect]);

    // Connect student to WebRTC when code is entered
    useEffect(() => {
        if (view === 'student-session' && roomCode && !isTutorMode) {
            console.log('🔌 Student connecting to room:', roomCode);
            connect();
        }
    }, [view, roomCode, isTutorMode, connect]);

    // Play remote audio stream
    useEffect(() => {
        if (remoteStream && remoteAudioRef.current) {
            console.log('🔊 Setting up remote audio playback');
            remoteAudioRef.current.srcObject = remoteStream;

            // Attempt to play (browsers may block autoplay)
            remoteAudioRef.current.play()
                .then(() => {
                    console.log('✅ Remote audio playing');
                })
                .catch(err => {
                    console.error('❌ Error playing remote audio:', err);
                    console.log('🔇 Audio may be muted or require user interaction');
                });
        }
    }, [remoteStream]);

    // Debug connection state
    useEffect(() => {
        const role = isTutorMode ? 'TUTOR' : 'STUDENT';
        console.log(`🔌 [${role}] Connection state changed:`, connectionState);
        console.log(`🔌 [${role}] View:`, view);
        console.log(`🔌 [${role}] Room code:`, roomCode);
    }, [connectionState, isTutorMode, view, roomCode]);

    // Initialize state synchronization
    useEffect(() => {
        if (socket && roomCode && (view === 'tutor-session' || view === 'student-session')) {
            const stateSync = new StateSyncManager(socket, roomCode, isTutorMode);
            stateSyncRef.current = stateSync;

            // Student: Listen for state updates from tutor
            if (!isTutorMode) {
                stateSync.onStateUpdate('CHANGE_PHASE', (event) => {
                    if (event.type === 'CHANGE_PHASE') {
                        setCurrentPhase(event.phase);
                        console.log('📡 Phase updated:', event.phase);
                    }
                });

                stateSync.onStateUpdate('ADD_WHITEBOARD_NOTE', (event) => {
                    if (event.type === 'ADD_WHITEBOARD_NOTE') {
                        setWhiteboardTopics(prev => [...prev, event.note]);
                        console.log('📡 Note added:', event.note);
                    }
                });

                stateSync.onStateUpdate('REMOVE_WHITEBOARD_NOTE', (event) => {
                    if (event.type === 'REMOVE_WHITEBOARD_NOTE') {
                        setWhiteboardTopics(prev => prev.filter((_, i) => i !== event.index));
                        console.log('📡 Note removed:', event.index);
                    }
                });

                stateSync.onStateUpdate('CLEAR_WHITEBOARD', () => {
                    setWhiteboardTopics([]);
                    console.log('📡 Whiteboard cleared');
                });
            }

            return () => {
                stateSync.disconnect();
                stateSyncRef.current = null;
            };
        }
    }, [socket, roomCode, view, isTutorMode]);

    // Handle phase progression
    const handleNextPhase = useCallback(() => {
        if (!currentLesson) return;

        const currentIndex = currentLesson.phases.findIndex(p => p.phase === currentPhase);
        const isLastPhase = currentIndex === currentLesson.phases.length - 1;

        if (isLastPhase) {
            // Lesson complete - save progress!
            let progress = getUserProgress();
            if (!progress) {
                progress = initializeProgress(
                    currentLesson.language as 'german' | 'french' | 'spanish',
                    instructionLanguage || 'english'
                );
            }

            const assessment = {
                lessonId: currentLesson.id,
                timestamp: Date.now(),
                score: 85,
                exerciseAttempts: [],
                strengths: ['Completed all phases'],
                weaknesses: [],
                recommendedReview: []
            };

            completeLesson(currentLesson.id, assessment);
            addStudyTime(Math.floor(sessionElapsedTime / 60));

            // Show completion modal instead of alert
            setCompletionScore(85);
            setShowCompletion(true);
        } else {
            // Move to next phase
            const nextPhase = currentLesson.phases[currentIndex + 1].phase;
            setCurrentPhase(nextPhase);
            console.log(`✅ Advanced to phase: ${nextPhase}`);

            // Show notification
            const phaseNames: Record<string, string> = {
                introduction: 'Introduction',
                grammar: 'Grammar',
                vocabulary: 'Vocabulary',
                practice: 'Practice',
                assessment: 'Assessment',
                review: 'Review'
            };
            setStatus(`Moving to ${phaseNames[nextPhase]} phase...`);
        }
    }, [currentLesson, currentPhase, sessionElapsedTime, instructionLanguage]);

    // Handle going back to previous phase
    const handlePreviousPhase = useCallback(() => {
        if (!currentLesson) return;

        const currentIndex = currentLesson.phases.findIndex(p => p.phase === currentPhase);

        if (currentIndex > 0) {
            const previousPhase = currentLesson.phases[currentIndex - 1].phase;
            setCurrentPhase(previousPhase);

            const phaseNames: Record<string, string> = {
                introduction: 'Introduction',
                grammar: 'Grammar',
                vocabulary: 'Vocabulary',
                practice: 'Practice',
                assessment: 'Assessment',
                review: 'Review'
            };
            setStatus(`Returning to ${phaseNames[previousPhase]} phase...`);
        }
    }, [currentLesson, currentPhase]);

    useEffect(() => {
        if (isRecording || !targetLanguage) return;

        const tutorName = languageConfig[targetLanguage].tutor;
        if (!difficulty) {
            setStatus('Select a difficulty to begin.');
        } else if (difficulty === 'beginner' && !instructionLanguage) {
            setStatus('Now, select your language of instruction.');
        } else {
            setStatus(`Ready to learn with ${tutorName}?`);
        }
    }, [targetLanguage, difficulty, isRecording, instructionLanguage]);

    const drawVisualizer = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;

        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const avg = bufferLength > 0 ? sum / bufferLength : 0;

            let currentAudibility: Audibility = 'silent';
            if (avg > 120) currentAudibility = 'clipping';
            else if (avg > 35) currentAudibility = 'good';
            else if (avg > 5) currentAudibility = 'poor';

            if (audibilityRef.current !== currentAudibility) {
                audibilityRef.current = currentAudibility;
                setAudibility(currentAudibility);
            }
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            let barColor = 'rgba(59, 130, 246, 0.4)';
            if (currentAudibility === 'good') barColor = 'rgba(74, 222, 128, 0.6)';
            else if (currentAudibility === 'poor') barColor = 'rgba(251, 191, 36, 0.6)';
            else if (currentAudibility === 'clipping') barColor = 'rgba(239, 68, 68, 0.6)';

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] * (canvas.height / 255);
                canvasCtx.fillStyle = barColor;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    }, []);

    const cleanupConversation = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.disconnect();
            analyserRef.current = null;
        }
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
            inputSourceRef.current = null;
        }
        if (audioContextsRef.current.input) {
            audioContextsRef.current.input.close();
            audioContextsRef.current.input = null;
        }
        if (audioContextsRef.current.output) {
            audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) { }
                try { source.disconnect(); } catch (e) { }
            });
            audioSourcesRef.current.clear();
            audioContextsRef.current.output.close();
            audioContextsRef.current.output = null;
        }

        // Clear reconnection timeout
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsReconnecting(false);

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                try { session.close(); } catch (e) { }
            });
            sessionPromiseRef.current = null;
        }
    }, [])

    const generateSessionSummary = useCallback(async (conversation: TranscriptEntry[]): Promise<SessionSummary | null> => {
        if (!aiRef.current || !targetLanguage) return null;
        setIsGeneratingSummary(true);
        const languageName = languageConfig[targetLanguage].name;
        const transcriptText = conversation
            .filter(entry => entry.text)
            .map(entry => `${entry.speaker === 'user' ? 'Student' : 'Tutor'}: ${entry.text}`)
            .join('\n');

        if (!transcriptText) {
            setIsGeneratingSummary(false);
            return null;
        }

        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `You are an expert language coach. Analyze this ${languageName} transcript and provide a JSON summary. Transcript:\n${transcriptText}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            overallFeedback: { type: Type.STRING },
                            fluency: {
                                type: Type.OBJECT,
                                properties: {
                                    rating: { type: Type.STRING },
                                    explanation: { type: Type.STRING }
                                },
                                required: ['rating', 'explanation']
                            },
                            corrections: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        mistake: { type: Type.STRING },
                                        correction: { type: Type.STRING },
                                        explanation: { type: Type.STRING }
                                    },
                                    required: ['mistake', 'correction', 'explanation']
                                }
                            },
                            newVocabulary: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        term: { type: Type.STRING },
                                        definition: { type: Type.STRING }
                                    },
                                    required: ['term', 'definition']
                                }
                            },
                            nextSteps: { type: Type.STRING }
                        },
                        required: ['overallFeedback', 'fluency', 'corrections', 'newVocabulary', 'nextSteps']
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (error) {
            console.error("Failed to generate session summary:", error);
            return null;
        } finally {
            setIsGeneratingSummary(false);
        }
    }, [targetLanguage]);

    const stopConversation = useCallback(async () => {
        setIsRecording(false);
        cleanupConversation();

        if (sessionStartTimeRef.current) {
            const durationInSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
            const minutes = Math.floor(durationInSeconds / 60);
            const seconds = durationInSeconds % 60;
            setSessionDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            sessionStartTimeRef.current = null;
        }

        const validTranscripts = transcripts.filter(t => t.text.trim() !== '');
        setView('summary');
        if (validTranscripts.length > 0) {
            const summary = await generateSessionSummary(validTranscripts);
            setSessionSummary(summary);
        }
    }, [cleanupConversation, generateSessionSummary, transcripts]);

    const processAiTurnAndGetNotes = useCallback(async (aiText: string): Promise<{ notes: string[], translations: Map<string, string> }> => {
        if (!aiRef.current || !aiText || !targetLanguage || !instructionLanguage) return { notes: [], translations: new Map() };
        const languageName = languageConfig[targetLanguage].name;
        const instructionLanguageName = instructionLanguage.charAt(0).toUpperCase() + instructionLanguage.slice(1);
        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analyze the ${languageName} sentence: "${aiText}". Return JSON with 'notes' and 'translations' to ${instructionLanguageName}.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                            translations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        source: { type: Type.STRING },
                                        translation: { type: Type.STRING }
                                    },
                                    required: ['source', 'translation']
                                }
                            }
                        },
                        required: ['notes', 'translations'],
                    }
                }
            });
            const result = JSON.parse(response.text);
            const translations = new Map<string, string>((result.translations || []).map((item: any) => [item.source.toLowerCase().replace(/[^\p{L}\p{M}]/gu, ''), item.translation]));
            return { notes: result.notes || [], translations };
        } catch (error) {
            return { notes: [], translations: new Map() };
        }
    }, [targetLanguage, instructionLanguage]);

    const getSystemInstruction = (targetLang: TargetLanguage, level: Difficulty, instructionLang: InstructionLanguage | null): string => {
        // Use class mode instructions if in class mode with a lesson
        if (appMode === 'class' && currentLesson) {
            return getClassModeSystemInstruction(
                currentLesson,
                currentPhase,
                instructionLang || 'english'
            );
        }

        // Otherwise use free mode instructions
        const { name: languageName, tutor: tutorName, startPhrase } = languageConfig[targetLang];
        const instructionLanguageName = instructionLang?.charAt(0).toUpperCase() + (instructionLang?.slice(1) || 'English');

        switch (level) {
            case 'beginner':
                return `You are ${tutorName}, a ${languageName} language tutor for absolute beginners.
            CRITICAL RULE: You must use ${instructionLanguageName} for 75% of your output and ${languageName} for only 25% initially.
            
            PACE ADJUSTMENT: Call the 'adjustTeachingStrategy' tool when you notice significant changes:
            - Learner struggling (increase ${instructionLanguageName}, slow down)
            - Learner excelling (increase ${languageName}, add complexity)
            - Engagement dropping (change topic, add interaction)
            
            WHITEBOARD NOTES - CRITICAL LIMITS:
            - Add ONLY 3-5 notes per session MAXIMUM
            - Only add the MOST ESSENTIAL words/concepts
            - Focus on: core vocabulary, critical grammar, common mistakes
            - DO NOT add every single word or concept discussed
            - Keep notes concise (one short sentence each)
            - Example good note: "The word 'Hallo' is the standard German greeting."
            - Example bad note: Long explanations or multiple concepts in one note
            
            Your role:
            - Start with ${startPhrase}
            - Teach basic greetings, introductions, and simple phrases
            - Correct pronunciation gently
            - Use repetition and encouragement
            - Keep lessons short and engaging (5-10 minutes)
            - Celebrate small wins
            - REMEMBER: Less is more for beginners - don't overwhelm them!`;
            case 'intermediate':
                return `You are ${tutorName}, an intermediate ${languageName} tutor. Converse mostly in ${languageName}. 
                 Discuss hobbies, travel, or culture. Gently correct errors in ${instructionLanguageName}.
                 
                 WHITEBOARD NOTES: Add ONLY 5-7 notes per session. Focus on new vocabulary, grammar corrections, and idiomatic expressions.
                 Keep notes concise.`;
            case 'advanced':
                return `You are ${tutorName}, an advanced ${languageName} tutor. Converse entirely in ${languageName} at a native speed. 
                Challenge the student on complex topics.
                
                WHITEBOARD NOTES: Add ONLY 5-7 notes per session. Focus on advanced vocabulary, nuanced grammar, and cultural insights.
                Keep notes concise.`;
        }
    }

    const adjustTeachingStrategyTool: FunctionDeclaration = {
        name: 'adjustTeachingStrategy',
        parameters: {
            type: Type.OBJECT,
            description: 'Called by the tutor to evaluate student progress and adjust the lesson pace.',
            properties: {
                evaluation: { type: Type.STRING, description: 'Brief assessment of user confidence and accuracy.' },
                strategy: { type: Type.STRING, description: 'The pedagogical plan for the next few turns.' },
                targetLanguageRatio: { type: Type.NUMBER, description: 'The new ratio of target language usage (0.0 to 1.0).' }
            },
            required: ['evaluation', 'strategy', 'targetLanguageRatio']
        }
    };

    const startConversation = async () => {
        if (!targetLanguage || !difficulty || (difficulty === 'beginner' && !instructionLanguage)) return;
        cleanupConversation();
        setTranscripts([]);
        setWhiteboardTopics([]);
        setPaceHistory([]);
        setLiveTranscript({ user: '', ai: '' });
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        nextStartTimeRef.current = 0;
        setLatency(null);
        sessionStartTimeRef.current = Date.now();
        setStatus('Connecting...');
        setIsRecording(true);
        setView('conversation');

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                setStatus('Error: API key not configured. Please check .env.local file.');
                setIsRecording(false);
                console.error('GEMINI_API_KEY is not set in .env.local file');
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            aiRef.current = ai;
            const tutorName = languageConfig[targetLanguage].tutor;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            // Critical: Ensure AudioContext is resumed before proceeding
            await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);

            audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext };

            const source = inputAudioContext.createMediaStreamSource(stream);
            const analyser = inputAudioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);
            drawVisualizer();

            const sessionPromise = ai.live.connect({
                model: 'gemini-live-2.5-flash-native-audio', // Currently supported Live API model (Jan 2026)
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: getSystemInstruction(targetLanguage, difficulty, instructionLanguage),
                    tools: [{ functionDeclarations: [adjustTeachingStrategyTool] }],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: async () => {
                        console.log('✅ Session opened successfully');
                        setStatus(`You're live with ${tutorName}.`);

                        // Reset reconnection attempts on successful connection
                        setReconnectAttempts(0);
                        setIsReconnecting(false);

                        // Load AudioWorklet module (modern replacement for ScriptProcessorNode)
                        try {
                            await inputAudioContext.audioWorklet.addModule('/audio-capture-processor.js');
                            console.log('🎵 AudioWorklet module loaded');

                            // Create AudioWorkletNode
                            const workletNode = new AudioWorkletNode(inputAudioContext, 'audio-capture-processor');
                            audioWorkletNodeRef.current = workletNode;

                            let audioChunkCount = 0;

                            // Listen for audio data from worklet
                            workletNode.port.onmessage = (event) => {
                                const { audioData } = event.data;

                                // Convert Float32Array to PCM16
                                const pcmBuffer = new Int16Array(audioData.length);
                                for (let i = 0; i < audioData.length; i++) {
                                    pcmBuffer[i] = audioData[i] * 32768;
                                }

                                const pcmBlob: Blob = {
                                    data: encode(new Uint8Array(pcmBuffer.buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };

                                sessionPromiseRef.current?.then(s => {
                                    // Check if session is still active before sending
                                    if (!isRecording) {
                                        return; // Session ended, don't send
                                    }

                                    try {
                                        s.sendRealtimeInput({ media: pcmBlob });
                                        audioChunkCount++;
                                        if (audioChunkCount % 100 === 0) {
                                            console.log(`🎤 Audio chunks sent: ${audioChunkCount}`);
                                        }
                                    } catch (err) {
                                        // Only log if not a closing error
                                        if (!err.message?.includes('CLOSING') && !err.message?.includes('CLOSED')) {
                                            console.error("❌ Error sending audio:", err);
                                        }
                                    }
                                }).catch(err => {
                                    // Session closed, ignore
                                });
                            };

                            // Connect audio pipeline
                            analyser.connect(workletNode);
                            workletNode.connect(inputAudioContext.destination);
                            console.log('🎵 AudioWorklet pipeline connected');
                        } catch (error) {
                            console.error('❌ Failed to load AudioWorklet:', error);
                            setStatus('Audio setup failed. Please refresh.');
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'adjustTeachingStrategy') {
                                    console.log('📊 Pace adjustment called:', fc.args);
                                    const update: PaceUpdate = {
                                        timestamp: Date.now(),
                                        evaluation: fc.args.evaluation as string,
                                        strategy: fc.args.strategy as string,
                                        targetLanguageRatio: fc.args.targetLanguageRatio as number
                                    };
                                    setPaceHistory(prev => [...prev, update]);

                                    // Send tool response with correct format (array)
                                    sessionPromiseRef.current?.then(s => {
                                        try {
                                            s.sendToolResponse({
                                                functionResponses: [{
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { status: "acknowledged", received: true }
                                                }]
                                            });
                                        } catch (err) {
                                            console.error('❌ Error sending tool response:', err);
                                        }
                                    }).catch(err => console.error('❌ Session error:', err));
                                }
                            }
                        }

                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            setLiveTranscript(prev => ({ ...prev, user: currentInputTranscriptionRef.current }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            setLiveTranscript(prev => ({ ...prev, ai: currentOutputTranscriptionRef.current }));
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;
                            if (fullInput) userTurnEndTimestampRef.current = performance.now();
                            let processedData = { notes: [], translations: new Map() };
                            if (fullOutput) processedData = await processAiTurnAndGetNotes(fullOutput);

                            const newEntries: TranscriptEntry[] = [];
                            if (fullInput.trim()) newEntries.push({ speaker: 'user', text: fullInput, timestamp: Date.now() });
                            if (fullOutput.trim()) newEntries.push({ speaker: 'ai', text: fullOutput, translations: processedData.translations, timestamp: Date.now() + 1 });
                            if (newEntries.length > 0) setTranscripts(prev => [...prev, ...newEntries]);
                            if (processedData.notes.length > 0) setWhiteboardTopics(prev => [...prev, ...processedData.notes.filter((n: string) => !prev.includes(n))]);

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setLiveTranscript({ user: '', ai: '' });
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && audioContextsRef.current.output) {
                            if (userTurnEndTimestampRef.current) {
                                setLatency(performance.now() - userTurnEndTimestampRef.current);
                                userTurnEndTimestampRef.current = null;
                            }
                            const outputCtx = audioContextsRef.current.output;
                            try {
                                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                                const sourceNode = outputCtx.createBufferSource();
                                sourceNode.buffer = audioBuffer;
                                sourceNode.connect(outputCtx.destination);
                                sourceNode.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(sourceNode);
                                sourceNode.onended = () => audioSourcesRef.current.delete(sourceNode);
                            } catch (err) {
                                console.error("Audio playback error:", err);
                            }
                        }
                    },
                    onerror: (e) => {
                        console.error("Live session error:", e);
                        setStatus(`Connection error. Retrying...`);
                        setIsRecording(false);
                        cleanupConversation();
                    },
                    onclose: (e) => {
                        console.log("Live session closed:", e);

                        // Disconnect and cleanup audio processor
                        if (audioWorkletNodeRef.current) {
                            audioWorkletNodeRef.current.disconnect();
                            audioWorkletNodeRef.current = null;
                        }

                        // Clear session reference
                        sessionPromiseRef.current = null;

                        // Determine if we should attempt reconnection
                        const shouldAttemptReconnect =
                            isRecording &&
                            reconnectAttempts < maxReconnectAttempts &&
                            e.code !== 1000 && // Not normal closure
                            e.code !== 1001 && // Not going away
                            e.code !== 1008 && // Not implementation/config error (won't succeed on retry)
                            !e.reason.includes('authentication');

                        if (shouldAttemptReconnect) {
                            // Attempt reconnection
                            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
                            setIsReconnecting(true);
                            setReconnectAttempts(prev => prev + 1);
                            setStatus(`Connection lost. Reconnecting in ${delay / 1000}s... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);

                            reconnectTimeoutRef.current = window.setTimeout(() => {
                                console.log(`🔄 Attempting reconnection ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
                                setIsReconnecting(false);
                                // Trigger reconnection by calling startConversation again
                                startConversation();
                            }, delay);
                        } else {
                            // No reconnection - show appropriate message
                            if (reconnectAttempts >= maxReconnectAttempts) {
                                setStatus("Unable to reconnect. Please start a new session.");
                            } else if (e.code === 1008) {
                                console.error('❌ Code 1008 Error:', e.reason);
                                console.error('This usually indicates an audio configuration issue.');
                                console.error('Audio format: PCM 16kHz, 16-bit, mono');
                                setStatus(`Session error: ${e.reason}. Please refresh and try again.`);
                            } else if (e.code === 1011) {
                                setStatus("Session timed out. Start a new session.");
                            } else {
                                setStatus("Connection closed.");
                            }
                            setIsRecording(false);
                            setReconnectAttempts(0);
                        }
                    }
                }
            });
            sessionPromiseRef.current = sessionPromise;
        } catch (error) {
            console.error("Failed to start conversation:", error);
            setIsRecording(false);
            setStatus("Unable to access microphone.");
            cleanupConversation();
        }
    };

    const handleStartNewSession = () => {
        cleanupConversation();
        setTargetLanguage(null);
        setDifficulty(null);
        setInstructionLanguage(null);
        setTranscripts([]);
        setWhiteboardTopics([]);
        setPaceHistory([]);
        setSessionSummary(null);
        setView('setup');
    }

    // Mode selection view
    if (view === 'mode-select') {
        return (
            <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-10 animate-fade-in-down">Language Tutor AI</h1>
                <ModeSelector
                    currentMode={appMode}
                    onModeChange={(mode) => {
                        setAppMode(mode);
                        if (mode === 'free') {
                            setView('setup');
                        } else if (mode === 'class') {
                            setView('lesson-picker');
                        } else if (mode === 'human-tutor') {
                            setView('role-selection');
                        }
                    }}
                />
            </div>
        );
    }

    // Role selection view (for human tutor mode)
    if (view === 'role-selection') {
        return (
            <RoleSelector
                onSelectRole={(isTutor) => {
                    setIsTutorMode(isTutor);
                    if (isTutor) {
                        setView('tutor-session');
                    } else {
                        setShowSessionCodeInput(true);
                        setView('student-session');
                    }
                }}
                onBack={() => setView('mode-select')}
            />
        );
    }

    // Lesson picker view (for class mode)
    if (view === 'lesson-picker') {
        return (
            <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-4 overflow-y-auto">
                <div className="max-w-6xl w-full">
                    <LessonPicker
                        language={targetLanguage || 'german'}
                        level="A1.1"
                        onLessonSelect={(lesson) => {
                            setCurrentLesson(lesson);
                            setTargetLanguage(lesson.language as TargetLanguage);
                            setDifficulty('beginner');
                            setInstructionLanguage('english');
                            setCurrentPhase('introduction');
                            setView('conversation');
                        }}
                        onBack={() => setView('mode-select')}
                    />
                </div>
            </div>
        );
    }

    // Tutor session view (human tutor mode)
    if (view === 'tutor-session') {
        return (
            <div className="bg-gray-900 text-white h-screen flex flex-col overflow-hidden">
                <header className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">👨‍🏫</span>
                        <h1 className="text-xl font-bold">Tutor Session</h1>
                    </div>
                    <button
                        onClick={() => {
                            setView('mode-select');
                            setRoomCode(null);
                            setIsTutorMode(false);
                        }}
                        className="text-sm text-gray-400 hover:text-white"
                    >
                        End & Exit
                    </button>
                </header>

                <main className="flex-grow container mx-auto p-4 flex gap-4 min-h-0 overflow-hidden">
                    {/* Left: Tutor Control Panel with themed scrollbar */}
                    <div className="w-2/5 flex flex-col gap-3 overflow-y-auto tutor-scrollbar" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                        {/* Room Code Card */}
                        {roomCode && (
                            <div className="flex-shrink-0">
                                <RoomCodeDisplay
                                    roomCode={roomCode}
                                    onCopyCode={() => {
                                        navigator.clipboard.writeText(roomCode);
                                        setCopiedRoomCode(true);
                                        setTimeout(() => setCopiedRoomCode(false), 2000);
                                    }}
                                    copied={copiedRoomCode}
                                />
                            </div>
                        )}

                        {/* Audio Levels Card */}
                        <div className="flex-shrink-0 bg-gray-800/60 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
                            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <span className="text-green-400">🎤</span>
                                Audio Levels
                            </h3>
                            <div className="space-y-2">
                                <AudioIndicator stream={localStream} label="Your Mic" />
                                <AudioIndicator stream={remoteStream} label="Student" />
                            </div>
                        </div>

                        {/* Tutor Controls Card */}
                        <div className="flex-1 min-h-0">
                            <TutorControlPanel
                                currentLesson={currentLesson}
                                currentPhase={currentPhase}
                                whiteboardTopics={whiteboardTopics}
                                sessionDuration={sessionElapsedTime}
                                studentConnected={connectionState === 'connected'}
                                onPhaseChange={(phase) => {
                                    setCurrentPhase(phase);
                                    stateSyncRef.current?.sendStateUpdate({
                                        type: 'CHANGE_PHASE',
                                        phase
                                    });
                                }}
                                onAddNote={(note) => {
                                    setWhiteboardTopics([...whiteboardTopics, note]);
                                    stateSyncRef.current?.sendStateUpdate({
                                        type: 'ADD_WHITEBOARD_NOTE',
                                        note
                                    });
                                }}
                                onRemoveNote={(index) => {
                                    setWhiteboardTopics(whiteboardTopics.filter((_, i) => i !== index));
                                    stateSyncRef.current?.sendStateUpdate({
                                        type: 'REMOVE_WHITEBOARD_NOTE',
                                        index
                                    });
                                }}
                                onEndSession={() => {
                                    disconnect();
                                    setView('mode-select');
                                    setRoomCode(null);
                                    setWhiteboardTopics([]);
                                }}
                            />
                        </div>
                    </div>

                    {/* Right: Whiteboard */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <Whiteboard
                            topics={whiteboardTopics}
                            tutorName="You (Tutor)"
                        />
                    </div>
                </main>

                {/* Remote Audio Element */}
                <audio ref={remoteAudioRef} autoPlay controls className="hidden" />
            </div>
        );
    }

    // Student session view (human tutor mode)
    if (view === 'student-session') {
        return (
            <div className="bg-gray-900 text-white h-screen flex flex-col overflow-hidden">
                {/* Session Code Input Modal */}
                {showSessionCodeInput && (
                    <SessionCodeInput
                        onJoin={(code) => {
                            setRoomCode(code);
                            setShowSessionCodeInput(false);
                            setConnectionError(null);
                            // TODO: Join room via WebRTC
                        }}
                        onCancel={() => {
                            setView('role-selection');
                            setShowSessionCodeInput(false);
                        }}
                        error={connectionError}
                    />
                )}

                <header className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎓</span>
                        <h1 className="text-xl font-bold">Student Session</h1>
                        {roomCode && (
                            <span className="text-sm text-gray-400">Room: {roomCode}</span>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            disconnect();
                            setView('mode-select');
                            setRoomCode(null);
                            setIsTutorMode(false);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                        Leave Session
                    </button>
                </header>

                <main className="flex-grow container mx-auto p-4 flex flex-col min-h-0 overflow-hidden">
                    {/* Connection & Audio Status */}
                    <div className="mb-4 space-y-3">
                        {/* Connection Status */}
                        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                            <ConnectionStatus
                                state={connectionState}
                                roomCode={roomCode || undefined}
                            />
                        </div>

                        {/* Audio Levels */}
                        {roomCode && (
                            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">🎤 Audio Levels</h3>
                                <div className="space-y-2">
                                    <AudioIndicator stream={localStream} label="Your Mic" />
                                    <AudioIndicator stream={remoteStream} label="Tutor" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Waiting State */}
                    {!roomCode && (
                        <div className="flex-grow flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-6xl mb-4">⏳</div>
                                <h2 className="text-2xl font-bold mb-2">Waiting to Join</h2>
                                <p className="text-gray-400">Enter your tutor's room code to connect</p>
                            </div>
                        </div>
                    )}

                    {/* Connected State - Whiteboard */}
                    {roomCode && (
                        <div className="flex-grow flex flex-col min-h-0">
                            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mb-4">
                                <p className="text-sm text-blue-300">
                                    🎧 Follow along with your tutor. The whiteboard will update automatically.
                                </p>
                            </div>
                            <Whiteboard
                                topics={whiteboardTopics}
                                tutorName="Your Tutor"
                            />
                        </div>
                    )}
                </main>

                {/* Remote Audio Element */}
                <audio ref={remoteAudioRef} autoPlay controls className="hidden" />
            </div>
        );
    }

    if (!targetLanguage) {
        return (
            <div className="bg-gray-900 text-white h-screen flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-10 animate-fade-in-down">Language Tutor AI</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {(Object.keys(languageConfig) as TargetLanguage[]).map((lang, idx) => (
                        <button key={lang} onClick={() => setTargetLanguage(lang)} className="flex flex-col items-center p-6 bg-gray-800 rounded-xl hover:bg-blue-600 transition-all transform hover:-translate-y-1">
                            <img src={languageConfig[lang].flag} className="h-16 w-16 mb-4" />
                            <span className="text-xl font-semibold">{languageConfig[lang].name}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'summary') {
        return (
            <div className="bg-gray-900 text-white h-screen overflow-y-auto">
                {isGeneratingSummary ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                        <LoadingSpinner className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-semibold">Analyzing your session...</h2>
                    </div>
                ) : sessionSummary ? (
                    <SessionSummaryComponent summary={sessionSummary} duration={sessionDuration} onStartNewSession={handleStartNewSession} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p className="mb-4">Session Complete</p>
                        <button onClick={handleStartNewSession} className="bg-blue-600 p-2 rounded text-white px-6 py-2">New Session</button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-white h-screen flex flex-col overflow-hidden">
            <header className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                    <img src={languageConfig[targetLanguage].flag} className="h-8 w-8" />
                    <h1 className="text-xl font-bold">{languageConfig[targetLanguage].name} Tutor AI</h1>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Dev Mode</span>
                        <button
                            onClick={() => setDevMode(!devMode)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${devMode ? 'bg-blue-500' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${devMode ? 'translate-x-5' : ''}`}></div>
                        </button>
                    </div>
                    {isRecording && <NetworkIndicator latency={latency} />}
                    <ReconnectionIndicator isReconnecting={isReconnecting} attempt={reconnectAttempts} maxAttempts={maxReconnectAttempts} />
                    <button onClick={handleStartNewSession} className="text-sm text-gray-400 hover:text-white">Change Language</button>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
                {/* Transcript - Minimal (Left sidebar) */}
                <div className="md:w-1/4 lg:w-1/5 flex flex-col gap-4 h-full min-h-0">
                    <div className="bg-gray-800 p-3 rounded-lg flex-grow overflow-y-auto border border-gray-700 shadow-inner">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 pb-2 border-b border-gray-700">Conversation</h3>
                        {transcripts.length === 0 && !isRecording && (
                            <div className="h-full flex items-center justify-center text-gray-500 italic text-xs text-center">
                                Conversation history
                            </div>
                        )}
                        {transcripts.map((entry, idx) => {
                            // Hide user transcripts in class mode (focus on speaking, not reading)
                            if (entry.speaker === 'user' && appMode === 'class') {
                                return null;
                            }

                            return (
                                <div key={idx} className={`mb-3 flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-2 rounded text-xs ${entry.speaker === 'user' ? 'bg-blue-900/40 border border-blue-800/50' : 'bg-gray-700 border border-gray-600'}`}>
                                        {entry.speaker === 'ai' ? <HoverToTranslate text={entry.text} translations={entry.translations || new Map()} /> : <div>{entry.text}</div>}
                                    </div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase font-semibold">
                                        {entry.speaker === 'user' ? 'You' : languageConfig[targetLanguage].tutor}
                                    </div>
                                </div>
                            );
                        })}
                        {(liveTranscript.user || liveTranscript.ai) && (
                            <div className="italic text-xs text-gray-500 animate-pulse">
                                {liveTranscript.user && <p>You: {liveTranscript.user}</p>}
                                {liveTranscript.ai && <p>{languageConfig[targetLanguage].tutor}...</p>}
                            </div>
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                    {devMode && <PaceSetterLog updates={paceHistory} />}
                </div>

                {/* Whiteboard - Primary Focus (Center/Main) */}
                <div className="flex-grow flex flex-col w-full h-full min-h-0">
                    {/* Class HUD - only shown in class mode */}
                    {appMode === 'class' && currentLesson && classSession && (
                        <ClassHUD
                            lesson={currentLesson}
                            session={classSession}
                            currentPhase={currentPhase}
                            elapsedTime={sessionElapsedTime}
                            onNextPhase={handleNextPhase}
                            onPreviousPhase={handlePreviousPhase}
                        />
                    )}

                    {/* Whiteboard - Main Content */}
                    <Whiteboard topics={whiteboardTopics} tutorName={languageConfig[targetLanguage].tutor} />

                    <div className="h-24 flex flex-col items-center justify-center bg-gray-800/30 rounded-lg mb-4 shrink-0 border border-gray-800">
                        <p className="text-gray-400 text-sm mb-2">{status}</p>
                        {isRecording && <canvas ref={canvasRef} className="w-64 h-6" />}
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shrink-0">
                        {!isRecording && (
                            <div className="flex flex-col gap-4 max-w-sm mx-auto mb-6">
                                <select value={difficulty || ''} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-white">
                                    <option value="" disabled>Select Proficiency Level</option>
                                    <option value="beginner">Beginner (Adaptive Pace)</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                                {difficulty === 'beginner' && (
                                    <select value={instructionLanguage || ''} onChange={(e) => setInstructionLanguage(e.target.value as InstructionLanguage)} className="bg-gray-700 p-3 rounded-lg border border-gray-600 animate-fade-in text-white">
                                        <option value="" disabled>Instruction Language</option>
                                        <option value="english">English</option>
                                        <option value="spanish">Español</option>
                                        <option value="french">Français</option>
                                    </select>
                                )}
                            </div>
                        )}
                        <div className="flex justify-center">
                            <button onClick={isRecording ? stopConversation : startConversation} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-500/20' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'} shadow-xl`}>
                                {isRecording ? <StopIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-8 h-8" />}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Lesson Completion Modal */}
            {showCompletion && currentLesson && (
                <LessonComplete
                    lesson={currentLesson}
                    score={completionScore}
                    timeSpent={sessionElapsedTime}
                    onContinue={() => {
                        setShowCompletion(false);
                        setView('lesson-picker');
                        setCurrentLesson(null);
                        setClassSession(null);
                        setCurrentPhase('introduction');
                        setSessionElapsedTime(0);
                    }}
                    onBackToMenu={() => {
                        setShowCompletion(false);
                        setView('lesson-picker');
                        setCurrentLesson(null);
                        setClassSession(null);
                        setCurrentPhase('introduction');
                        setSessionElapsedTime(0);
                    }}
                />
            )}
        </div>
    );
};

export default App;
