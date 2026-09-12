# Kelsey MVP — 24-Hour Action Plan

> **Goal**: Ship a fully functional MVP of the Kelsey language tutoring platform.
> **Timeline**: 24 hours from start.
> **Priority**: Working > Perfect. Cut scope aggressively.

---

## Timeline Status

| Phase | Status | Hours Spent |
|-------|--------|-------------|
| Phase 0: Fix What's Broken | DONE | ~4h |
| Phase 1: Core Functionality | PARTIAL — server runs, Socket.io fixed | ~2h remaining |
| Phase 2: Content & Polish | NOT STARTED | — |
| Phase 3: Production Hardening | PARTIAL — volume, CORS fixed | — |
| Phase 4: Testing & Launch | NOT STARTED | — |

**Time remaining: ~18 hours**

---

## Phase 0: Fix What's Broken (Hours 0–4) — DONE

All items completed:
- [x] Database migrated from better-sqlite3 to sql.js
- [x] All routes updated for sql.js compatibility wrapper
- [x] Procfile fixed: `server.js` → `server/index.js`
- [x] netlify.toml fixed: Node 20 → 22
- [x] CORS origin fixed for production
- [x] .env created with all required vars
- [x] server/package.json removed (consolidated into root)
- [x] Socket.io CORS fixed (allow all origins)
- [x] useWebRTC fallback URL fixed (window.location.origin)
- [x] Railway volume mount path: `/app` → `/data`

---

## Phase 1: Account Creation (Hours 4–8) — NEXT

### Problem
`createAccount()` in `utils/account.ts:27` calls `fetch('/api/users')` which works on the backend. BUT `continueAsGuest()` also calls `createAccount()` which hits the same API. For a new user, if the API fails (e.g., rate limit, network), they're stuck. The flow is:
1. AuthGate shows → user enters name → calls POST /api/users → works if server is up
2. Guest mode → calls POST /api/users with "Guest" → same dependency

**The backend API exists and should work now that the server is running.** The real risk is network failures. We need:
- [ ] Test account creation end-to-end on deployed URL
- [ ] Add retry/fallback to localStorage if API fails
- [ ] Fix `LoginInput` type (defined but unused — no login flow)
- [ ] Add proper error messages in AuthGate for different failure modes

### Tasks
- [ ] **Test account creation on live prod** — create account, verify it persists in DB
- [ ] **Test guest mode** — continue as guest, verify it works
- [ ] **Add localStorage fallback** — if API call fails, create account locally anyway
- [ ] **Fix progress sync** — `saveUserProgress()` and `saveSessionToHistory()` call API but silently fail. Add offline queue or localStorage-only mode.

---

## Phase 1B: Language Practice Features (Hours 8–14)

### Critical Bugs to Fix

#### 1. Lesson ID Parsing Bug (`utils/progress.ts:140, 185`)
`lessonId.split('-')` for `german-A1.1-lesson-01` yields `['german', 'A1.1', 'lesson', '01']`. The destructuring `[, level, lessonNum]` gets `lessonNum = 'lesson'`, so `parseInt('lesson')` = `NaN`. **Progress never advances.**

- [ ] Fix `completeLesson()` — parse lesson ID correctly
- [ ] Fix `isLessonUnlocked()` — same parsing bug

#### 2. Streak System Not Wired In
`utils/streakTracking.tsx` has a complete streak system (hook, display, milestones) but is never imported anywhere. Meanwhile `utils/progress.ts:247` has a broken `calculateStreak()` with a `TODO` comment.

- [ ] Import `useStudyStreak` in App.tsx
- [ ] Call `updateStreak()` in `completeLesson()` or `addStudyTime()`
- [ ] Replace broken `calculateStreak()` in progress.ts

#### 3. Language Support Incomplete
`initializeProgress()` only accepts `'german' | 'french' | 'spanish'` — missing `'chinese' | 'english'`.

- [ ] Add all 5 languages to `initializeProgress()` type union

