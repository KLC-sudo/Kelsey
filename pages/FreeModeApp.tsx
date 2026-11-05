import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, type TargetLanguage, type Difficulty, type InstructionLanguage, type Audibility } from '../context/AppContext';
import { GoogleGenAI, LiveServerMessage, Modality, Blob, Type, FunctionDeclaration } from "@google/genai";
import { TranscriptEntry, SessionSummary, PaceUpdate } from '../types';
import { decode, decodeAudioData, encode } from '../utils/audio';
import { MicrophoneIcon, LoadingSpinner } from '../components/icons';
import { HoverToTranslate } from '../components/HoverToTranslate';
import { NetworkIndicator } from '../components/NetworkIndicator';
import { SessionSummaryComponent } from '../components/SessionSummary';
import { PaceSetterLog } from '../components/PaceSetterLog';
import { ReconnectionIndicator } from '../components/ReconnectionIndicator';
import { ClassHUD } from '../components/ClassHUD';
import { LessonComplete } from '../components/LessonComplete';
import { LiveBoard } from '../components/LiveBoard';
import { loadAccount } from '../utils/account';
import { getUserProgress, initializeProgress, completeLesson, addStudyTime } from '../utils/progress';
import { createClassSession } from '../utils/sessionManager';
import { getClassModeSystemInstruction } from '../utils/classInstructions';
import { buildDeckFromLesson, buildVocabQuizCards, buildGrammarFillBlankCards, buildTranslationCards } from '../utils/curriculumDeck';
import { extractCardsForSRS, importCards } from '../utils/srsClient';
import type { BoardCard } from '../types/board';

const languageConfig = {
    german: { name: 'German', tutor: 'Klaus', flag: 'https://img.icons8.com/color/48/germany.png', startPhrase: 'Hallo! Ich bin Klaus. Wie heißt du?' },
    french: { name: 'French', tutor: 'Amélie', flag: 'https://img.icons8.com/color/48/france.png', startPhrase: 'Bonjour! Je m\'appelle Amélie. Comment t\'appelles-tu?' },
    spanish: { name: 'Spanish', tutor: 'Sofía', flag: 'https://img.icons8.com/color/48/spain.png', startPhrase: '¡Hola! Soy Sofía. ¿Cómo te llamas?' },
    chinese: { name: 'Chinese', tutor: 'Lín', flag: 'https://img.icons8.com/color/48/china.png', startPhrase: '你好！我叫林。你叫什么名字？' },
    english: { name: 'English', tutor: 'David', flag: 'https://img.icons8.com/color/48/great-britain.png', startPhrase: 'Hello! My name is David. What\'s your name?' },
};

