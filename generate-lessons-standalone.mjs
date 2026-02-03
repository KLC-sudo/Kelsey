// Standalone lesson generator using Gemini API
// Run with: node generate-lessons-standalone.mjs
// Make sure to set VITE_GEMINI_API_KEY in .env.local

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

const API_KEY = process.env.VITE_GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
    console.error('❌ Error: VITE_GEMINI_API_KEY not set in .env.local');
    process.exit(1);
}

// Lesson configurations
const lessons = [
    {
        lessonNumber: 2,
        topic: 'Numbers, Days & Months',
        grammarFocus: ['Cardinal numbers 0-100', 'Days of the week', 'Months of the year', 'Telling time basics']
    },
    {
        lessonNumber: 3,
        topic: 'Family & Relationships',
        grammarFocus: ['Possessive pronouns (mein, dein)', 'Family vocabulary', 'Verb "haben" (to have)', 'Plural forms basics']
    },
    {
        lessonNumber: 4,
        topic: 'Colors, Objects & Descriptions',
        grammarFocus: ['Adjectives (basic)', 'Definite articles (der, die, das)', 'Indefinite articles (ein, eine)', 'Noun genders']
    },
    {
        lessonNumber: 5,
        topic: 'Food & Drinks',
        grammarFocus: ['Verb "mögen" (to like)', 'Verb "essen" (to eat)', 'Verb "trinken" (to drink)', 'Negation with "nicht" and "kein"']
    }
];

async function generateLessonContent(config) {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const prompt = `Generate a complete German A1.1 lesson in JSON format for:

**Lesson ${config.lessonNumber}: ${config.topic}**

Grammar Focus: ${config.grammarFocus.join(', ')}

Create a lesson with 6 phases (Introduction, Grammar, Vocabulary, Practice, Assessment, Review).

For each phase, provide:
1. A clear objective
2. Detailed instructions for the AI tutor
3. Example dialogues and exercises
4. Key vocabulary and grammar points

Return ONLY valid JSON in this exact structure:

{
  "id": "german-a1.1-lesson-0${config.lessonNumber}",
  "language": "german",
  "level": "A1.1",
  "lessonNumber": ${config.lessonNumber},
  "topic": "${config.topic}",
  "description": "Brief description of what students will learn",
  "estimatedDuration": 30,
  "phases": [
    {
      "phase": "introduction",
      "objective": "Introduce the topic and activate prior knowledge",
      "instructions": "Detailed instructions for AI tutor on how to conduct this phase",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "estimatedMinutes": 5
    },
    {
      "phase": "grammar",
      "objective": "Teach grammar concepts: ${config.grammarFocus.join(', ')}",
      "instructions": "How to teach the grammar points",
      "keyPoints": ["Grammar point 1", "Grammar point 2"],
      "estimatedMinutes": 8
    },
    {
      "phase": "vocabulary",
      "objective": "Introduce and practice key vocabulary",
      "instructions": "Vocabulary teaching approach",
      "keyPoints": ["10-15 key words/phrases related to ${config.topic}"],
      "estimatedMinutes": 7
    },
    {
      "phase": "practice",
      "objective": "Apply learned concepts through conversation",
      "instructions": "Practice exercises and conversation prompts",
      "keyPoints": ["Practice activity 1", "Practice activity 2"],
      "estimatedMinutes": 7
    },
    {
      "phase": "assessment",
      "objective": "Evaluate student understanding",
      "instructions": "Assessment questions and tasks",
      "keyPoints": ["Assessment criteria"],
      "estimatedMinutes": 2
    },
    {
      "phase": "review",
      "objective": "Summarize key learnings",
      "instructions": "Review and consolidation",
      "keyPoints": ["Summary points"],
      "estimatedMinutes": 1
    }
  ],
  "vocabulary": [
    {
      "german": "word",
      "english": "translation",
      "partOfSpeech": "noun/verb/adjective",
      "example": "Example sentence in German"
    }
  ],
  "grammarRules": [
    {
      "rule": "Grammar rule name",
      "explanation": "Clear explanation",
      "examples": ["Example 1", "Example 2"]
    }
  ]
}

Make the content engaging, practical, and appropriate for absolute beginners.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 8000
            }
        });

        const text = result.response.text();

        // Extract JSON from response (remove markdown code blocks if present)
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
        }

        const lesson = JSON.parse(jsonText);
        return lesson;

    } catch (error) {
        console.error('Error generating lesson:', error);
        throw error;
    }
}

async function generateAllLessons() {
    console.log('🚀 Starting lesson generation...\n');

    for (const lessonConfig of lessons) {
        console.log(`📝 Generating Lesson ${lessonConfig.lessonNumber}: ${lessonConfig.topic}...`);

        try {
            const lesson = await generateLessonContent(lessonConfig);

            // Save to file
            const outputDir = path.join(__dirname, 'lessons', 'german', 'A1.1');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filename = `lesson-${String(lessonConfig.lessonNumber).padStart(2, '0')}.json`;
            const filepath = path.join(outputDir, filename);

            fs.writeFileSync(filepath, JSON.stringify(lesson, null, 2), 'utf-8');

            console.log(`✅ Lesson ${lessonConfig.lessonNumber} saved to ${filepath}\n`);

            // Wait between API calls to avoid rate limiting
            if (lessonConfig.lessonNumber < lessons[lessons.length - 1].lessonNumber) {
                console.log('⏳ Waiting 3 seconds before next generation...\n');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

        } catch (error) {
            console.error(`❌ Error generating Lesson ${lessonConfig.lessonNumber}:`, error.message);
            console.error('Full error:', error);
        }
    }

    console.log('🎉 All lessons generated successfully!');
}

// Run the generation
generateAllLessons().catch(console.error);
