/**
 * db.js — Pure-JS SQLite using sql.js (no native compilation required)
 * Works on Node 18/20/22 with zero C++ build dependencies.
 * Database is persisted to disk via fs sync after every write.
 */

import initSqlJs from 'sql.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'kelsey.db');

// sql.js is async at init, but synchronous for queries.
// We export a wrapper that mimics the better-sqlite3 synchronous API.
let _db = null;

async function initDb() {
    const SQL = await initSqlJs();
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        _db = new SQL.Database(fileBuffer);
    } else {
        _db = new SQL.Database();
    }
    createTables();
    return _db;
}

function persistDb() {
    if (!_db) return;
    const data = _db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
}

function createTables() {
    _db.exec(`
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
            completed_lessons TEXT NOT NULL,
            assessments TEXT NOT NULL,
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
            cards TEXT NOT NULL,
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
            content TEXT NOT NULL,
            generated_at TEXT
        );
    `);
    persistDb();
}

/**
 * Synchronous-style wrapper around sql.js to match the better-sqlite3 API.
 * Usage: db.prepare(sql).run(...params) / db.prepare(sql).get(...params) / db.prepare(sql).all(...params)
 */
class DbWrapper {
    prepare(sql) {
        return {
            run: (...params) => {
                _db.run(sql, params.flat());
                persistDb();
            },
            get: (...params) => {
                const stmt = _db.prepare(sql);
                stmt.bind(params.flat());
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return null;
            },
            all: (...params) => {
                const results = [];
                const stmt = _db.prepare(sql);
                stmt.bind(params.flat());
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            }
        };
    }

    exec(sql) {
        _db.exec(sql);
        persistDb();
    }
}

const db = new DbWrapper();
export { initDb };
export default db;
