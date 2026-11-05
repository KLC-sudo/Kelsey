# Kelsey — Role Differentiation Plan
## Student · Teacher · School

**Status:** Awaiting approval before implementation
**Prepared:** 2026-11-05

---

## Current State (What Exists vs What's Missing)

| Aspect | Status |
|---|---|
| Role stored at registration (DB + JWT + localStorage) | ✅ Exists |
| `requireAuth` middleware verifies JWT | ✅ Exists |
| Role-based route protection | ❌ Missing — any role reaches any route |
| Role-based UI differences | ❌ Missing — all roles see identical screens |
| `requireRole()` server middleware | ❌ Missing |
| School/admin dashboard | ❌ Missing |
| Server-side permission checks on sensitive routes | ❌ Missing |
| `lessons.js` / `generate.js` authentication | ❌ Missing — open to anyone |
| Tutor session gated to teachers | ❌ Missing — RoleSelector bypasses account role |

---

## ROLE: 🎓 Student

### What they can see
- **ModeSelector**: Free Conversation + Structured Class only (no Human Tutor card — that's for teachers to host)
- **Profile page**: personal progress, streak, SRS stats, lesson history
- **Review History**: their own past sessions
- **Lesson Picker**: browse & take lessons for their language/level

### What they can do
- Register/login, maintain a profile
- Take structured lessons (class mode) — exercises, scoring, phase navigation
- Review SRS flashcards (due queue, quality rating)
- Join a human-tutor session **only via room code** (student-session route)
- View their own progress, streak, study time

### What they CANNOT do
- Create/host a tutor session (no `/tutor-session` access)
- Push cards to a board
- See the tutor deck panel or confidence tally
- Generate lessons
- See other students' data

### Server rules
- `/tutor-session` route: blocked
- `POST /api/lessons/generate`: 403
- `POST /api/lessons`: 403 (can't create lessons)
- Can only read/write their own progress/history/SRS

---

## ROLE: 👨‍🏫 Teacher

### What they can see
- **ModeSelector**: All three cards (Free Conversation, Structured Class, Human Tutor)
- **Tutor Session**: deck panel, board preview, confidence tally, student roster, quick vocab
- **Profile page**: same as student + teaching stats (sessions hosted, students taught)
- **Lesson Picker**: browse + **generate new lessons** for any language/level

### What they can do
- Everything a student can do (take lessons too)
- Host live tutor sessions (create room, push cards, retract, poll, confidence)
- See real-time student confidence responses
- Quick-vocab drop-in during class
- Generate AI lessons via `POST /api/lessons/generate`
- Create/edit lessons
- See which students joined their rooms (roster)

### What they CANNOT do
- See school-wide dashboards (that's school role)
- Manage other teachers' accounts
- Access school billing/settings

### Server rules
- `/tutor-session` route: allowed
- `POST /api/lessons/generate`: allowed (rate-limited 10/hr)
- `POST /api/lessons`: allowed
- Ownership checks still apply on personal data

---

## ROLE: 🏫 School

### What they can see
- **ModeSelector**: All three cards + **School Dashboard** entry
- **School Dashboard** (new page `/dashboard`):
  - Roster of all teachers (register with school code/invite)
  - Roster of all students
  - Per-student progress: lessons completed, avg score, streak, study time
  - Per-teacher activity: sessions hosted, lessons generated
  - School-wide stats: total students, active this week, average scores
- **Profile page**: school info, member counts

### What they can do
- Everything a teacher can do
- View ALL student progress in their school (read-only across users)
- View teacher activity
- Invite/join codes for teachers and students
- Aggregate reporting

### What they CANNOT do
- Edit students' progress directly (read-only dashboard)
- See other schools' data
- Impersonate accounts

### Server rules
- New route: `GET /api/school/:id/members` → list teachers + students
- New route: `GET /api/school/:id/stats` → aggregated progress data
- Only `school` role can access these routes
- Cross-user read access: teachers' students visible via school linkage

---

## Architecture Changes Needed

### 1. Database: school membership
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN school_id TEXT;  -- NULL if standalone

-- Teachers/students join a school via invite code
ALTER TABLE users ADD COLUMN join_code TEXT;  -- school's unique code
```

### 2. Server middleware
```javascript
// server/middleware/role.js
export const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
};
```

### 3. Protected routes
```javascript
// generate.js
router.post('/generate', requireAuth, requireRole('teacher', 'school'), ...)

// New school routes
router.get('/school/:id/members', requireAuth, requireRole('school'), ...)
router.get('/school/:id/stats', requireAuth, requireRole('school'), ...)
```

### 4. Frontend route guard
```tsx
// App.tsx
function RequireRole({ roles, children }) {
    const { state } = useAppContext();
    const account = loadAccount();
    if (!account || !roles.includes(account.role)) return <Navigate to="/" />;
    return children;
}

<Route path="/tutor-session" element={
    <RequireRole roles={['teacher', 'school']}>
        <TutorSessionPage />
    </RequireRole>
} />
<Route path="/dashboard" element={
    <RequireRole roles={['school']}>
        <SchoolDashboard />
    </RequireRole>
} />
```

### 5. ModeSelector role differences
```tsx
// Show/hide cards based on account.role
{account?.role !== 'student' && <HumanTutorCard />}
{account?.role === 'school' && <SchoolDashboardCard />}
```

### 6. School join flow
- School account registers → gets unique `join_code`
- Teachers/students register with optional `join_code` field → links to school
- Or: school admin invites by email

---

## Implementation Phases

### Phase A: Route guards + server role protection (foundation)
- `requireRole` middleware
- Protect `/tutor-session`, `generate`, `lessons` POST
- Frontend `RequireRole` wrapper for routes
- ModeSelector: hide Human Tutor for students, show Dashboard for schools

### Phase B: School membership
- Add `school_id` + `join_code` columns
- Registration: optional school code field
- School account gets auto-generated join code

### Phase C: School Dashboard
- `GET /api/school/:id/members` — list users
- `GET /api/school/:id/stats` — aggregate progress
- `/dashboard` page: roster tables, progress charts, teacher activity

### Phase D: Polish
- Role badge in header (🎓/👨‍🏫/🏫)
- Teacher profile: sessions-hosted stat
- School invite flow (copy code, share link)
- Tests for all role-gated endpoints

---

## What I Need From You

1. **Should students see the Human Tutor card?** (my recommendation: No — teachers host, students join by code)
2. **Should teachers need a school code to register?** (my recommendation: Optional — standalone teachers allowed)
3. **How does a student join a school?** Enter a code at registration? Or invited later?
4. **Should the school dashboard show individual student exercise-level detail?** Or just aggregate stats?
5. **Do you want me to proceed with Phase A first**, or adjust the plan?
