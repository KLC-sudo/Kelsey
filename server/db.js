import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, 'kelsey.db');

let rawDB = null;

/**
 * Initialize the sql.js database (async).
 * Must be called once before the server starts accepting requests.
 */
export async function initDB() {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        rawDB = new SQL.Database(buffer);
    } else {
        rawDB = new SQL.Database();
    }

    rawDB.run('PRAGMA journal_mode = DELETE');

    // Initialize tables
    rawDB.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            email TEXT,
            role TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_login_at INTEGER NOT NULL
        )
    `);

    rawDB.run(`
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
        )
    `);

    rawDB.run(`
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
        )
    `);

    rawDB.run(`
        CREATE TABLE IF NOT EXISTS lessons (
            id TEXT PRIMARY KEY,
            language TEXT NOT NULL,
            level TEXT NOT NULL,
            lesson_number INTEGER NOT NULL,
            topic TEXT NOT NULL,
            content TEXT NOT NULL,
            generated_at TEXT
        )
    `);

    saveDB();
    console.log('✅ Database initialized at', dbPath);
}

/**
 * Persist the in-memory database to disk.
 */
export function saveDB() {
    if (!rawDB) return;
    const data = rawDB.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

/**
 * better-sqlite3 compatibility wrapper.
 * Returns an object with prepare(), exec(), close(), pragma()
 * so all existing route code works unchanged.
 */
function wrapDB(raw) {
    return {
        prepare(sql) {
            return {
                run(...params) {
                    raw.run(sql, params);
                    const changes = raw.getRowsModified();
                    return { changes, lastInsertRowid: null };
                },
                get(...params) {
                    const results = raw.exec(sql, params);
                    if (!results || results.length === 0) return undefined;
                    const { columns, values } = results[0];
                    if (values.length === 0) return undefined;
                    const row = {};
                    columns.forEach((col, i) => { row[col] = values[0][i]; });
                    return row;
                },
                all(...params) {
                    const results = raw.exec(sql, params);
                    if (!results || results.length === 0) return [];
                    const { columns, values } = results[0];
                    return values.map(row => {
                        const obj = {};
                        columns.forEach((col, i) => { obj[col] = row[i]; });
                        return obj;
                    });
                },
            };
        },
        exec(sql) {
            raw.run(sql);
        },
        pragma(pragmaStr) {
            raw.run(`PRAGMA ${pragmaStr}`);
        },
        close() {
            raw.close();
        },
    };
}

/**
 * Get the wrapped database instance.
 * Throws if initDB() hasn't been called yet.
 */
export function getDB() {
    if (!rawDB) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return wrapDB(rawDB);
}

// Auto-save on process exit
process.on('SIGINT', () => {
    if (rawDB) {
        saveDB();
        rawDB.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    if (rawDB) {
        saveDB();
        rawDB.close();
    }
    process.exit(0);
});

export default { initDB, getDB, saveDB };