export function FreeModeApp() {
    const { state, dispatch } = useAppContext();
    const navigate = useNavigate();
    const account = loadAccount();

    const {
        targetLanguage, difficulty, instructionLanguage, isRecording, status,
        transcripts, liveTranscript, whiteboardTopics, audibility, latency,
        isGeneratingSummary, sessionSummary, sessionDuration, devMode, paceHistory,
        appMode, currentLesson, classSession, currentPhase, sessionElapsedTime,
        showCompletion, completionScore, isReconnecting, reconnectAttempts,
    } = state;

    const [sessionPromise, setSessionPromise] = useState<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextsRef = useRef<{ input: AudioContext | null; output: AudioContext | null }>({ input: null, output: null });
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);
    const audibilityRef = useRef<Audibility>('silent');
    const userTurnEndTimestampRef = useRef<number | null>(null);
    const sessionStartTimeRef = useRef<number | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const currentInputTranscriptionRef = useRef<string>('');
    const currentOutputTranscriptionRef = useRef<string>('');
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const maxReconnectAttempts = 3;

    // Create class session when lesson is selected
    useEffect(() => {
        if (appMode === 'class' && currentLesson && !classSession) {
            const newSession = createClassSession(currentLesson.id);
            dispatch({ type: 'SET_CLASS_SESSION', session: newSession });
            dispatch({ type: 'SET_CURRENT_PHASE', phase: 'introduction' });
        }
    }, [appMode, currentLesson, classSession]);

    // Load lesson content onto the board for class mode (0.2)
    useEffect(() => {
        if (appMode === 'class' && currentLesson && state.boardCards.length === 0) {
            const sessionId = `session-${Date.now()}`;
            const meta = { sessionId, lessonId: currentLesson.id, language: currentLesson.language, level: currentLesson.level };
            const deck = buildDeckFromLesson(currentLesson, sessionId);
            const introCards = deck.cards.filter(c => c.phase === 'introduction');

            // Also generate interactive exercise cards (Phase 2)
            const quizCards = buildVocabQuizCards(currentLesson, meta, 5);
            const blankCards = buildGrammarFillBlankCards(currentLesson, meta, 3);
            const transCards = buildTranslationCards(currentLesson, meta, 3);
            const allCards = [...introCards, ...quizCards, ...blankCards, ...transCards];

            allCards.forEach(card => {
                dispatch({ type: 'APPEND_BOARD_CARD', card: { ...card, revealedAt: Date.now(), revealState: 'active' } });
            });
        }
    }, [appMode, currentLesson]);

    // Session timer — runs whenever class mode is active (0.3)
    useEffect(() => {
        if (appMode === 'class' && classSession) {
            const interval = setInterval(() => {
                dispatch({ type: 'SET_SESSION_ELAPSED_TIME', time: state.sessionElapsedTime + 1 });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [appMode, classSession]);

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
                dispatch({ type: 'SET_AUDIBILITY', a: currentAudibility });
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
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        dispatch({ type: 'SET_IS_RECONNECTING', v: false });
        if (sessionPromise) {
            sessionPromise.then((session: any) => {
                try { session.close(); } catch (e) { }
            });
        }
    }, [sessionPromise]);

    const getSystemInstruction = (targetLang: TargetLanguage, level: Difficulty, instructionLang: InstructionLanguage | null): string => {
        if (appMode === 'class' && currentLesson) {
            return getClassModeSystemInstruction(currentLesson, currentPhase, instructionLang || 'english');
        }
        const { name: languageName, tutor: tutorName, startPhrase } = languageConfig[targetLang];
        const instructionLanguageName = instructionLang?.charAt(0).toUpperCase() + (instructionLang?.slice(1) || 'English');

        switch (level) {
            case 'beginner':
                return `You are ${tutorName}, a ${languageName} language tutor for absolute beginners.
            CRITICAL RULE: You must use ${instructionLanguageName} for 75% of your output and ${languageName} for only 25% initially.
            Your role: Start with ${startPhrase}, teach basic greetings, correct pronunciation gently, use repetition and encouragement.`;
            case 'intermediate':
                return `You are ${tutorName}, an intermediate ${languageName} tutor. Converse mostly in ${languageName}. Discuss hobbies, travel, or culture.`;
            case 'advanced':
                return `You are ${tutorName}, an advanced ${languageName} tutor. Converse entirely in ${languageName} at a native speed.`;
        }
    };

    const adjustTeachingStrategyTool: FunctionDeclaration = {
        name: 'adjustTeachingStrategy',
        parameters: {
            type: Type.OBJECT,
            description: 'Called by the tutor to evaluate student progress and adjust the lesson pace.',
            properties: {
                evaluation: { type: Type.STRING, description: 'Brief assessment.' },
                strategy: { type: Type.STRING, description: 'The pedagogical plan.' },
                targetLanguageRatio: { type: Type.NUMBER, description: 'New ratio (0.0 to 1.0).' }
            },
            required: ['evaluation', 'strategy', 'targetLanguageRatio']
        }
    };

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

    const generateSessionSummary = useCallback(async (conversation: TranscriptEntry[]): Promise<SessionSummary | null> => {
        if (!aiRef.current || !targetLanguage) return null;
        dispatch({ type: 'SET_IS_GENERATING_SUMMARY', v: true });
        const languageName = languageConfig[targetLanguage].name;
        const transcriptText = conversation
            .filter(entry => entry.text)
            .map(entry => `${entry.speaker === 'user' ? 'Student' : 'Tutor'}: ${entry.text}`)
            .join('\n');

        if (!transcriptText) {
            dispatch({ type: 'SET_IS_GENERATING_SUMMARY', v: false });
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
                            fluency: { type: Type.OBJECT, properties: { rating: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ['rating', 'explanation'] },
                            corrections: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { mistake: { type: Type.STRING }, correction: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ['mistake', 'correction', 'explanation'] } },
                            newVocabulary: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ['term', 'definition'] } },
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
            dispatch({ type: 'SET_IS_GENERATING_SUMMARY', v: false });
        }
    }, [targetLanguage]);

    const startConversation = async () => {
        if (!targetLanguage || !difficulty || (difficulty === 'beginner' && !instructionLanguage)) return;
        cleanupConversation();
        dispatch({ type: 'SET_TRANSCRIPTS', t: [] });
        dispatch({ type: 'SET_WHITEBOARD_TOPICS', topics: [] });
        dispatch({ type: 'SET_PACE_HISTORY', h: [] });
        dispatch({ type: 'SET_LIVE_TRANSCRIPT', lt: { user: '', ai: '' } });
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        nextStartTimeRef.current = 0;
        dispatch({ type: 'SET_LATENCY', l: null });
        sessionStartTimeRef.current = Date.now();
        dispatch({ type: 'SET_STATUS', s: 'Connecting...' });
        dispatch({ type: 'SET_IS_RECORDING', v: true });

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                dispatch({ type: 'SET_STATUS', s: 'Error: API key not configured.' });
                dispatch({ type: 'SET_IS_RECORDING', v: false });
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            aiRef.current = ai;
            const tutorName = languageConfig[targetLanguage].tutor;
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            await Promise.all([inputAudioContext.resume(), outputAudioContext.resume()]);
            audioContextsRef.current = { input: inputAudioContext, output: outputAudioContext };

            const source = inputAudioContext.createMediaStreamSource(stream);
            const analyser = inputAudioContext.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);
            drawVisualizer();

            const sessionPromiseVal = ai.live.connect({
                model: 'gemini-live-2.5-flash-native-audio',
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
                        dispatch({ type: 'SET_STATUS', s: `You're live with ${tutorName}.` });
                        dispatch({ type: 'SET_RECONNECT_ATTEMPTS', n: 0 });
                        dispatch({ type: 'SET_IS_RECONNECTING', v: false });

                        try {
                            await inputAudioContext.audioWorklet.addModule('/audio-capture-processor.js');
                            const workletNode = new AudioWorkletNode(inputAudioContext, 'audio-capture-processor');
                            audioWorkletNodeRef.current = workletNode;

                            workletNode.port.onmessage = (event) => {
                                const { audioData } = event.data;
                                const pcmBuffer = new Int16Array(audioData.length);
                                for (let i = 0; i < audioData.length; i++) {
                                    pcmBuffer[i] = audioData[i] * 32768;
                                }
                                const pcmBlob: Blob = {
                                    data: encode(new Uint8Array(pcmBuffer.buffer)),
                                    mimeType: 'audio/pcm;rate=16000',
                                };

                                sessionPromiseVal?.then((s: any) => {
                                    try {
                                        s.sendRealtimeInput({ media: pcmBlob });
                                    } catch (err: any) {
                                        if (!err.message?.includes('CLOSING') && !err.message?.includes('CLOSED')) {
                                            console.error("Error sending audio:", err);
                                        }
                                    }
                                }).catch(() => {});
                            };

                            analyser.connect(workletNode);
                            workletNode.connect(inputAudioContext.destination);
                        } catch (error) {
                            console.error('Failed to load AudioWorklet:', error);
                            dispatch({ type: 'SET_STATUS', s: 'Audio setup failed. Please refresh.' });
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'adjustTeachingStrategy') {
                                    const update: PaceUpdate = {
                                        timestamp: Date.now(),
                                        evaluation: fc.args.evaluation as string,
                                        strategy: fc.args.strategy as string,
                                        targetLanguageRatio: fc.args.targetLanguageRatio as number
                                    };
                                    dispatch({ type: 'APPEND_PACE_HISTORY', h: [update] });
                                    sessionPromiseVal?.then((s: any) => {
                                        try {
                                            s.sendToolResponse({
                                                functionResponses: [{ id: fc.id, name: fc.name, response: { status: "acknowledged", received: true } }]
                                            });
                                        } catch (err) { console.error('Error sending tool response:', err); }
                                    }).catch(() => {});
                                }
                            }
                        }

                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            dispatch({ type: 'SET_LIVE_TRANSCRIPT', lt: { user: currentInputTranscriptionRef.current, ai: state.liveTranscript.ai } });
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            dispatch({ type: 'SET_LIVE_TRANSCRIPT', lt: { user: state.liveTranscript.user, ai: currentOutputTranscriptionRef.current } });
                        }

                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;
                            if (fullInput) userTurnEndTimestampRef.current = performance.now();
                            let processedData = { notes: [] as string[], translations: new Map<string, string>() };
                            if (fullOutput) processedData = await processAiTurnAndGetNotes(fullOutput);

                            const newEntries: TranscriptEntry[] = [];
                            if (fullInput.trim()) newEntries.push({ speaker: 'user', text: fullInput, timestamp: Date.now() });
                            if (fullOutput.trim()) newEntries.push({ speaker: 'ai', text: fullOutput, translations: processedData.translations, timestamp: Date.now() + 1 });
                            if (newEntries.length > 0) dispatch({ type: 'APPEND_TRANSCRIPTS', t: newEntries });
                            if (processedData.notes.length > 0) dispatch({ type: 'APPEND_WHITEBOARD_TOPICS', topics: processedData.notes });

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            dispatch({ type: 'SET_LIVE_TRANSCRIPT', lt: { user: '', ai: '' } });
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && audioContextsRef.current.output) {
                            if (userTurnEndTimestampRef.current) {
                                dispatch({ type: 'SET_LATENCY', l: performance.now() - userTurnEndTimestampRef.current });
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
                        dispatch({ type: 'SET_STATUS', s: 'Connection error. Retrying...' });
                        dispatch({ type: 'SET_IS_RECORDING', v: false });
                        cleanupConversation();
                    },
                    onclose: (e) => {
                        if (audioWorkletNodeRef.current) {
                            audioWorkletNodeRef.current.disconnect();
                            audioWorkletNodeRef.current = null;
                        }

                        const shouldAttemptReconnect =
                            state.isRecording &&
                            state.reconnectAttempts < maxReconnectAttempts &&
                            e.code !== 1000 && e.code !== 1001 && e.code !== 1008 &&
                            !e.reason.includes('authentication');

                        if (shouldAttemptReconnect) {
                            const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 10000);
                            dispatch({ type: 'SET_IS_RECONNECTING', v: true });
                            dispatch({ type: 'SET_RECONNECT_ATTEMPTS', n: state.reconnectAttempts + 1 });
                            dispatch({ type: 'SET_STATUS', s: `Connection lost. Reconnecting in ${delay / 1000}s... (${state.reconnectAttempts + 1}/${maxReconnectAttempts})` });

                            reconnectTimeoutRef.current = window.setTimeout(() => {
                                dispatch({ type: 'SET_IS_RECONNECTING', v: false });
                                startConversation();
                            }, delay);
                        } else {
                            if (state.reconnectAttempts >= maxReconnectAttempts) {
                                dispatch({ type: 'SET_STATUS', s: "Unable to reconnect." });
                            } else {
                                dispatch({ type: 'SET_STATUS', s: "Connection closed." });
                            }
                            dispatch({ type: 'SET_IS_RECORDING', v: false });
                            dispatch({ type: 'SET_RECONNECT_ATTEMPTS', n: 0 });
                        }
                    }
                }
            });
            setSessionPromise(sessionPromiseVal);
        } catch (error) {
            console.error("Failed to start conversation:", error);
            dispatch({ type: 'SET_IS_RECORDING', v: false });
            dispatch({ type: 'SET_STATUS', s: "Unable to access microphone." });
            cleanupConversation();
        }
    };

    const stopConversation = useCallback(async () => {
        dispatch({ type: 'SET_IS_RECORDING', v: false });
        cleanupConversation();

        if (sessionStartTimeRef.current) {
            const durationInSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
            const minutes = Math.floor(durationInSeconds / 60);
            const seconds = durationInSeconds % 60;
            dispatch({ type: 'SET_SESSION_DURATION', d: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` });
            sessionStartTimeRef.current = null;
        }

        const validTranscripts = transcripts.filter(t => t.text.trim() !== '');
        if (validTranscripts.length > 0) {
            const summary = await generateSessionSummary(validTranscripts);
            dispatch({ type: 'SET_SESSION_SUMMARY', s: summary });
        }
    }, [cleanupConversation, generateSessionSummary, transcripts]);

    const handleNextPhase = useCallback(() => {
        if (!currentLesson) return;
        const currentIndex = currentLesson.phases.findIndex(p => p.phase === currentPhase);
        const isLastPhase = currentIndex === currentLesson.phases.length - 1;

        if (isLastPhase) {
            let progress = getUserProgress();
            if (!progress) {
                progress = initializeProgress(currentLesson.language as any, instructionLanguage || 'english');
            }

            // Calculate real score from exercise results (Phase 2)
            const results = Object.values(state.exerciseResults);
            const score = results.length > 0
                ? Math.round((results.filter(Boolean).length / results.length) * 100)
                : 70; // baseline if no exercises were attempted

            const assessment = {
                lessonId: currentLesson.id,
                timestamp: Date.now(),
                score,
                exerciseAttempts: [],
                strengths: results.filter(Boolean).length > 0 ? [`Correctly answered ${results.filter(Boolean).length}/${results.length} exercises`] : ['Completed all phases'],
                weaknesses: results.filter(r => !r).length > 0 ? [`Missed ${results.filter(r => !r).length}/${results.length} exercises`] : [],
                recommendedReview: []
            };
            completeLesson(currentLesson.id, assessment);
            addStudyTime(Math.max(1, Math.floor(sessionElapsedTime / 60)));

            // Feed vocabulary into SRS for spaced repetition (Phase 4)
            const srsCards = extractCardsForSRS(state.boardCards);
            if (srsCards.length > 0) {
                importCards(srsCards).then(n => console.log(`📚 Imported ${n} cards to SRS`)).catch(() => {});
            }

            dispatch({ type: 'SET_COMPLETION_SCORE', score });
            dispatch({ type: 'SET_SHOW_COMPLETION', show: true });
        } else {
            const nextPhase = currentLesson.phases[currentIndex + 1].phase;
            dispatch({ type: 'SET_CURRENT_PHASE', phase: nextPhase });
            // Load the new phase's cards onto the board (0.2)
            const sessionId = `session-${Date.now()}`;
            const meta = { sessionId, lessonId: currentLesson.id, language: currentLesson.language, level: currentLesson.level };
            const deck = buildDeckFromLesson(currentLesson, sessionId);
            const phaseCards = deck.cards.filter(c => c.phase === nextPhase);

            // Add interactive exercises for assessment/practice phases (Phase 2)
            let exerciseCards = [];
            if (nextPhase === 'assessment') {
                exerciseCards = [...buildVocabQuizCards(currentLesson, meta, 5), ...buildTranslationCards(currentLesson, meta, 3)];
            } else if (nextPhase === 'practice') {
                exerciseCards = buildGrammarFillBlankCards(currentLesson, meta, 3);
            }

            dispatch({ type: 'SET_BOARD_CARDS', cards: [...phaseCards, ...exerciseCards].map(c => ({ ...c, revealedAt: Date.now(), revealState: 'active' as const })) });
            dispatch({ type: 'RESET_EXERCISE_RESULTS' });
            console.log(`✅ Advanced to phase: ${nextPhase}`);
        }
    }, [currentLesson, currentPhase, sessionElapsedTime, instructionLanguage]);

    const handlePreviousPhase = useCallback(() => {
        if (!currentLesson) return;
        const currentIndex = currentLesson.phases.findIndex(p => p.phase === currentPhase);
        if (currentIndex > 0) {
            const prevPhase = currentLesson.phases[currentIndex - 1].phase;
            dispatch({ type: 'SET_CURRENT_PHASE', phase: prevPhase });
            // Load the previous phase's cards onto the board (0.2)
            const sessionId = `session-${Date.now()}`;
            const meta = { sessionId, lessonId: currentLesson.id, language: currentLesson.language, level: currentLesson.level };
            const deck = buildDeckFromLesson(currentLesson, sessionId);
            const phaseCards = deck.cards.filter(c => c.phase === prevPhase);
            let exerciseCards = [];
            if (prevPhase === 'assessment') {
                exerciseCards = [...buildVocabQuizCards(currentLesson, meta, 5), ...buildTranslationCards(currentLesson, meta, 3)];
            } else if (prevPhase === 'practice') {
                exerciseCards = buildGrammarFillBlankCards(currentLesson, meta, 3);
            }
            dispatch({ type: 'SET_BOARD_CARDS', cards: [...phaseCards, ...exerciseCards].map(c => ({ ...c, revealedAt: Date.now(), revealState: 'active' as const })) });
            dispatch({ type: 'RESET_EXERCISE_RESULTS' });
        }
    }, [currentLesson, currentPhase]);

    const handleStartNewSession = () => {
        cleanupConversation();
        dispatch({ type: 'RESET_FREE_MODE' });
        navigate('/');
    };

    // If summary is showing
    if (state.sessionSummary || state.isGeneratingSummary) {
        return (
            <div className="bg-gray-900 text-white h-[100dvh] overflow-y-auto">
                {state.isGeneratingSummary ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                        <LoadingSpinner className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-semibold">Analyzing your session...</h2>
                    </div>
                ) : state.sessionSummary ? (
                    <SessionSummaryComponent summary={state.sessionSummary} duration={state.sessionDuration} onStartNewSession={handleStartNewSession} />
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
        <div className="bg-gray-900 text-white h-[100dvh] flex flex-col overflow-hidden">
            <header className="bg-gray-800/50 p-4 border-b border-gray-700 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                    {targetLanguage && <img src={languageConfig[targetLanguage].flag} className="h-8 w-8" />}
                    <h1 className="text-xl font-bold">{targetLanguage ? languageConfig[targetLanguage].name : 'Language Tutor AI'}</h1>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Dev Mode</span>
                        <button
                            onClick={() => dispatch({ type: 'SET_DEV_MODE', v: !devMode })}
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
                <div className="md:w-1/4 lg:w-1/5 flex flex-col gap-4 h-full min-h-0">
                    <div className="bg-gray-800 p-3 rounded-lg flex-grow overflow-y-auto border border-gray-700 shadow-inner">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 pb-2 border-b border-gray-700">Conversation</h3>
                        {transcripts.length === 0 && !isRecording && (
                            <div className="h-full flex items-center justify-center text-gray-500 italic text-xs text-center">Conversation history</div>
                        )}
                        {transcripts.map((entry, idx) => {
                            if (entry.speaker === 'user' && appMode === 'class') return null;
                            return (
                                <div key={idx} className={`mb-3 flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-2 rounded text-xs ${entry.speaker === 'user' ? 'bg-blue-900/40 border border-blue-800/50' : 'bg-gray-700 border border-gray-600'}`}>
                                        {entry.speaker === 'ai' ? <HoverToTranslate text={entry.text} translations={entry.translations || new Map()} /> : <div>{entry.text}</div>}
                                    </div>
                                    <div className="text-[9px] text-gray-500 mt-1 uppercase font-semibold">
                                        {entry.speaker === 'user' ? 'You' : (targetLanguage ? languageConfig[targetLanguage].tutor : 'Tutor')}
                                    </div>
                                </div>
                            );
                        })}
                        {(liveTranscript.user || liveTranscript.ai) && (
                            <div className="italic text-xs text-gray-500 animate-pulse">
                                {liveTranscript.user && <p>You: {liveTranscript.user}</p>}
                                {liveTranscript.ai && <p>{targetLanguage ? languageConfig[targetLanguage].tutor : 'Tutor'}...</p>}
                            </div>
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                    {devMode && <PaceSetterLog updates={paceHistory} />}
                </div>

                <div className="flex-grow flex flex-col w-full h-full min-h-0">
                    {appMode === 'class' && currentLesson && classSession && (
                        <ClassHUD
                            lesson={currentLesson}
                            session={classSession}
                            currentPhase={currentPhase}
                            elapsedTime={sessionElapsedTime}
                            onNextPhase={handleNextPhase}
                            onPreviousPhase={handlePreviousPhase}
                            onQuickVocab={(term, translation) => {
                                const card: BoardCard = {
                                    id: `quick-vocab-${Date.now()}`,
                                    type: 'vocabulary',
                                    phase: currentPhase,
                                    title: term,
                                    body: translation,
                                    revealState: 'active',
                                    revealedAt: Date.now(),
                                    flagged: false,
                                    sessionId: classSession?.id ?? 'session',
                                    lessonId: currentLesson.id,
                                    language: currentLesson.language,
                                    level: currentLesson.level,
                                };
                                dispatch({ type: 'APPEND_BOARD_CARD', card });
                            }}
                        />
                    )}

                    {appMode === 'class' && currentLesson && classSession ? (
                        <LiveBoard
                            cards={state.boardCards}
                            onFlagCard={() => {}}
                            onUnflagCard={() => {}}
                            onExerciseResult={(cardId, correct) => {
                                dispatch({ type: 'SET_EXERCISE_RESULT', cardId, correct });
                            }}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <p>Select a lesson to begin</p>
                        </div>
                    )}

                    <div className="h-24 flex flex-col items-center justify-center bg-gray-800/30 rounded-lg mb-4 shrink-0 border border-gray-800">
                        <p className="text-gray-400 text-sm mb-2">{status}</p>
                        {isRecording && <canvas ref={canvasRef} className="w-64 h-6" />}
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shrink-0">
                        {/* Free mode: language selector (0.1) */}
                        {appMode === 'free' && !targetLanguage && (
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-3 text-center">Choose a language to start</label>
                                <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto">
                                    {(Object.keys(languageConfig) as TargetLanguage[]).map(lang => (
                                        <button
                                            key={lang}
                                            onClick={() => dispatch({ type: 'SET_TARGET_LANGUAGE', lang })}
                                            className="flex flex-col items-center gap-1 p-3 bg-gray-700 hover:bg-blue-600 rounded-xl transition-all hover:-translate-y-0.5"
                                        >
                                            <img src={languageConfig[lang].flag} alt="" className="w-8 h-8" />
                                            <span className="text-[10px] font-semibold">{languageConfig[lang].name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {!isRecording && targetLanguage && (
                            <div className="flex flex-col gap-4 max-w-sm mx-auto mb-6">
                                <select value={difficulty || ''} onChange={(e) => dispatch({ type: 'SET_DIFFICULTY', d: e.target.value as Difficulty })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 text-white">
                                    <option value="" disabled>Select Proficiency Level</option>
                                    <option value="beginner">Beginner (Adaptive Pace)</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </select>
                                {difficulty === 'beginner' && (
                                    <select value={instructionLanguage || ''} onChange={(e) => dispatch({ type: 'SET_INSTRUCTION_LANGUAGE', lang: e.target.value as InstructionLanguage })} className="bg-gray-700 p-3 rounded-lg border border-gray-600 animate-fade-in text-white">
                                        <option value="" disabled>Instruction Language</option>
                                        <option value="english">English</option>
                                        <option value="spanish">Español</option>
                                        <option value="french">Français</option>
                                    </select>
                                )}
                            </div>
                        )}
                        <div className="flex justify-center">
                            <button
                                onClick={() => alert('Voice features coming soon! Use the whiteboard for now.')}
                                className="w-16 h-16 rounded-full flex items-center justify-center transition-all bg-gray-600 cursor-not-allowed shadow-xl opacity-60"
                                disabled
                            >
                                <MicrophoneIcon className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {showCompletion && currentLesson && (
                <LessonComplete
                    lesson={currentLesson}
                    score={completionScore}
                    timeSpent={sessionElapsedTime}
                    onContinue={() => {
                        dispatch({ type: 'SET_SHOW_COMPLETION', show: false });
                        dispatch({ type: 'RESET_CLASS_MODE' });
                        navigate('/lesson-picker');
                    }}
                    onBackToMenu={() => {
                        dispatch({ type: 'SET_SHOW_COMPLETION', show: false });
                        dispatch({ type: 'RESET_CLASS_MODE' });
                        navigate('/lesson-picker');
                    }}
                />
            )}
        </div>
    );
}