#### 4. Lesson Seeding
Only 5 German A1.1 lessons exist. No lessons for French, Spanish, Chinese, English.

- [ ] Create `server/seed.js` — reads lesson JSON files, inserts into DB
- [ ] Generate 3 lessons per language (15 total) for A1.1
- [ ] Add `npm run seed` script

---

## Phase 1C: Live Whiteboard Fixes (Hours 14–18)

### Critical Issues

#### 1. `teachingNote` Leaks to Students
`types/board.ts:51` — `teachingNote` is documented as "never transmitted" but `stateSync.ts:77` sends the full card object. Students can see tutor-only notes.

- [ ] Strip `teachingNote` in `StateSyncManager.sendStateUpdate()` before socket emit

#### 2. Missing `<Whiteboard>` Component Reference
`App.tsx:1414` — references `<Whiteboard>` which doesn't exist. This is in the free-mode/class-mode conversation view.

- [ ] Either create `Whiteboard.tsx` or replace with `LiveBoard`

#### 3. Card Animation Targets Wrong Card
`LiveBoard.tsx:189` — assumes `cards[0]` is newest, but cards are appended (oldest first).

- [ ] Fix: use `cards[cards.length - 1]` for "new" animation trigger

#### 4. Phase Navigation Doesn't Sync to Student
`App.tsx:298-368` — `handleNextPhase()` changes phase locally but doesn't emit `CHANGE_PHASE` via stateSync.

- [ ] Add `stateSyncRef.current?.sendStateUpdate({ type: 'CHANGE_PHASE', phase })` in `handleNextPhase()`/`handlePreviousPhase()`

---

## Phase 2: Content & Polish (Hours 18–22)

### 2.1 Generate Lesson Content
- [ ] Generate 3 lessons per language for A1.1 (15 total)
- [ ] Seed into database
- [ ] Verify LessonPicker loads them

### 2.2 UI Polish
- [ ] Add loading states for lesson loading, summary generation
- [ ] Add error boundaries around each mode
- [ ] Fix `utils/streakTracking.tsx` → rename to `.ts`
- [ ] Mobile responsiveness check (375px min)

### 2.3 Session Summary
- [ ] Verify summary works after free conversation
- [ ] Add summary for human-tutor mode (from board cards)
- [ ] Verify PDF export

---

## Phase 3: Production Hardening (Hours 22–24)

### 3.1 Security
- [ ] Input validation on POST/PUT routes
- [ ] Rate limiting on lessons endpoint

### 3.2 Error Handling
- [ ] Global Express error handler
- [ ] React error boundaries
- [ ] Socket.io timeout handling

### 3.3 Persistence
- [ ] Verify Railway volume works (DB persists across restarts)
- [ ] Add DB backup script

### 3.4 Environment
- [ ] Document all env vars in README
- [ ] Add startup validation for required vars

---

## Phase 4: Testing & Launch (Hours 22–24)

### Manual Testing Checklist
- [ ] Account creation → persists → can log back in
- [ ] Guest mode → works → limited features
- [ ] Free mode → AI voice → transcript → summary
- [ ] Class mode → lessons load → 6 phases → progress saved
- [ ] Human tutor → room create → join → audio → board → flags
- [ ] Progress tracking → lessons marked complete → level advances
- [ ] Streak tracking → updates on study → milestones show
- [ ] Mobile → all flows work at 375px
- [ ] Reconnection → disconnect → reconnect → state restored

---

## Priority Order (What to Front First)

| Priority | Task | Why First | Est. Hours |
|----------|------|-----------|------------|
| **1** | Test account creation on live prod | Users can't use anything without accounts | 0.5 |
| **2** | Fix lesson ID parsing in progress.ts | Without this, no progress tracking works | 1 |
| **3** | Seed lessons into database | Structured class mode needs content | 2 |
| **4** | Strip teachingNote from whiteboard sync | Security/data leak | 0.5 |
| **5** | Wire up streak tracking | Users expect streaks to work | 1 |
| **6** | Fix phase sync to student | Human tutor board is incomplete | 1 |
| **7** | Generate lesson content (15 lessons) | All 5 languages need A1.1 content | 3 |
| **8** | Fix card animation targeting | Visual polish | 0.5 |
| **9** | Add loading states & error boundaries | UX polish | 2 |
| **10** | Mobile responsiveness check | Required for MVP | 2 |

