# Kelsey MVP — 24-Hour Action Plan

> **Goal**: Ship a fully functional MVP of the Kelsey language tutoring platform.
> **Timeline**: 24 hours from start.
> **Priority**: Working > Perfect. Cut scope aggressively.

---

## Current State Summary

The app has three learning modes (Free Conversation, Structured Class, Human Tutor), a Node.js/Express backend with SQLite, and real-time features via Socket.io + LiveKit. However, **the app is currently broken in production** — the last 8 of 10 commits were Railway deploy fixes, and `server/db.js` still imports `better-sqlite3` while the latest commit replaced it with `sql.js`. Only German A1.1 lessons (5 files) exist.

---

## Phase 0: Fix What's Broken (Hours 0–4) — CRITICAL

These are blocking issues that prevent the app from running at all.

### 0.1 Fix the Database Layer
- [ ] **`server/db.js`**: Replace `better-sqlite3` import with `sql.js` — the last commit (`c622adb`) claims to have done this but `db.js` still uses `import Database from 'better-sqlite3'` and `new Database(dbPath)`. Rewrite to use `sql.js` with async init.
- [ ] **`package.json`**: Remove `better-sqlite3-multiple-ciphers` and `@types/better-sqlite3` from dependencies. Keep only `sql.js`.
- [ ] **All server routes**: Update `db.prepare().run()` / `.get()` / `.all()` calls to work with `sql.js`'s API (which returns arrays, not objects with `.run()`). Create a thin wrapper to maintain compatibility.
- [ ] Verify SQLite write path works on Railway (no native compilation needed with sql.js).

### 0.2 Fix Deployment Config
- [ ] **`Procfile`**: Change `node server.js` → `node server/index.js` (the file `server.js` does not exist at root).
- [ ] **`netlify.toml`**: Change `NODE_VERSION = "20"` → `NODE_VERSION = "22"` to match `package.json` engines.
- [ ] **`server/index.js` line 20**: CORS origin defaults to `http://localhost:5173` but Vite dev server runs on port `3000`. Fix to `http://localhost:3000` or use env var.
- [ ] **`.env` file**: Create from `.env.example` with actual values. The app needs at minimum `VITE_GEMINI_API_KEY` to function.

### 0.3 Fix Auth Flow
- [ ] Bearer token auth uses the user ID directly as the token — this is fragile. At minimum, validate the token format and add a fallback for missing `Authorization` header on non-auth routes.
- [ ] LiveKit token endpoint falls back to `devkey`/`secret` if env vars missing — add proper error if LiveKit is not configured.

---

## Phase 1: Core Functionality (Hours 4–12) — MVP FEATURES

### 1.1 Free Conversation Mode (AI Voice Chat)
- [ ] **Verify Gemini Live API integration** works end-to-end (API key, model name `gemini-live-2.5-flash-native-audio`, audio streaming).
- [ ] **Fix audio pipeline**: AudioWorklet PCM capture → Gemini Live API → audio playback. Test on Chrome/Firefox/Safari.
- [ ] **Add error handling**: Show user-friendly errors when API key is invalid, quota exceeded, or connection drops.
- [ ] **Fix transcript display**: Ensure `liveTranscript` updates correctly during conversation.

### 1.2 Structured Class Mode
- [ ] **Verify lesson loading**: Lessons must be loadable from the DB. Currently only 5 German A1.1 lessons exist as JSON files — they need to be seeded into the database on server start.
- [ ] **Create seed script**: `server/seed.js` that reads `lessons/german/A1.1/*.json` and inserts them into the `lessons` table. Run on first server start or via `npm run seed`.
- [ ] **Fix lesson picker**: `LessonPicker` component fetches from `/api/lessons` — verify this returns data after seeding.
- [ ] **Fix class session flow**: Verify the 6-phase flow (introduction → grammar → vocabulary → practice → assessment → review) works with the AI tutor.
- [ ] **Fix `initializeProgress`**: Currently only accepts `'german' | 'french' | 'spanish'` — add `'chinese' | 'english'` to match `languageConfig` in App.tsx.

### 1.3 Human Tutor Mode
- [ ] **Verify Socket.io room creation/joining**: Tutor creates room → gets code → student enters code → joins. Test full flow.
- [ ] **Verify LiveKit audio**: Both parties can hear each other. Check token generation, room creation, audio publish/subscribe.
- [ ] **Verify board sync**: Tutor pushes cards → student sees them in real-time. Student flags → tutor sees flag.
- [ ] **Fix reconnection**: Test disconnect/reconnect for both tutor and student. Board state should rehydrate.

---

## Phase 2: Content & Polish (Hours 12–18)

### 2.1 Lesson Content
- [ ] **Generate at least 3 lessons per language** for A1.1 level (German, French, Spanish, Chinese, English = 15 lessons minimum).
- [ ] Use `utils/lessonGenerator.ts` or the standalone scripts (`generate-lessons.mjs`) to batch-generate.
- [ ] Seed all generated lessons into the database.
- [ ] Verify each lesson has: vocabulary items, grammar concepts, exercises, and all 6 phases defined.

### 2.2 UI/UX Fixes
- [ ] **`App.tsx` decomposition**: The 1477-line monolith needs splitting. Extract into:
  - `pages/FreeConversation.tsx` — free mode views
  - `pages/StructuredClass.tsx` — class mode views
  - `pages/HumanTutor.tsx` — tutor/student session views
  - `hooks/useGeminiSession.ts` — all Gemini Live API logic
  - `hooks/useClassSession.ts` — class mode state + timer
  - Keep `App.tsx` as a thin router shell (~200 lines max).
