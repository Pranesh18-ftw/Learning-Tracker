# Learning Tracker App - Quick Start

## 🚀 Easy Startup Commands

### Option 1: Full Development (Backend + Frontend)
```bash
npm run dev
```
This starts both the backend server (port 5000) and frontend (port 3001) simultaneously.

### Option 2: Frontend Only (if backend already running)
```bash
npm start
```
Starts the React app on http://localhost:3001

### Option 3: Backend Only (if frontend already running)
```bash
npm run server
```
Starts the Express server on http://localhost:5000

## 📱 App Access

**Frontend:** http://localhost:3001
**Backend API:** http://localhost:5000

## 🎯 What's Working

✅ **Subtask Completion Toggle**
- Click any subtask → Instant completion (green + line-through)
- Click again → Undo completion (black text)

✅ **Statistics Page** 
- Real-time updates from completed subtasks
- Shows total, completed, completion rate, remaining

✅ **Achievements Page**
- Auto-unlocks based on completed subtasks:
  - 1 completed → "First Task" 
  - 10 completed → "10 Tasks Completed"
  - 25, 50, 100+ → Progressive achievements

✅ **State Management**
- Simplified RoadmapContext with clean toggle logic
- No confirmation modals - direct toggle functionality
- All components use the same roadmap state

## 🛠️ Development Notes

- **Frontend Port:** 3001
- **Backend Port:** 5000  
- **State Management:** React Context (no localStorage complexity)
- **Styling:** TailwindCSS + Lucide icons

## 🐛 Troubleshooting

If you see errors, run:
```bash
npm install
npm run dev
```

The app should start automatically and work without any runtime errors!
