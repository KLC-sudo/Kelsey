import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { getDB, saveDB } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';

const router = express.Router();

// Rate limit: 10 generations per hour per IP
const generateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: 'Too many generation requests. Try again in an hour.' }
});

const VALID_LANGUAGES = ['german', 'french', 'spanish', 'english', 'chinese'];
const VALID_LEVELS = ['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2', 'C1', 'C2'];

function validateRequest(body) {
    const { language, level, lessonNumber, topic, grammarFocus } = body;
    if (!language || !VALID_LANGUAGES.includes(language)) return 'Invalid language';
    if (!level || !VALID_LEVELS.includes(level)) return 'Invalid level';
    if (!lessonNumber || typeof lessonNumber !== 'number' || lessonNumber < 1 || lessonNumber > 20) return 'Invalid lessonNumber';
    if (!topic || typeof topic !== 'string' || topic.length < 3) return 'Invalid topic';
    if (!Array.isArray(grammarFocus) || grammarFocus.length === 0) return 'grammarFocus must be a non-empty array';
    return null;
}

function validateLessonContent(lesson) {
    if (!lesson.vocabulary || lesson.vocabulary.length < 10) return 'Insufficient vocabulary (need 10+)';
    if (!lesson.grammarConcepts || lesson.grammarConcepts.length < 1) return 'Missing grammar concepts';
    if (!lesson.exercises || lesson.exercises.length < 3) return 'Insufficient exercises (need 3+)';
    if (!lesson.learningObjectives || lesson.learningObjectives.length < 1) return 'Missing learning objectives';
    return null;
}

function buildLessonId(language, level, lessonNumber) {
    return `${language}-${level}-lesson-${String(lessonNumber).padStart(2, '0')}`;
}

function buildPhases(exercises) {
    return [
        { phase: 'introduction', duration: 10, objectives: ['Understand lesson goals', 'Review prerequisites'], exercises: [] },
        { phase: 'grammar', duration: 60, objectives: ['Learn grammar concepts', 'See examples'], exercises: exercises.filter(e => e.phase === 'grammar').map(e => e.id) },
        { phase: 'vocabulary', duration: 40, objectives: ['Learn new words', 'Practice pronunciation'], exercises: exercises.filter(e => e.phase === 'vocabulary').map(e => e.id) },
        { phase: 'practice', duration: 120, objectives: ['Apply knowledge', 'Build fluency'], exercises: exercises.filter(e => e.phase === 'practice').map(e => e.id) },
        { phase: 'assessment', duration: 50, objectives: ['Test understanding', 'Identify gaps'], exercises: exercises.filter(e => e.phase === 'assessment').map(e => e.id) },
        { phase: 'review', duration: 20, objectives: ['Summarize learning', 'Plan next steps'], exercises: [] },
    ];
}

// Generate a lesson via Gemini AI — teachers and schools only
router.post('/generate', requireAuth, requireRole('teacher', 'school'), generateLimiter, async (req, res) => {
    const error = validateRequest(req.body);
    if (error) return res.status(400).json({ error });

    const { language, level, lessonNumber, topic, grammarFocus } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const grammarStr = grammarFocus.join(', ');

        const prompt = `Create detailed ${language} ${level} Lesson ${lessonNumber}: "${topic}".
Grammar focus: ${grammarStr}

Generate:
1. 20+ vocabulary words with translations, parts of speech, and examples
2. Grammar concepts with explanations and examples
3. 8+ exercises across phases (introduction/grammar/vocabulary/practice/assessment/review)
4. Learning objectives

Return JSON:
{
  "vocabulary": [{ "target": "...", "translation": "...", "partOfSpeech": "...", "example": "...", "exampleTranslation": "..." }],
  "grammarConcepts": [{ "name": "...", "explanation": "...", "examples": ["..."], "commonMistakes": ["..."] }],
  "exercises": [{ "type": "dialog|roleplay|grammar-drill|vocabulary|dictation|comprehension", "phase": "grammar|vocabulary|practice|assessment", "prompt": "...", "hints": ["..."] }],
  "learningObjectives": ["..."]
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
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
                        learningObjectives: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['vocabulary', 'grammarConcepts', 'exercises', 'learningObjectives']
                }
            }
        });

        const generated = JSON.parse(response.text);

        // Validate content quality
        const contentError = validateLessonContent(generated);
        if (contentError) return res.status(422).json({ error: `Generated content invalid: ${contentError}` });

        // Build full lesson object
        const lessonId = buildLessonId(language, level, lessonNumber);
        const lesson = {
            id: lessonId,
            language,
            level,
            lessonNumber,
            topic,
            grammarFocus: generated.grammarConcepts,
            vocabulary: generated.vocabulary.map((v, i) => ({ ...v, id: `${lessonId}-vocab-${i}` })),
            exercises: generated.exercises.map((e, i) => ({ ...e, id: `${lessonId}-ex-${i}`, duration: e.duration || 180 })),
            totalDuration: 300,
            phases: buildPhases(generated.exercises),
            learningObjectives: generated.learningObjectives,
            generatedAt: new Date().toISOString(),
            generatedBy: 'gemini-2.0-flash-exp',
            reviewed: false
        };

        // Save to DB
        const db = getDB();
        db.prepare(`
            INSERT INTO lessons (id, language, level, lesson_number, topic, content, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at
        `).run(lessonId, language, level, lessonNumber, topic, JSON.stringify(lesson), lesson.generatedAt);
        saveDB();

        console.log(`✨ Generated lesson: ${lessonId} (${lesson.vocabulary.length} vocab, ${lesson.exercises.length} exercises)`);
        res.status(201).json({ success: true, id: lessonId, lesson });
    } catch (err) {
        console.error('Lesson generation error:', err);
        res.status(500).json({ error: `Generation failed: ${err.message}` });
    }
});

export default router;
