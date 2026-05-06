// Lesson content generator using Gemini API

import { GoogleGenAI, Type } from '@google/genai';
import type {
    Lesson,
    LessonGenerationRequest,
    VocabularyItem,
    GrammarConcept,
    Exercise,
    LessonPhaseConfig
} from '../types/lesson';

/**
 * Generate lesson content using Gemini AI
 */
export async function generateLessonContent(
    request: LessonGenerationRequest,
    apiKey: string
): Promise<Lesson> {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Create detailed lesson content for ${request.language} ${request.level} Lesson ${request.lessonNumber}.

Topic: ${request.topic}
Grammar Focus: ${request.grammarFocus.join(', ')}

Generate comprehensive content with:
1. ${request.vocabularyCount || 30} vocabulary words with translations and examples
2. ${request.exampleCount || 10} example sentences demonstrating the grammar
3. ${request.exerciseCount || 20} varied exercises (dialogs, role-plays, drills)
4. Learning objectives
5. Common mistakes to watch for

Format as JSON matching this schema:
{
  "vocabulary": [
    {
      "target": "spielen",
      "translation": "to play",
      "partOfSpeech": "verb",
      "example": "Ich spiele Fußball",
      "exampleTranslation": "I play soccer"
    }
  ],
  "grammarConcepts": [
    {
      "name": "Present Tense - Regular Verbs",
      "explanation": "Regular verbs follow a pattern...",
      "examples": ["ich spiele", "du spielst", "er spielt"],
      "commonMistakes": ["Using infinitive form", "Wrong endings"]
    }
  ],
  "exercises": [
    {
      "type": "dialog",
      "phase": "practice",
      "prompt": "Ask the student about their hobbies",
      "hints": ["Start with 'Was machst du gern?'"]
    }
  ],
  "learningObjectives": [
    "Count from 1-100",
    "Talk about hobbies",
    "Use present tense correctly"
  ]
}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', // Cheaper model for content generation
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    vocabulary: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                target: { type: Type.STRING },
                                translation: { type: Type.STRING },
                                partOfSpeech: { type: Type.STRING },
                                example: { type: Type.STRING },
                                exampleTranslation: { type: Type.STRING }
                            },
                            required: ['target', 'translation', 'partOfSpeech']
                        }
                    },
                    grammarConcepts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                                commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['name', 'explanation', 'examples']
                        }
                    },
                    exercises: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                phase: { type: Type.STRING },
                                prompt: { type: Type.STRING },
                                hints: { type: Type.ARRAY, items: { type: Type.STRING } }
                            },
                            required: ['type', 'phase', 'prompt']
                        }
                    },
                    learningObjectives: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['vocabulary', 'grammarConcepts', 'exercises', 'learningObjectives']
            }
        }
    });

    const generated = JSON.parse(response.text);

    // Build the complete lesson object
    const lessonId = `${request.language}-${request.level}-lesson-${String(request.lessonNumber).padStart(2, '0')}`;

    const lesson: Lesson = {
        id: lessonId,
        language: request.language,
        level: request.level,
        lessonNumber: request.lessonNumber,
        topic: request.topic,
        grammarFocus: generated.grammarConcepts,
        vocabulary: generated.vocabulary.map((v: any, i: number) => ({
            ...v,
            id: `${lessonId}-vocab-${i}`
        })),
        exercises: generated.exercises.map((e: any, i: number) => ({
            ...e,
            id: `${lessonId}-ex-${i}`,
            duration: 180 // Default 3 minutes per exercise
        })),
        totalDuration: 300, // 5 hours = 300 minutes
        phases: createLessonPhases(generated.exercises),
        learningObjectives: generated.learningObjectives,
        generatedAt: new Date().toISOString(),
        generatedBy: 'gemini-2.0-flash-exp',
        reviewed: false
    };

    return lesson;
}

/**
 * Create lesson phase configuration from exercises
 */
function createLessonPhases(exercises: any[]): LessonPhaseConfig[] {
    const phases: LessonPhaseConfig[] = [
        {
            phase: 'introduction',
            duration: 10,
            objectives: ['Understand lesson goals', 'Review prerequisites'],
            exercises: []
        },
        {
            phase: 'grammar',
            duration: 60,
            objectives: ['Learn grammar concepts', 'See examples'],
            exercises: exercises.filter(e => e.phase === 'grammar').map(e => e.id)
        },
        {
            phase: 'vocabulary',
            duration: 40,
            objectives: ['Learn new words', 'Practice pronunciation'],
            exercises: exercises.filter(e => e.phase === 'vocabulary').map(e => e.id)
        },
        {
            phase: 'practice',
            duration: 120,
            objectives: ['Apply knowledge', 'Build fluency'],
            exercises: exercises.filter(e => e.phase === 'practice').map(e => e.id)
        },
        {
            phase: 'assessment',
            duration: 50,
            objectives: ['Test understanding', 'Identify gaps'],
            exercises: exercises.filter(e => e.phase === 'assessment').map(e => e.id)
        },
        {
            phase: 'review',
            duration: 20,
            objectives: ['Summarize learning', 'Plan next steps'],
            exercises: []
        }
    ];

    return phases;
}

/**
 * Save generated lesson to server and local cache
 */
export async function saveLessonToFile(lesson: Lesson): Promise<void> {
    try {
        const response = await fetch('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lesson)
        });
        if (!response.ok) throw new Error('Failed to save lesson to server');
        localStorage.setItem(`lesson_${lesson.id}`, JSON.stringify(lesson));
        console.log(`Lesson saved: ${lesson.id}`);
    } catch (error) {
        console.error('Error saving lesson:', error);
    }
}

/**
 * Fetch lessons list from server
 */
export async function fetchLessonsFromServer(language?: string, level?: string): Promise<any[]> {
    try {
        let url = '/api/lessons';
        const params = new URLSearchParams();
        if (language) params.append('language', language);
        if (level) params.append('level', level);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url);
        if (res.ok) return await res.json();
        return [];
    } catch(e) {
        console.error('Failed to fetch lessons:', e);
        return [];
    }
}

/**
 * Fetch complete lesson by ID
 */
export async function fetchLessonById(lessonId: string): Promise<Lesson | null> {
    try {
        const res = await fetch(`/api/lessons/${lessonId}`);
        if (res.ok) {
            const lesson = await res.json();
            localStorage.setItem(`lesson_${lessonId}`, JSON.stringify(lesson));
            return lesson;
        }
    } catch(e) {
        console.error('Failed to fetch lesson:', e);
    }
    return loadLesson(lessonId); // Fallback to cache
}

/**
 * Load lesson from storage (fallback)
 */
export function loadLesson(lessonId: string): Lesson | null {
    try {
        const stored = localStorage.getItem(`lesson_${lessonId}`);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading lesson:', error);
        return null;
    }
}