- [ ] **Fix `utils/streakTracking.tsx`**: Rename to `.ts` (no JSX in this file).
- [ ] **Add loading states**: Show spinners/skeletons while lessons load, summaries generate, tokens fetch.
- [ ] **Add error boundaries**: Wrap each mode in a React error boundary so one mode crashing doesn't kill the whole app.
- [ ] **Mobile responsiveness**: Verify all screens work on mobile (375px width minimum).

### 2.3 Session Summary
- [ ] Verify `SessionSummaryComponent` displays correctly after ending a free conversation.
- [ ] Verify session data is saved to review history.
- [ ] Verify PDF export works via `jsPDF`.

---

## Phase 3: Production Hardening (Hours 18–22)

### 3.1 Backend Security
- [ ] Add input validation to all POST/PUT routes (validate required fields, types, lengths).
- [ ] Add rate limiting to lessons POST endpoint (currently only account creation is rate-limited).
- [ ] Sanitize lesson content before storing (strip any HTML/script tags).
- [ ] Add request logging (morgan or similar).

### 3.2 Error Handling
- [ ] **Server**: Add global error handler middleware to Express.
- [ ] **Client**: Add global error boundary in React. Log errors to console for now (no Sentry needed for MVP).
- [ ] **Socket.io**: Add timeout handling for room operations. Handle malformed messages gracefully.

### 3.3 Database Persistence
- [ ] **Railway**: Configure a persistent volume mount for `server/kelsey.db` — without this, all user data is lost on every deploy/restart.
- [ ] Add DB backup script (copy `kelsey.db` to a safe location periodically).
- [ ] Add DB WAL checkpoint on graceful shutdown.

### 3.4 Environment Variables
- [ ] Document all required env vars in `.env.example`:
  - `VITE_GEMINI_API_KEY` (required for AI conversation)
  - `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (required for human tutor mode)
  - `VITE_SOCKET_URL` (required for production frontend to find backend)
  - `DB_PATH` (optional, defaults to `server/kelsey.db`)
  - `CORS_ORIGIN` (optional, defaults to `http://localhost:3000`)
- [ ] Add startup validation that required env vars are set (fail fast with clear error message).

---

## Phase 4: Testing & Launch (Hours 22–24)

### 4.1 Manual Testing Checklist
- [ ] **Auth**: Create account → appears in DB → can log back in.
- [ ] **Free mode**: Select language → start conversation → AI responds with voice → transcript shows → end session → summary appears.
- [ ] **Class mode**: Select lesson → 6 phases play through → progress saved → lesson marked complete.
- [ ] **Human tutor**: Tutor creates room → shares code → student joins → both hear audio → cards push to board → student flags card → session ends → review saved.
- [ ] **Mobile**: All flows work on mobile Chrome.
- [ ] **Reconnection**: Kill network for 5 seconds → restore → reconnects automatically.

### 4.2 Deploy
- [ ] Push to `main` → Railway auto-deploys.
- [ ] Verify `/health` endpoint returns `{"status": "ok"}`.
- [ ] Verify frontend loads at the Railway public URL.
- [ ] Test full flow on the deployed URL.

---

## Known Issues (Accept for MVP, Fix Later)

| Issue | Impact | Post-MVP Fix |
|-------|--------|--------------|
| No real authentication (user ID = token) | Low risk for MVP (single-user dev) | Add JWT or session-based auth |
| No tests | Technical debt | Add Vitest unit tests + Playwright E2E |
| `App.tsx` monolith | Hard to maintain | Decompose per Phase 2 |
| Only German A1.1 lessons | Limited content | Generate more lessons post-launch |
| No admin dashboard | Can't manage users/lessons | Build later |
| No analytics | Can't track usage | Add PostHog or similar |
| CORS hardcoded | Dev-only issue | Use env var in production |
| No HTTPS enforcement | Security gap | Railway provides this at reverse proxy |
| SQLite single-writer | Fine for MVP scale | Migrate to Postgres if needed |

---

## File Change Summary

| File | Action | Priority |
|------|--------|----------|
| `server/db.js` | **Rewrite** — switch from better-sqlite3 to sql.js | P0 |
| `server/routes/*.js` | **Update** — adapt to sql.js API | P0 |
| `Procfile` | **Fix** — `server.js` → `server/index.js` | P0 |
| `netlify.toml` | **Fix** — Node 20 → 22 | P0 |
| `package.json` | **Update** — remove better-sqlite3 deps | P0 |
| `server/seed.js` | **Create** — lesson seeding script | P1 |
| `App.tsx` | **Decompose** — split into pages + hooks | P2 |
| `utils/streakTracking.tsx` | **Rename** — `.tsx` → `.ts` | P2 |
| `lessons/` | **Generate** — 15 lesson JSON files | P1 |
| `.env.example` | **Update** — add VITE_GEMINI_API_KEY | P1 |

---

## Hour-by-Hour Breakdown

| Hours | Focus | Deliverable |
|-------|-------|-------------|
| 0–2 | Fix `db.js` + sql.js migration | Server starts without errors |
| 2–4 | Fix Procfile, netlify.toml, CORS, .env | Deploy succeeds |
| 4–6 | Verify Free Conversation mode | AI voice chat works |
| 6–8 | Seed lessons, verify Class mode | Lessons load, class flow works |
| 8–10 | Verify Human Tutor mode | Room create/join/audio/board works |
| 10–12 | Fix reconnection, error handling | Graceful disconnect/reconnect |
| 12–14 | Generate lesson content (15 lessons) | All 5 languages have A1.1 content |
| 14–16 | Decompose App.tsx | Clean component structure |
| 16–18 | UI polish, loading states, mobile | Polished UX |
| 18–20 | Security hardening, validation | Production-safe backend |
| 20–22 | DB persistence, env vars, error handling | Robust infrastructure |
| 22–24 | Testing checklist + deploy | Working MVP live |
