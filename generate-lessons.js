// Script to generate Lessons 2-5 for German A1.1
// Run with: node generate-lessons.js

const { generateLesson } = require('./utils/lessonGenerator');
const fs = require('fs');
const path = require('path');

// Lesson topics and grammar focus for German A1.1
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

async function generateAllLessons() {
    console.log('🚀 Starting lesson generation...\n');

    for (const lessonConfig of lessons) {
        console.log(`📝 Generating Lesson ${lessonConfig.lessonNumber}: ${lessonConfig.topic}...`);

        try {
            const lesson = await generateLesson({
                language: 'german',
                level: 'A1.1',
                lessonNumber: lessonConfig.lessonNumber,
                topic: lessonConfig.topic,
                grammarFocus: lessonConfig.grammarFocus,
                vocabularyCount: 30,
                exampleCount: 10,
                exerciseCount: 20
            });

            // Save to file
            const outputDir = path.join(__dirname, 'lessons', 'german', 'A1.1');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const filename = `lesson-${String(lessonConfig.lessonNumber).padStart(2, '0')}.json`;
            const filepath = path.join(outputDir, filename);

            fs.writeFileSync(filepath, JSON.stringify(lesson, null, 2), 'utf-8');

            console.log(`✅ Lesson ${lessonConfig.lessonNumber} saved to ${filepath}\n`);

            // Wait a bit between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`❌ Error generating Lesson ${lessonConfig.lessonNumber}:`, error.message);
        }
    }

    console.log('🎉 All lessons generated successfully!');
}

// Run the generation
generateAllLessons().catch(console.error);
