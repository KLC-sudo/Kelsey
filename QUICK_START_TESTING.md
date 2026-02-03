# Quick Start - Local Testing

## 🚀 Start Testing in 3 Steps

### Step 1: Start Signaling Server
```bash
cd server
npm run dev
```
Wait for: `Server running on port 3001`

### Step 2: Start React App (if not running)
```bash
# In a new terminal
npm run dev
```
Wait for: `Local: http://localhost:5173/`

### Step 3: Open Two Browser Windows

**Window 1 (Tutor):**
1. Go to `http://localhost:5173`
2. Click "Human Tutor" → "I'm a Tutor"
3. Copy the room code

**Window 2 (Student - Incognito):**
1. Open incognito: `http://localhost:5173`
2. Click "Human Tutor" → "I'm a Student"
3. Enter the room code from Window 1

---

## ✅ What Should Work

- ✅ Room code generation
- ✅ UI rendering (both tutor and student views)
- ✅ Phase navigation (tutor side)
- ✅ Whiteboard notes (tutor side)
- ✅ Code copy functionality

## ❌ What Won't Work Yet

- ❌ Real connection between tutor/student
- ❌ Audio communication
- ❌ State synchronization
- ❌ Student status showing "Connected"

**Why?** WebRTC integration needs to be wired up (2-3 hours of work).

---

## 🐛 Quick Troubleshooting

**Signaling server not running?**
```bash
cd server
npm install  # If first time
npm run dev
```

**Components not loading?**
- Restart dev server (Ctrl+C, then `npm run dev`)
- Hard refresh browser (Ctrl+Shift+R)

**Room code not appearing?**
- Check browser console (F12) for errors
- Verify both servers running

---

## 📖 Full Guide

See `LOCAL_TESTING_GUIDE.md` for complete testing instructions.