---

## File Change Summary

| File | Action | Priority |
|------|--------|----------|
| `utils/progress.ts` | Fix lesson ID parsing (lines 140, 185) | P0 |
| `utils/progress.ts` | Fix `initializeProgress` type union | P0 |
| `utils/streakTracking.tsx` | Wire into App.tsx | P1 |
| `utils/stateSync.ts` | Strip `teachingNote` before emit | P0 |
| `server/seed.js` | **Create** — lesson seeding script | P1 |
| `lessons/` | Generate 15 lesson JSON files | P1 |
| `App.tsx:1414` | Fix or remove `<Whiteboard>` reference | P0 |
| `components/LiveBoard.tsx` | Fix card animation index | P1 |
| `App.tsx:298-368` | Add CHANGE_PHASE sync | P1 |
| `utils/account.ts` | Add localStorage fallback for API failures | P1 |

---

## Phase 5: Digi School Features (Post-MVP)

### 5.1 Student Dashboard
- [ ] **Enrolled lessons list** — show assigned lessons with lock/unlock status
- [ ] **Progress overview** — current level, streak, total study time, average score
- [ ] **Session history** — past sessions with tutor name, date, score, cards reviewed
- [ ] **Upcoming sessions** — scheduled sessions with tutors (requires scheduling system)
- [ ] **Profile settings** — name, email, preferred language, learning goals

### 5.2 Tutor Dashboard
- [ ] **Student roster** — list of assigned students with progress data
- [ ] **Lesson planner** — assign lessons to students, schedule sessions
- [ ] **Session history** — past sessions with student names, outcomes, flags
- [ ] **Student progress view** — drill into individual student scores, weak areas
- [ ] **Availability calendar** — set available hours for booking
- [ ] **Profile settings** — name, bio, subjects, languages taught

### 5.3 Scheduling System
- [ ] **Session booking** — student requests a session, tutor accepts/declines
- [ ] **Calendar view** — both roles see upcoming sessions
- [ ] **Notifications** — email/in-app reminders before sessions
- [ ] **Recurring sessions** — weekly lesson scheduling

### 5.4 Lesson Management
- [ ] **Lesson library** — browse all available lessons by language/level
- [ ] **Lesson assignment** — tutor assigns specific lessons to students
- [ ] **Homework system** — post-session exercises for independent study
- [ ] **Assessment grading** — tutor reviews and scores student work

### 5.5 Communication
- [ ] **Pre-session messaging** — student/tutor chat before session
- [ ] **Post-session feedback** — rate session, leave comments
- [ ] **Announcements** — tutor broadcasts to all students
- [ ] **File sharing** — share documents, audio recordings, notes

### 5.6 Analytics & Reporting
- [ ] **Student analytics** — progress charts, time spent, level progression
- [ ] **Tutor analytics** — session count, student satisfaction, earnings
- [ ] **Export reports** — PDF reports for students/parents
- [ ] **Leaderboard** — optional gamification with rankings

### 5.7 Multi-Student Sessions
- [ ] **Group classes** — tutor teaches multiple students simultaneously
- [ ] **Breakout rooms** — split students into pairs for practice
- [ ] **Student roster panel** — live list of all participants (DONE - Socket.io based)
- [ ] **Mute/kick** — tutor can mute disruptive students

### 5.8 Database Schema Additions
- [ ] `sessions` table — scheduled sessions with tutor_id, student_id, lesson_id, datetime, status
- [ ] `assignments` table — lesson assignments with due dates
- [ ] `messages` table — pre/post session messaging
- [ ] `reviews` table — session ratings and feedback
- [ ] `availability` table — tutor availability slots
