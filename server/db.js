import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the db file is created in a persistent location
// In Railway, this would be a mounted volume path if configured, 
// for now we put it in the server directory.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'kelsey.db');
const db = new Database(dbPath, { verbose: console.log });
db.pragma('journal_mode = WAL'); // Better performance

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_login_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_progress (
        user_id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        level TEXT NOT NULL,
        current_lesson INTEGER NOT NULL,
        completed_lessons TEXT NOT NULL, -- JSON array
        assessments TEXT NOT NULL, -- JSON object
        total_study_time INTEGER NOT NULL,
        average_score INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS review_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT,
        lesson_id TEXT NOT NULL,
        lesson_topic TEXT,
        language TEXT NOT NULL,
        level TEXT NOT NULL,
        date INTEGER NOT NULL,
        duration_seconds INTEGER,
        tutor_name TEXT,
        cards TEXT NOT NULL, -- JSON array
        card_count INTEGER NOT NULL,
        flagged_count INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        level TEXT NOT NULL,
        lesson_number INTEGER NOT NULL,
        topic TEXT NOT NULL,
        content TEXT NOT NULL, -- JSON object of the full lesson
        generated_at TEXT
    );
`);

export default db;
