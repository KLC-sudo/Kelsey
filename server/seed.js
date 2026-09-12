/**
 * Seed script — reads lesson JSON files from lessons/ and inserts them into the SQLite DB.
 * Run: node server/seed.js
 */

import { initDB, getDB, saveDB } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LESSONS_DIR = path.resolve(__dirname, '../lessons');

function walkLessons(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkLessons(fullPath));
        } else if (entry.name.endsWith('.json') && entry.name.startsWith('lesson-')) {
            results.push(fullPath);
        }
    }
    return results;
}

async function seed() {
    console.log('🌱 Initializing database...');
    await initDB();
    const db = getDB();

    const files = walkLessons(LESSONS_DIR);
    console.log(`📚 Found ${files.length} lesson files`);

    let inserted = 0;
    let skipped = 0;

    for (const filePath of files) {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const lesson = JSON.parse(raw);

            if (!lesson.id || !lesson.language || !lesson.level || !lesson.topic) {
                console.log(`  ⚠️  Skipping ${path.basename(filePath)} — missing required fields`);
                skipped++;
                continue;
            }

            const stmt = db.prepare(`
                INSERT INTO lessons (id, language, level, lesson_number, topic, content, generated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    content = excluded.content,
                    generated_at = excluded.generated_at
            `);

            stmt.run(
                lesson.id,
                lesson.language,
                lesson.level,
                lesson.lessonNumber || 1,
                lesson.topic,
                JSON.stringify(lesson),
                lesson.generatedAt || new Date().toISOString()
            );

            console.log(`  ✅ ${lesson.id} — ${lesson.topic}`);
            inserted++;
        } catch (err) {
            console.error(`  ❌ Error seeding ${path.basename(filePath)}:`, err.message);
            skipped++;
        }
    }

    saveDB();
    console.log(`\n🎉 Done! Inserted: ${inserted}, Skipped: ${skipped}`);
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
